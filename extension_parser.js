/**
 * extension_parser.js
 * Shared static-analysis helpers for reading a Vortex game extension's index.js
 * without executing it. Builds a symbol table of const/let declarations, resolves
 * value expressions (string/template literals, variable refs, path.join), and
 * extracts the registration blocks that describe the extension.
 *
 * Consumed by:
 *   generate_explained.js  -> EXTENSION_EXPLAINED.md
 *   generate_notes.js      -> NOTES_FOR_MOD_AUTHORS.md / .bbcode.txt
 *
 * These functions are pure string parsers: no fs, no path, no side effects.
 */

// ── symbol table ────────────────────────────────────────────────────────────

/**
 * Build a symbol table from all const/let declarations in the source.
 * Returns a Map<string, string> of resolved variable names to values.
 */
function buildSymbolTable(src) {
  const table = new Map();
  const raw = [];

  // Strip block comments to avoid picking up commented-out declarations
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, '');

  // Harvest all const/let declarations
  const lines = stripped.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip line comments
    if (trimmed.startsWith('//')) continue;
    // Remove inline comments for parsing but keep them for later
    const noComment = trimmed.replace(/(?<!:)\/\/.*$/, '').trim();

    // Match: const/let NAME = VALUE;
    const m = noComment.match(/^(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*(.+?)\s*;?\s*$/);
    if (m) {
      raw.push({ name: m[1], rawValue: m[2].trim() });
    }
  }

  // Harvest object literal properties (e.g., UNREALDATA = { modsPath: ... })
  // Use depth-counted scan so nested braces don't truncate the body early.
  const objDeclRe = /(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*\{/g;
  let objM;
  while ((objM = objDeclRe.exec(stripped)) !== null) {
    const objName = objM[1];
    const braceOpenPos = objM.index + objM[0].length - 1;
    const braceClosePos = scanToMatchingClose(stripped, braceOpenPos, '{', '}');
    if (braceClosePos === -1) continue;
    const objBody = stripped.slice(braceOpenPos + 1, braceClosePos);
    // Split on commas that are at depth 0 (not inside parentheses)
    const props = splitAtTopLevelCommas(objBody);
    for (const prop of props) {
      const pm = prop.trim().match(/^(\w+)\s*:\s*(.+?)\s*$/);
      if (pm) {
        raw.push({ name: `${objName}.${pm[1]}`, rawValue: pm[2].trim() });
      }
    }
  }

  // Pass 1: resolve simple literals
  for (const decl of raw) {
    const v = decl.rawValue;
    // String literal: '...' or "..." (each allows the other quote type inside)
    const sqMatch = v.match(/^'([^']*)'$/);
    const dqMatch = v.match(/^"([^"]*)"$/);
    const strMatch = sqMatch || dqMatch;
    if (strMatch) { table.set(decl.name, strMatch[1]); continue; }
    // Numeric literal
    if (/^\d+$/.test(v)) { table.set(decl.name, v); continue; }
    // Unary plus numeric: +VARNAME
    if (/^\+\w+$/.test(v)) { /* skip, derived value */ continue; }
    // Boolean/null
    if (v === 'true' || v === 'false' || v === 'null') { table.set(decl.name, v); continue; }
    // Empty array
    if (v === '[]') { table.set(decl.name, '[]'); continue; }
  }

  // Passes 2-6: resolve references, templates, and path.join
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const decl of raw) {
      if (table.has(decl.name)) continue;
      const v = decl.rawValue;

      // Variable reference: bare identifier or property access (e.g., OBJ.prop)
      if (/^[A-Za-z_$][\w.]*$/.test(v) && table.has(v)) {
        table.set(decl.name, table.get(v));
        changed = true;
        continue;
      }

      // Template literal: `...${VAR}...`
      if (v.startsWith('`') && v.endsWith('`')) {
        const inner = v.slice(1, -1);
        let resolved = inner;
        let allResolved = true;
        resolved = resolved.replace(/\$\{([^}]+)\}/g, (_, varName) => {
          const val = table.get(varName.trim());
          if (val !== undefined) return val;
          allResolved = false;
          return '${' + varName + '}';
        });
        if (allResolved) {
          table.set(decl.name, resolved);
          changed = true;
        }
        continue;
      }

      // path.join(...) expression
      const pjMatch = v.match(/^path\.join\((.+)\)$/);
      if (pjMatch) {
        const args = splitPathJoinArgs(pjMatch[1]);
        let allResolved = true;
        const resolved = args.map(arg => {
          const a = arg.trim();
          // String literal. Backreference the opening quote so the body may contain
          // the other quote character -- path.join("Don's Folder", X) previously
          // failed to match and left the whole path unresolved.
          const sm = a.match(/^(['"])(.*?)\1\s*$/);
          if (sm) return sm[2];
          // Variable reference (including property access)
          if (/^[A-Za-z_$][\w.]*$/.test(a) && table.has(a)) return table.get(a);
          // Template literal
          if (a.startsWith('`') && a.endsWith('`')) {
            const inner = a.slice(1, -1);
            let r = inner;
            r = r.replace(/\$\{([^}]+)\}/g, (_, vn) => {
              const val = table.get(vn.trim());
              if (val !== undefined) return val;
              allResolved = false;
              return '${' + vn + '}';
            });
            return r;
          }
          allResolved = false;
          return a;
        });
        if (allResolved) {
          table.set(decl.name, resolved.join('/'));
          changed = true;
        }
        continue;
      }
    }
    if (!changed) break;
  }

  return table;
}

/**
 * Split path.join arguments, handling nested path.join calls.
 */
function splitPathJoinArgs(argsStr) {
  const args = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

/**
 * Split a string on commas at depth 0 (not inside parentheses, brackets, or string literals).
 */
function splitAtTopLevelCommas(str) {
  const parts = [];
  let depth = 0;
  let inStr = '';  // '', "'", '"', or '`'
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      current += ch;
      if (ch === '\\') {
        i++;
        if (i < str.length) current += str[i];
      } else if (ch === inStr) {
        inStr = '';
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inStr = ch;
      current += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Return the index of the matching close character (openCh/closeCh pair) for
 * the open character at openPos. Handles nesting by depth counting.
 * Returns -1 if the open position is not openCh or the close is never found.
 */
function scanToMatchingClose(str, openPos, openCh, closeCh) {
  if (str[openPos] !== openCh) return -1;
  let depth = 0;
  for (let i = openPos; i < str.length; i++) {
    if (str[i] === openCh) depth++;
    else if (str[i] === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Scan backwards from callIndex to find the enclosing if-block guard.
 * Returns the flag name if an enclosing block is `if (FLAG)` or
 * `if (FLAG === true)`; returns null for anything more complex.
 *
 * Walks outward through every enclosing block rather than stopping at the
 * innermost one, so a call nested in a loop or callback inside the guarded
 * block still resolves to its guard (e.g. a `spec.modTypes.push` inside
 * `DLC_FORGE_TYPES.forEach(...)` inside `if (hasDlcFolders) {`).
 */
function getGuardFlag(stripped, callIndex) {
  let depth = 0;
  let i = callIndex - 1;
  while (i >= 0) {
    const ch = stripped[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      if (depth === 0) {
        const lineStart = stripped.lastIndexOf('\n', i);
        const lineText = stripped.substring(lineStart + 1, i + 1).trim();
        const m = lineText.match(/^if\s*\(\s*([A-Za-z_$]\w*)\s*(?:===\s*true\s*)?\)\s*\{?$/);
        if (m) return m[1];
        //not an if-guard: keep scanning outward into the parent scope
      } else {
        depth--;
      }
    }
    i--;
  }
  return null;
}

/**
 * Resolve a value expression using the symbol table.
 * Handles string literals, template literals, variable refs, and path.join.
 */
function resolveValue(expr, table) {
  if (!expr) return null;
  const e = expr.trim();

  // String literal (single or double quotes only — backticks handled below)
  const sm = e.match(/^(['"])(.+?)\1$/);
  if (sm) return sm[2];

  // Template literal with interpolation
  if (e.startsWith('`') && e.endsWith('`')) {
    const inner = e.slice(1, -1);
    return inner.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      const k = varName.trim();
      return table.has(k) ? table.get(k) : varName;
    });
  }

  // path.join(...)
  const pjMatch = e.match(/^path\.join\((.+)\)$/);
  if (pjMatch) {
    const args = splitPathJoinArgs(pjMatch[1]);
    return args.map(a => resolveValue(a, table) || a).join('/');
  }

  // Variable reference (including property access like OBJ.prop)
  if (/^[A-Za-z_$][\w.]*$/.test(e)) {
    return table.has(e) ? table.get(e) : e;
  }

  // Fallback
  return e;
}

/**
 * Like resolveValue but falls back to a direct regex search in src when the
 * symbol table doesn't have the variable (handles template literals too).
 */
function resolveWithFallback(expr, table, src) {
  if (!expr) return null;
  const e = expr.trim();
  // Handle path.join with fallback-aware arg resolution
  const pjMatch = e.match(/^path\.join\((.+)\)$/);
  if (pjMatch) {
    const args = splitPathJoinArgs(pjMatch[1]);
    return args.map(a => resolveWithFallback(a, table, src) || a).join('/');
  }
  const resolved = resolveValue(expr, table);
  if (resolved !== e || !/^[A-Za-z_$]\w*$/.test(e)) return resolved;
  // Bare identifier not resolved by table — search source directly
  const dqM = src.match(new RegExp(`(?:const|let)\\s+${e}\\s*=\\s*"([^"]*)"`));
  if (dqM) return dqM[1];
  const sqM = src.match(new RegExp(`(?:const|let)\\s+${e}\\s*=\\s*'([^']*)'`));
  if (sqM) return sqM[1];
  const tlM = src.match(new RegExp(`(?:const|let)\\s+${e}\\s*=\\s*\`([^\`]+)\``));
  if (tlM) {
    return tlM[1].replace(/\$\{([^}]+)\}/g, (_, v) => {
      const k = v.trim();
      if (table.has(k)) return table.get(k);
      const dm = src.match(new RegExp(`(?:const|let)\\s+${k}\\s*=\\s*"([^"]*)"`));
      return dm ? dm[1] : k;
    });
  }
  // If it's itself a path.join declaration, recurse into it. Match only up to the
  // opening paren and then depth-scan for the matching close: a flat [^)]+ stops at
  // the first ')', so a nested call such as
  //   path.join('mods', path.basename(GAME_DIR))
  // was captured one paren short of balanced and recursed into a malformed expression.
  const pjStart = src.match(new RegExp(`(?:const|let)\\s+${e}\\s*=\\s*path\\.join\\s*\\(`));
  if (pjStart) {
    const parenOpen = src.indexOf('(', pjStart.index + pjStart[0].length - 1);
    const parenClose = scanToMatchingClose(src, parenOpen, '(', ')');
    if (parenClose !== -1) {
      const expr = src.slice(pjStart.index + pjStart[0].indexOf('path.'), parenClose + 1);
      return resolveWithFallback(expr, table, src);
    }
  }
  return resolved;
}

function isRealValue(v) {
  return v != null && v !== 'null' && v !== 'XXX' && v !== 'N/A';
}

// ── extractors ──────────────────────────────────────────────────────────────

/**
 * Parse the block comment header into structured fields.
 */
function parseHeader(src) {
  const m = src.match(/^\/\*[\s\S]*?\*\//);
  if (!m) return {};
  const block = m[0];
  const result = {};
  const nameMatch = block.match(/Name:\s*(.+)/);
  if (nameMatch) result.name = nameMatch[1].trim();
  const structMatch = block.match(/Structure:\s*(.+)/);
  if (structMatch) result.structure = structMatch[1].trim();
  const authorMatch = block.match(/Author:\s*(.+)/);
  if (authorMatch) result.author = authorMatch[1].trim();
  const versionMatch = block.match(/Version:\s*([\d.]+)/);
  if (versionMatch) result.version = versionMatch[1].trim();
  const dateMatch = block.match(/Date:\s*(.+)/);
  if (dateMatch) result.date = dateMatch[1].trim();
  // Extract note lines (starting with - or *)
  const notes = [];
  for (const line of block.split('\n')) {
    const trimmed = line.replace(/^\s*\*?\s?/, '').trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      notes.push(trimmed);
    }
  }
  if (notes.length > 0) result.notes = notes;
  return result;
}

/**
 * Dynamically discover all boolean feature flags.
 */
function discoverFlags(src) {
  const flags = [];
  // Strip block comments
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, '');
  const specIdx = stripped.search(/^(?:const|let)\s+spec\s*=/m);
  const headerSrc = specIdx !== -1 ? stripped.slice(0, specIdx) : stripped;
  const lines = headerSrc.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    const m = trimmed.match(/^(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*(true|false)\s*;?\s*(?:\/\/(.*))?$/);
    if (m) {
      // Skip well-known non-flag booleans
      const name = m[1];
      const skipNames = ['supported', 'allResolved', 'changed', 'isInstalled',
        'bepinexInstalled', 'melonInstalled', 'isBepinex', 'isBepinexPatcher', 'isMelon', 'isMelonPlugin'];
      if (skipNames.includes(name)) continue;
      flags.push({
        name: name,
        value: m[2],
        comment: m[3] ? m[3].trim() : null
      });
    }
  }
  return flags;
}

/**
 * Extract mod types from the spec object, resolving variable references.
 */
function extractModTypes(src, table) {
  const results = [];
  // Locate the modTypes array and depth-scan to its matching close bracket. A lazy
  // /\[([\s\S]*?)\]\s*[,}]/ ends at the first ']' followed by ',' or '}', so any
  // array-valued property inside an entry (an "exclusions": [...], say) truncated
  // the block and silently dropped every modType after it.
  const modTypesStart = src.match(/"modTypes"\s*:\s*\[/);
  if (!modTypesStart) return results;
  const bracketOpen = modTypesStart.index + modTypesStart[0].length - 1;
  const bracketClose = scanToMatchingClose(src, bracketOpen, '[', ']');
  if (bracketClose === -1) return results;

  // Split into individual object entries
  const block = src.slice(bracketOpen + 1, bracketClose);
  const entries = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === '{') { depth++; if (depth === 1) { current = ''; continue; } }
    if (ch === '}') { depth--; if (depth === 0) { entries.push(current); continue; } }
    if (depth > 0) current += ch;
  }

  for (const entry of entries) {
    const idRaw = extractField(entry, 'id');
    const nameRaw = extractField(entry, 'name');
    const priorityRaw = extractField(entry, 'priority');
    const targetPathRaw = extractFieldRaw(entry, 'targetPath');

    results.push({
      id: resolveWithFallback(idRaw, table, src),
      name: resolveWithFallback(nameRaw, table, src),
      priority: resolveValue(priorityRaw, table),
      targetPath: resolveWithFallback(targetPathRaw, table, src)
    });
  }

  // Also capture spec.modTypes.push({...}) entries (conditional/guarded additions)
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, '');
  const pushRe = /spec\.modTypes\.push\(\s*\{/g;
  let pm;
  while ((pm = pushRe.exec(stripped)) !== null) {
    const lineStart = stripped.lastIndexOf('\n', pm.index);
    const linePrefix = stripped.substring(lineStart + 1, pm.index).trim();
    if (linePrefix.startsWith('//')) continue;
    const guardFlagPush = getGuardFlag(stripped, pm.index);
    if (guardFlagPush && table.get(guardFlagPush) === 'false') continue;
    let depth = 1;
    let i = pm.index + pm[0].length;
    let entry = '';
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if (ch === '{') depth++;
      else if (ch === '}') { if (--depth === 0) break; }
      entry += ch;
      i++;
    }
    const idRaw = extractField(entry, 'id');
    const nameRaw = extractField(entry, 'name');
    const priorityRaw = extractField(entry, 'priority');
    const targetPathRaw = extractFieldRaw(entry, 'targetPath');
    results.push({
      id: resolveWithFallback(idRaw, table, src),
      name: resolveWithFallback(nameRaw, table, src),
      priority: resolveValue(priorityRaw, table),
      targetPath: resolveWithFallback(targetPathRaw, table, src)
    });
  }

  return results;
}

/**
 * Extract explicit context.registerModType() calls (e.g. from applyGame).
 * Skips entries already captured via spec.modTypes.
 */
function extractRegisterModTypes(src, table) {
  const results = [];
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, '');
  const re = /context\.registerModType\(/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const lineStart = stripped.lastIndexOf('\n', m.index);
    const linePrefix = stripped.substring(lineStart + 1, m.index).trim();
    if (linePrefix.startsWith('//')) continue;
    const guardFlagMT = getGuardFlag(stripped, m.index);
    if (guardFlagMT && table.get(guardFlagMT) === 'false') continue;
    // Extract full args by depth tracking
    let depth = 1;
    let i = m.index + m[0].length;
    let argsStr = '';
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if (ch === '(') depth++;
      else if (ch === ')') { if (--depth === 0) break; }
      argsStr += ch;
      i++;
    }
    const args = splitAtTopLevelCommas(argsStr);
    if (args.length < 2) continue;
    const idRaw = args[0].trim();
    // Skip forEach iteration variables like type.id
    if (idRaw.includes('.')) continue;
    const priorityRaw = args[1].trim();
    const priority = /^\d+$/.test(priorityRaw) ? priorityRaw : null;
    const id = resolveWithFallback(idRaw, table, src);
    // Name from last arg if it's an options object { name: ... }
    let name = null;
    const lastArg = args[args.length - 1].trim();
    if (lastArg.startsWith('{')) {
      const nameM = lastArg.match(/(?:"name"|name)\s*:\s*([^,}\n]+)/);
      if (nameM) name = resolveWithFallback(nameM[1].trim(), table, src);
    }
    results.push({ id, name: name || id, priority, targetPath: null });
  }
  return results;
}

/**
 * Extract a field value from a JS object-like string.
 * Handles quoted values containing special characters like }.
 */
/**
 * Regex source matching an object key, quoted with either quote style or bare.
 * Repo convention is double-quoted keys, but a bare `id:` is valid JS and used to
 * return null from every branch below with no diagnostic, silently dropping that
 * modType's fields from both generated documents.
 */
function keyPattern(fieldName) {
  return `(?:["']${fieldName}["']|\\b${fieldName})`;
}

function extractField(objStr, fieldName) {
  const key = keyPattern(fieldName);

  // Try double-quoted value
  const dqRe = new RegExp(`${key}\\s*:\\s*"([^"]*)"`, 's');
  const dqM = objStr.match(dqRe);
  if (dqM) return '"' + dqM[1] + '"';

  // Try single-quoted value (may contain double quotes)
  const sqRe = new RegExp(`${key}\\s*:\\s*'([^']*)'`, 's');
  const sqM = objStr.match(sqRe);
  if (sqM) return "'" + sqM[1] + "'";

  // Try template literal with interpolation
  const templateRe = new RegExp(`${key}\\s*:\\s*(\`[^\`]*\`)`);
  const templateM = objStr.match(templateRe);
  if (templateM) return templateM[1].trim();

  // Try bare identifier or expression
  const bareRe = new RegExp(`${key}\\s*:\\s*([A-Za-z_$]\\w*)`);
  const bareM = objStr.match(bareRe);
  if (bareM) return bareM[1].trim();

  return null;
}

/**
 * Extract raw field value (including path.join expressions).
 */
function extractFieldRaw(objStr, fieldName) {
  // Try path.join first; use depth-tracked paren scan so nested path.join
  // calls (e.g. path.join(a, path.join(b,c))) don't truncate the expression.
  const pjStartRe = new RegExp(`${keyPattern(fieldName)}\\s*:\\s*(path\\.join\\()`);
  const pjM = pjStartRe.exec(objStr);
  if (pjM) {
    const parenOpenPos = pjM.index + pjM[0].length - 1;
    const parenClosePos = scanToMatchingClose(objStr, parenOpenPos, '(', ')');
    if (parenClosePos !== -1) {
      return 'path.join(' + objStr.slice(parenOpenPos + 1, parenClosePos) + ')';
    }
  }
  // Fall back to regular extraction
  return extractField(objStr, fieldName);
}

/**
 * Extract installer registrations with resolved IDs.
 *
 * Returns { id, priority, testFn, guardFlag } per registration. `testFn` is the
 * third argument to registerInstaller — the stable cross-extension identity of an
 * installer (e.g. `testLogic` means the same thing in every game that registers it),
 * so it is the join key for per-installer documentation. `guardFlag` is the boolean
 * feature flag wrapping the call, if any; guarded-off installers are already dropped.
 *
 * `id` and `priority` predate the extra fields and are unchanged.
 */
function extractInstallers(src, table) {
  const results = [];
  // Strip block comments but preserve line structure
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, '');
  const re = /context\.registerInstaller\(\s*([^,]+),\s*(\d+)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    // Check this isn't in a comment
    const lineStart = stripped.lastIndexOf('\n', m.index);
    const linePrefix = stripped.substring(lineStart + 1, m.index).trim();
    if (linePrefix.startsWith('//')) continue;
    const guardFlagInst = getGuardFlag(stripped, m.index);
    if (guardFlagInst && table.get(guardFlagInst) === 'false') continue;

    const rawId = m[1].trim();
    const priority = m[2];
    const resolvedId = resolveValue(rawId, table);

    // Third argument is the test function. Read the remaining args by
    // depth-tracked scan so arrow-function install args don't confuse the split.
    let testFn = null;
    const argsOpen = stripped.indexOf('(', m.index);
    const argsClose = scanToMatchingClose(stripped, argsOpen, '(', ')');
    if (argsClose !== -1) {
      const args = splitAtTopLevelCommas(stripped.slice(argsOpen + 1, argsClose));
      if (args.length >= 3) {
        const third = args[2].trim();
        if (/^[A-Za-z_$]\w*$/.test(third)) {
          testFn = third;
        } else {
          // Some games wrap the test in an arrow to inject the api, e.g.
          // `(files, gameId) => testSave(context.api, files, gameId)`.
          // The wrapped callee is the real identity.
          const arrowM = third.match(/=>\s*(?:\{\s*return\s+)?([A-Za-z_$]\w*)\s*\(/);
          if (arrowM) testFn = arrowM[1];
        }
      }
    }

    results.push({ id: resolvedId, priority, testFn, guardFlag: guardFlagInst || null });
  }
  return results;
}

module.exports = {
  buildSymbolTable,
  splitPathJoinArgs,
  splitAtTopLevelCommas,
  scanToMatchingClose,
  getGuardFlag,
  resolveValue,
  resolveWithFallback,
  isRealValue,
  parseHeader,
  discoverFlags,
  extractModTypes,
  extractRegisterModTypes,
  extractField,
  extractFieldRaw,
  extractInstallers,
};
