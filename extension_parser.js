/**
 * extension_parser.js
 * Shared static-analysis helpers for reading a Vortex game extension's index.js
 * without executing it. Builds a symbol table of const/let declarations, resolves
 * value expressions (string/template literals, variable refs, path.join), and
 * extracts the registration blocks that describe the extension.
 *
 * Consumed by:
 *   generate_explained.js  -> EXTENSION_EXPLAINED.md
 *   generate_notes.js      -> NOTES_FOR_MOD_AUTHORS.md / .bbcode
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
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, "");

  // Which declarations sit at module level. The harvests below are line-based, so they also
  // pick up locals declared inside functions; a local that shares a module constant's name
  // (an installer's own `let MOD_ID = "";`) must not displace the module-level value.
  const topLevelDeclared = new Set();
  const topLevelLineStarts = new Set();
  const declPosRe = /^[ \t]*(?:const|let)\s+([A-Za-z_$]\w*)\s*=/gm;
  let declM;
  while ((declM = declPosRe.exec(stripped)) !== null) {
    if (findInnermostBlockHead(stripped, declM.index) === null) {
      topLevelDeclared.add(declM[1]);
      topLevelLineStarts.add(declM.index);
    }
  }

  // Harvest all const/let declarations
  const lines = stripped.split("\n");
  let lineStart = 0;
  for (const line of lines) {
    const top = topLevelLineStarts.has(lineStart);
    lineStart += line.length + 1;
    const trimmed = line.trim();
    // Skip line comments
    if (trimmed.startsWith("//")) continue;
    // Remove inline comments for parsing but keep them for later
    const noComment = trimmed.replace(/(?<!:)\/\/.*$/, "").trim();

    // Match: const/let NAME = VALUE;
    const m = noComment.match(/^(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*(.+?)\s*;?\s*$/);
    if (m) {
      raw.push({ name: m[1], rawValue: m[2].trim(), top });
    }
  }

  // Harvest object literal properties (e.g., UNREALDATA = { modsPath: ... })
  // Use depth-counted scan so nested braces don't truncate the body early.
  const objDeclRe = /(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*\{/g;
  let objM;
  while ((objM = objDeclRe.exec(stripped)) !== null) {
    const objName = objM[1];
    const top = topLevelLineStarts.has(stripped.lastIndexOf("\n", objM.index) + 1);
    const braceOpenPos = objM.index + objM[0].length - 1;
    const braceClosePos = scanToMatchingClose(stripped, braceOpenPos, "{", "}");
    if (braceClosePos === -1) continue;
    const objBody = stripped.slice(braceOpenPos + 1, braceClosePos);
    // Split on commas that are at depth 0 (not inside parentheses)
    const props = splitAtTopLevelCommas(objBody);
    for (const prop of props) {
      const pm = prop.trim().match(/^(\w+)\s*:\s*(.+?)\s*$/);
      if (pm) {
        raw.push({ name: `${objName}.${pm[1]}`, rawValue: pm[2].trim(), top, owner: objName });
      }
    }
  }

  // A name declared at module level wins over any same-named local. Names that exist only as
  // locals are kept: several extensions resolve helper constants declared inside applyGame().
  const topNames = new Set(raw.filter((d) => d.top).map((d) => d.name));
  for (let k = raw.length - 1; k >= 0; k--) {
    const d = raw[k];
    if (!d.top && (topNames.has(d.name) || (d.owner && topNames.has(d.owner)))) raw.splice(k, 1);
  }

  // Guarded reassignments (see activeReassignments) replace the declared value. Only names
  // declared at top level are eligible (topLevelDeclared, built above): without this filter a
  // local assignment could overwrite a module constant that shares its name.
  const declaredNames = new Set(raw.map((d) => d.name).filter((n) => topLevelDeclared.has(n)));
  for (const [name, value] of activeReassignments(src)) {
    if (!declaredNames.has(name)) continue;
    for (let k = raw.length - 1; k >= 0; k--) {
      if (raw[k].name === name) {
        raw[k].rawValue = value;
        break;
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
    if (strMatch) {
      table.set(decl.name, strMatch[1]);
      continue;
    }
    // Numeric literal
    if (/^\d+$/.test(v)) {
      table.set(decl.name, v);
      continue;
    }
    // Unary plus numeric: +VARNAME
    if (/^\+\w+$/.test(v)) {
      /* skip, derived value */ continue;
    }
    // Boolean/null
    if (v === "true" || v === "false" || v === "null") {
      table.set(decl.name, v);
      continue;
    }
    // Empty array
    if (v === "[]") {
      table.set(decl.name, "[]");
      continue;
    }
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
      if (v.startsWith("`") && v.endsWith("`")) {
        const inner = v.slice(1, -1);
        let resolved = inner;
        let allResolved = true;
        resolved = resolved.replace(/\$\{([^}]+)\}/g, (_, varName) => {
          const val = table.get(varName.trim());
          if (val !== undefined) return val;
          allResolved = false;
          return "${" + varName + "}";
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
        const resolved = args.map((arg) => {
          const a = arg.trim();
          // String literal. Backreference the opening quote so the body may contain
          // the other quote character -- path.join("Don's Folder", X) previously
          // failed to match and left the whole path unresolved.
          const sm = a.match(/^(['"])(.*?)\1\s*$/);
          if (sm) return sm[2];
          // Variable reference (including property access)
          if (/^[A-Za-z_$][\w.]*$/.test(a) && table.has(a)) return table.get(a);
          // Template literal
          if (a.startsWith("`") && a.endsWith("`")) {
            const inner = a.slice(1, -1);
            let r = inner;
            r = r.replace(/\$\{([^}]+)\}/g, (_, vn) => {
              const val = table.get(vn.trim());
              if (val !== undefined) return val;
              allResolved = false;
              return "${" + vn + "}";
            });
            return r;
          }
          allResolved = false;
          return a;
        });
        if (allResolved) {
          table.set(decl.name, resolved.join("/"));
          changed = true;
        }
        continue;
      }
    }
    if (!changed) break;
  }

  return table;
}

/** The head of the getExecutable function, whose body sets per-install paths. */
const GET_EXECUTABLE_HEAD_RE = /^(?:async\s+)?function\s+getExecutable\s*\([^)]*\)\s*\{$/;
/** Path constants only: a store flag such as GAME_VERSION is set there too but is runtime state. */
const PATH_NAME_RE = /_(?:PATH|TARGET|FOLDER)$/;
/** A write value that is a path in itself: `path.join(...)`, a string literal or a constant. */
const DEFAULT_WRITE_VALUE_RE = /^(?:path\.join\(.*\)|(["'])[^"']*\1|[A-Z_][A-Z0-9_]*)$/;

/**
 * Guarded reassignments of module-level names, e.g. `let X = 'a'; if (FLAG) { X = 'b'; }`, as a
 * Map of name -> raw value expression, in source order so the last live write wins. The
 * declaration on its own is the wrong answer whenever the branch that overrides it is live,
 * which is what made both Godot extensions report the wrong loader file, and every mono Unity
 * game report the IL2CPP assembly file.
 *
 * A reassignment is taken only when its branch is provably live: either there is no enclosing
 * block at all, or the block is an `if (FLAG)` / `if (!FLAG)` on a discovered boolean flag whose
 * value selects it, or it is one arm of a top-level `if / else if / else` chain whose every
 * condition evaluateCondition can decide. One function body counts too: a name declared `""` and
 * given its path straight in getExecutable's body, which is the value for the default install.
 * Every other shape - any other function body, a loop, a condition on a property or a call - is
 * left alone. That conservative default matters:
 * taking a dead branch would silently rewrite a value that is correct today.
 *
 * Exported because arrays never enter the symbol table, so callers that read an array
 * declaration straight from source need these overrides too.
 */
function activeReassignments(src) {
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, "");
  const flagValues = new Map(discoverFlags(src).map((f) => [f.name, f.value === "true"]));

  // Module-level names, and the string literal each was declared with.
  const topLevelDeclared = new Set();
  const declaredLiterals = new Map();
  const declRe =
    /^[ \t]*(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*(?:(["'])([^"'\n]*)\2\s*;?[ \t]*(?:\/\/.*)?$)?/gm;
  let dm;
  while ((dm = declRe.exec(stripped)) !== null) {
    if (findInnermostBlockHead(stripped, dm.index) !== null) continue;
    topLevelDeclared.add(dm[1]);
    if (dm[2] !== undefined) declaredLiterals.set(dm[1], dm[3]);
  }
  // Properties of top-level object literals, so a condition can test `UNREALDATA.loadOrder`:
  // "OBJ.prop" -> the raw value expression it was written with.
  const aliases = new Map();
  const objRe = /^(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*\{/gm;
  let om;
  while ((om = objRe.exec(stripped)) !== null) {
    const open = om.index + om[0].length - 1;
    const close = scanToMatchingClose(stripped, open, "{", "}");
    if (close === -1) continue;
    const body = stripped.slice(open + 1, close).replace(/(?<![:"'])\/\/.*$/gm, "");
    for (const prop of splitAtTopLevelCommas(body)) {
      const pm = prop.trim().match(/^(\w+)\s*:\s*(.+?)\s*$/s);
      if (pm) aliases.set(`${om[1]}.${pm[1]}`, pm[2]);
    }
  }

  const reassignRe = /^[ \t]*([A-Za-z_$]\w*)\s*=\s*([^=][^;\n]*?)\s*;[ \t]*(?:\/\/.*)?$/gm;
  const writes = [];
  let reM;
  while ((reM = reassignRe.exec(stripped)) !== null) {
    if (topLevelDeclared.has(reM[1]))
      writes.push({ index: reM.index, name: reM[1], value: reM[2].trim() });
  }
  // The brace-less one-line form, `if (!PAKMOD_LOADORDER) PAKMOD_PATH = ...; //comment`.
  const inlineRe =
    /^[ \t]*if\s*\((.*)\)\s*([A-Za-z_$]\w*)\s*=\s*([^=][^;\n]*?)\s*;[ \t]*(?:\/\/.*)?$/gm;
  while ((reM = inlineRe.exec(stripped)) !== null) {
    if (topLevelDeclared.has(reM[2]))
      writes.push({ index: reM.index, name: reM[2], value: reM[3].trim(), cond: reM[1] });
  }
  writes.sort((a, b) => a.index - b.index);

  // Whether a write runs: true, false, or null when its branch cannot be decided.
  const writeState = (w, literals) => {
    const open = findInnermostBlockOpen(stripped, w.index);
    if (w.cond !== undefined) {
      // Only a top-level one-line guard is evaluated; inside a block it is runtime code.
      return open === -1 ? evaluateCondition(w.cond, flagValues, literals, aliases) : null;
    }
    if (open === -1) return true; // top level: last write wins
    const lineStart = stripped.lastIndexOf("\n", open);
    const head = stripped.substring(lineStart + 1, open + 1).trim();
    // A path declared empty and only filled in by getExecutable: the write straight in its
    // body (after the store-specific `if` returns) is the default install's value.
    if (
      PATH_NAME_RE.test(w.name) &&
      declaredLiterals.get(w.name) === "" &&
      DEFAULT_WRITE_VALUE_RE.test(w.value) &&
      GET_EXECUTABLE_HEAD_RE.test(head)
    ) {
      return true;
    }
    const pos = head.match(IF_FLAG_RE);
    const neg = head.match(IF_NOT_FLAG_RE);
    if (pos && flagValues.has(pos[1])) return flagValues.get(pos[1]);
    if (neg && flagValues.has(neg[1])) return !flagValues.get(neg[1]);
    const arm = chainArmState(stripped, open, flagValues, literals, aliases);
    if (!arm || findInnermostBlockOpen(stripped, arm.first) !== -1) return null;
    return arm.active;
  };

  // A condition may test a name that is itself reassigned (`BEPINEX_BUILD = "il2cpp"` inside a
  // dead `if (isXna)` branch). Such a name counts as a known literal only once every write to it
  // is decided; its value is then the last live literal write, or the declaration. Repeat until
  // no more names become known.
  const written = new Set(writes.map((w) => w.name));
  let literals = new Map([...declaredLiterals].filter(([n]) => !written.has(n)));
  for (let pass = 0; pass < 5; pass++) {
    const next = new Map([...declaredLiterals].filter(([n]) => !written.has(n)));
    for (const name of written) {
      const own = writes.filter((w) => w.name === name);
      const states = own.map((w) => writeState(w, literals));
      if (states.includes(null)) continue;
      const live = own.filter((_, i) => states[i]);
      if (!live.length) {
        if (declaredLiterals.has(name)) next.set(name, declaredLiterals.get(name));
        continue;
      }
      const lm = live[live.length - 1].value.match(/^(["'])([^"']*)\1$/);
      if (lm) next.set(name, lm[2]);
    }
    const grew = next.size > literals.size;
    literals = next;
    if (!grew) break;
  }

  const out = new Map();
  for (const w of writes) {
    if (writeState(w, literals) !== true) continue;
    out.delete(w.name); // re-insert so iteration order follows the last live write
    out.set(w.name, w.value);
  }
  return out;
}

/**
 * Value of an `if` condition made of `FLAG`, `!FLAG`, `FLAG === true|false` and
 * `NAME === "literal"` / `NAME !== "literal"` terms joined by `&&`, or null when any term is
 * some other shape or names a value that is not known. A name may be an `OBJ.prop` listed in
 * `aliases` (object literal property -> raw value), which stands for the flag, literal or
 * constant name the property was written with.
 */
function evaluateCondition(cond, flagValues, literals, aliases = new Map()) {
  const flagOf = (name) => {
    const raw = aliases.has(name) ? aliases.get(name) : name;
    if (raw === "true" || raw === "false") return raw === "true";
    return flagValues.has(raw) ? flagValues.get(raw) : null;
  };
  const literalOf = (name) => {
    const raw = aliases.has(name) ? aliases.get(name) : name;
    const q = raw.match(/^(["'])([^"']*)\1$/);
    if (q) return q[2];
    return literals.has(raw) ? literals.get(raw) : null;
  };
  const NAME = String.raw`[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?`;
  let result = true;
  for (const term of cond.split("&&").map((t) => t.trim())) {
    let m;
    let value;
    if ((m = term.match(new RegExp(`^(!?)\\s*(${NAME})$`)))) {
      const f = flagOf(m[2]);
      if (f === null) return null;
      value = f !== (m[1] === "!");
    } else if ((m = term.match(new RegExp(`^(${NAME})\\s*(===|!==)\\s*(true|false)$`)))) {
      const f = flagOf(m[1]);
      if (f === null) return null;
      value = (f === (m[3] === "true")) === (m[2] === "===");
    } else if ((m = term.match(new RegExp(`^(${NAME})\\s*(===|!==)\\s*(["'])([^"']*)\\3$`)))) {
      const l = literalOf(m[1]);
      if (l === null) return null;
      value = (l === m[4]) === (m[2] === "===");
    } else {
      return null;
    }
    if (!value) result = false;
  }
  return result;
}

/**
 * State of the `if` / `else if` / `else` arm whose block opens at `open`: { active, taken, first }
 * where `active` says this arm runs, `taken` says this arm or an earlier one in the chain runs,
 * and `first` is the `{` of the chain's opening `if`. Null when the block is not an arm of such a
 * chain or any condition up to it cannot be evaluated.
 */
function chainArmState(stripped, open, flagValues, literals, aliases) {
  const lineStart = stripped.lastIndexOf("\n", open);
  const head = stripped.substring(lineStart + 1, open + 1).trim();
  const ifM = head.match(/^(\}\s*else\s+)?if\s*\((.*)\)\s*\{$/);
  const isElse = /^\}\s*else\s*\{$/.test(head);
  if (!ifM && !isElse) return null;
  const own = ifM ? evaluateCondition(ifM[2], flagValues, literals, aliases) : true;
  if (own === null) return null;
  if (ifM && !ifM[1]) return { active: own, taken: own, first: open };
  // A chained arm's line starts with the `}` that closes the previous arm.
  const prevOpen = scanToMatchingOpen(stripped, stripped.indexOf("}", lineStart + 1));
  if (prevOpen === -1) return null;
  const prev = chainArmState(stripped, prevOpen, flagValues, literals, aliases);
  if (!prev) return null;
  return { active: !prev.taken && own, taken: prev.taken || own, first: prev.first };
}

/**
 * Split path.join arguments, handling nested path.join calls.
 */
function splitPathJoinArgs(argsStr) {
  const args = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
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
  let inStr = ""; // '', "'", '"', or '`'
  let current = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      current += ch;
      if (ch === "\\") {
        i++;
        if (i < str.length) current += str[i];
      } else if (ch === inStr) {
        inStr = "";
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inStr = ch;
      current += ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
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
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) {
        const lineStart = stripped.lastIndexOf("\n", i);
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
 * Text of the line that opens the innermost block enclosing `idx`, or null when `idx` sits at
 * top level. Unlike getGuardFlag this does NOT keep scanning outward past a block it does not
 * recognise - the caller needs to tell "no enclosing block" apart from "enclosing block whose
 * condition I cannot evaluate", and treating the second as the first would let a dead branch
 * overwrite a live declaration.
 */
function findInnermostBlockHead(stripped, idx) {
  const open = findInnermostBlockOpen(stripped, idx);
  if (open === -1) return null;
  const lineStart = stripped.lastIndexOf("\n", open);
  return stripped.substring(lineStart + 1, open + 1).trim();
}

/**
 * Index of the `{` that opens the innermost block enclosing `idx`, or -1 at top level.
 */
function findInnermostBlockOpen(stripped, idx) {
  let depth = 0;
  for (let i = idx - 1; i >= 0; i--) {
    const ch = stripped[i];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

const IF_FLAG_RE = /^if\s*\(\s*([A-Za-z_$]\w*)\s*(?:===\s*true\s*)?\)\s*\{$/;
const IF_NOT_FLAG_RE = /^if\s*\(\s*!\s*([A-Za-z_$]\w*)\s*\)\s*\{$/;

/**
 * Guard condition of the block opened by the `{` at `openIdx`, as { flag, negated }, or null
 * when the block is not an `if (FLAG)`, `if (!FLAG)` or the `} else {` arm of one of those.
 */
function guardFromBlockOpen(stripped, openIdx) {
  const lineStart = stripped.lastIndexOf("\n", openIdx);
  const head = stripped.substring(lineStart + 1, openIdx + 1).trim();

  const direct = head.match(IF_FLAG_RE);
  if (direct) return { flag: direct[1], negated: false };

  const negated = head.match(IF_NOT_FLAG_RE);
  if (negated) return { flag: negated[1], negated: true };

  // `} else {` - the line starts with the `}` that closes the if-block; walk back over that
  // block and read its own head.
  if (/^\}\s*else\s*\{$/.test(head)) {
    const ifCloseIdx = stripped.indexOf("}", lineStart + 1);
    const ifOpenIdx = scanToMatchingOpen(stripped, ifCloseIdx);
    if (ifOpenIdx === -1) return null;
    const ifLineStart = stripped.lastIndexOf("\n", ifOpenIdx);
    const ifHead = stripped.substring(ifLineStart + 1, ifOpenIdx + 1).trim();
    const ifM = ifHead.match(IF_FLAG_RE);
    if (ifM) return { flag: ifM[1], negated: true };
    const ifNeg = ifHead.match(IF_NOT_FLAG_RE);
    if (ifNeg) return { flag: ifNeg[1], negated: false };
  }
  return null;
}

/**
 * Guard condition governing the statement at `idx`, as { flag, negated }, or null when there
 * is none this function can evaluate.
 *
 * getGuardFlag only recognises the `if (FLAG) {` arm. The matching `} else {` arm reads as
 * unguarded, so a registration inside it is emitted even when the `if` arm was emitted too -
 * which is how an if/else installer pair came to be listed twice. Resolving the else arm to
 * the same flag, negated, makes exactly one arm of the pair survive.
 *
 * `else if` is deliberately not handled: the chain would need every preceding condition
 * evaluated to be correct, so it returns null and the caller keeps the registration.
 */
function getGuardCondition(stripped, idx) {
  const open = findInnermostBlockOpen(stripped, idx);
  return open === -1 ? null : guardFromBlockOpen(stripped, open);
}

const IF_INLINE_RE = /^\s*if\s*\(\s*(!?)\s*([A-Za-z_$]\w*)\s*\)\s*$/;

/**
 * Guard written on the same line as the statement at `idx` and without braces, as in
 * `if (FLAG) context.registerInstaller(...)`, as { flag, negated }, or null. The block-based
 * lookups above only see a guard that opens a `{ }` block, so a one-line `if` reads as
 * unguarded and its registration is documented even while the flag is off.
 */
function inlineGuardAt(stripped, idx) {
  const lineStart = stripped.lastIndexOf("\n", idx - 1) + 1;
  const m = stripped.substring(lineStart, idx).match(IF_INLINE_RE);
  return m ? { flag: m[2], negated: m[1] === "!" } : null;
}

/**
 * True unless the statement is guarded by a one-line `if (FLAG)` (see inlineGuardAt) or some
 * block enclosing `idx` is a recognised guard (see getGuardCondition) that the symbol table
 * evaluates to off. Walks outward through every enclosing block, so a registration inside a
 * loop or callback still honours the `if` around that loop - and, unlike getGuardFlag, it
 * understands `if (!FLAG)` and `} else {` arms.
 */
function isGuardChainActive(stripped, idx, table) {
  if (!isGuardActive(inlineGuardAt(stripped, idx), table)) return false;
  let pos = idx;
  for (;;) {
    const open = findInnermostBlockOpen(stripped, pos);
    if (open === -1) return true;
    if (!isGuardActive(guardFromBlockOpen(stripped, open), table)) return false;
    pos = open;
  }
}

/**
 * Index of the `{` matching the `}` at `closeIdx`, or -1.
 */
function scanToMatchingOpen(stripped, closeIdx) {
  let depth = 0;
  for (let i = closeIdx; i >= 0; i--) {
    const ch = stripped[i];
    if (ch === "}") depth++;
    else if (ch === "{") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * True when a guard condition is satisfied by the symbol table. Unknown flags count as live,
 * matching the previous behaviour of only skipping on an explicit `false`.
 */
function isGuardActive(guard, table) {
  if (!guard) return true;
  const val = table.get(guard.flag);
  if (val !== "true" && val !== "false") return true;
  return guard.negated ? val === "false" : val === "true";
}

/**
 * Replace Vortex path helper references with readable environment variables, so a generated
 * document shows `%USERPROFILE%\Games\...` rather than `util.getVortexPath("home")\Games\...`.
 */
function cleanEnvPath(p) {
  return p
    .replace(/util\.getVortexPath\(["']home["']\)/g, "%USERPROFILE%")
    .replace(/util\.getVortexPath\(["']documents["']\)/g, "%DOCUMENTS%")
    .replace(/util\.getVortexPath\(["']localAppData["']\)/g, "%LOCALAPPDATA%")
    .replace(/util\.getVortexPath\(["']appData["']\)/g, "%APPDATA%");
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
  if (e.startsWith("`") && e.endsWith("`")) {
    const inner = e.slice(1, -1);
    return inner.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      const k = varName.trim();
      return table.has(k) ? table.get(k) : varName;
    });
  }

  // path.join(...) -- dotAll so a call written across multiple lines (one arg per
  // line, common repo style) still matches instead of falling through to the raw
  // unparsed source with its embedded newlines.
  const pjMatch = e.match(/^path\.join\((.+)\)$/s);
  if (pjMatch) {
    const args = splitPathJoinArgs(pjMatch[1]);
    return args.map((a) => resolveValue(a, table) || a).join("/");
  }

  // Variable reference (including property access like OBJ.prop)
  if (/^[A-Za-z_$][\w.]*$/.test(e)) {
    return table.has(e) ? table.get(e) : e;
  }

  // Fallback: the expression stays as written, apart from Vortex path helpers, which every
  // generated document renders as environment variables.
  return cleanEnvPath(e);
}

/**
 * Like resolveValue but falls back to a direct regex search in src when the
 * symbol table doesn't have the variable (handles template literals too).
 */
function resolveWithFallback(expr, table, src, seen = new Set()) {
  if (!expr) return null;
  const e = expr.trim();
  // Handle path.join with fallback-aware arg resolution (dotAll -- see resolveValue)
  const pjMatch = e.match(/^path\.join\((.+)\)$/s);
  if (pjMatch) {
    const args = splitPathJoinArgs(pjMatch[1]);
    return args.map((a) => resolveWithFallback(a, table, src) || a).join("/");
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
    const parenOpen = src.indexOf("(", pjStart.index + pjStart[0].length - 1);
    const parenClose = scanToMatchingClose(src, parenOpen, "(", ")");
    if (parenClose !== -1) {
      const expr = src.slice(pjStart.index + pjStart[0].indexOf("path."), parenClose + 1);
      return resolveWithFallback(expr, table, src);
    }
  }
  // A bare alias of another constant the table could not resolve either
  // (`const CANVAS_PATH = DOCS_PATH;`, DOCS_PATH being a path.join): follow it, once per
  // name so an alias cycle cannot loop. `const` only: a `let` alias is a default that the
  // store branches reassign at runtime (`let CONFIG_PATH = CONFIG_PATH_DEFAULT;` becomes the
  // Xbox folder on Xbox), so its first value is not the folder every install uses.
  const alias = src.match(
    new RegExp(`const\\s+${e}\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*;?\\s*(?://[^\\n]*)?$`, "m"),
  );
  if (alias && !seen.has(e)) {
    const followed = resolveWithFallback(alias[1], table, src, new Set([...seen, e]));
    if (followed != null && followed !== alias[1]) return followed;
  }
  return resolved;
}

/**
 * True when a resolved constant carries a real value rather than one of the
 * "not applicable here" placeholders. An empty string counts as a placeholder:
 * extensions use `const XBOXAPP_ID = "";` for a store the game is not sold on,
 * often with a comment saying so, and treating it as real makes generated docs
 * claim support that does not exist.
 */
function isRealValue(v) {
  if (v == null) return false;
  const s = String(v).trim();
  return s !== "" && s !== "null" && s !== "XXX" && s !== "N/A";
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
  for (const line of block.split("\n")) {
    const trimmed = line.replace(/^\s*\*?\s?/, "").trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
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
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, "");
  const specIdx = stripped.search(/^(?:const|let)\s+spec\s*=/m);
  const headerSrc = specIdx !== -1 ? stripped.slice(0, specIdx) : stripped;
  const lines = headerSrc.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) continue;
    const m = trimmed.match(
      /^(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*(true|false)\s*;?\s*(?:\/\/(.*))?$/,
    );
    if (m) {
      // Skip well-known non-flag booleans
      const name = m[1];
      const skipNames = [
        "supported",
        "allResolved",
        "changed",
        "isInstalled",
        "bepinexInstalled",
        "melonInstalled",
        "isBepinex",
        "isBepinexPatcher",
        "isMelon",
        "isMelonPlugin",
      ];
      if (skipNames.includes(name)) continue;
      flags.push({
        name: name,
        value: m[2],
        comment: m[3] ? m[3].trim() : null,
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
  // Repo convention writes this key bare (modTypes: [...]) far more often than quoted --
  // a quote-only match here left every spec.modTypes array undetected and silently
  // dropped its entries (e.g. Content/Root folder installers) from both generated docs.
  const modTypesStart = src.match(new RegExp(keyPattern("modTypes") + "\\s*:\\s*\\["));
  if (!modTypesStart) return results;
  const bracketOpen = modTypesStart.index + modTypesStart[0].length - 1;
  const bracketClose = scanToMatchingClose(src, bracketOpen, "[", "]");
  if (bracketClose === -1) return results;

  const addEntries = (block) => {
    for (const entry of splitObjectEntries(block)) {
      const idRaw = extractField(entry, "id");
      const nameRaw = extractField(entry, "name");
      const priorityRaw = extractField(entry, "priority");
      const targetPathRaw = extractFieldRaw(entry, "targetPath");
      results.push({
        id: resolveWithFallback(idRaw, table, src),
        name: resolveWithFallback(nameRaw, table, src),
        priority: resolveValue(priorityRaw, table),
        targetPath: resolveWithFallback(targetPathRaw, table, src),
      });
    }
  };

  addEntries(src.slice(bracketOpen + 1, bracketClose));

  // Also capture spec.modTypes.push(...) entries (conditional/guarded additions). One call can
  // push several objects - spec.modTypes.push({ ... }, { ... }) - so every top-level object in
  // the argument list counts, not just the first.
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, "");
  const pushRe = /spec\.modTypes\.push\(\s*\{/g;
  let pm;
  while ((pm = pushRe.exec(stripped)) !== null) {
    const lineStart = stripped.lastIndexOf("\n", pm.index);
    const linePrefix = stripped.substring(lineStart + 1, pm.index).trim();
    if (linePrefix.startsWith("//")) continue;
    if (!isGuardChainActive(stripped, pm.index, table)) continue;
    const parenOpen = stripped.indexOf("(", pm.index);
    const parenClose = scanToMatchingClose(stripped, parenOpen, "(", ")");
    if (parenClose === -1) continue;
    addEntries(stripped.slice(parenOpen + 1, parenClose));
  }

  return results;
}

/** The bodies of the top-level `{...}` objects in an array or argument list, braces excluded. */
function splitObjectEntries(block) {
  const entries = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === "{") {
      depth++;
      if (depth === 1) {
        current = "";
        continue;
      }
    }
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        entries.push(current);
        continue;
      }
    }
    if (depth > 0) current += ch;
  }
  return entries;
}

/**
 * Tidy a resolved deploy folder, or return null when part of it did not resolve.
 * "." segments are dropped ({gamePath}/. is the game folder). A segment that is still
 * the name of a constant declared in the file means the value could not be followed
 * (a path built at runtime), so the whole folder is treated as unknown.
 */
function cleanResolvedPath(resolved, src) {
  if (!resolved) return null;
  const segments = String(resolved)
    .split("/")
    .filter((seg) => seg !== ".");
  const unresolved = segments.some(
    (seg) =>
      /^[A-Za-z_$][\w$]*$/.test(seg) && new RegExp(`(?:const|let|var)\\s+${seg}\\s*=`).test(src),
  );
  if (unresolved || segments.length === 0) return null;
  return segments.join("/");
}

/**
 * Extract explicit context.registerModType() calls (e.g. from applyGame).
 * Skips entries already captured via spec.modTypes.
 */
function extractRegisterModTypes(src, table) {
  const results = [];
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, "");
  const re = /context\.registerModType\(/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const lineStart = stripped.lastIndexOf("\n", m.index);
    const linePrefix = stripped.substring(lineStart + 1, m.index).trim();
    if (linePrefix.startsWith("//")) continue;
    if (!isGuardChainActive(stripped, m.index, table)) continue;
    // Extract full args by depth tracking
    let depth = 1;
    let i = m.index + m[0].length;
    let argsStr = "";
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if (ch === "(") depth++;
      else if (ch === ")") {
        if (--depth === 0) break;
      }
      argsStr += ch;
      i++;
    }
    const args = splitAtTopLevelCommas(argsStr);
    if (args.length < 2) continue;
    const idRaw = args[0].trim();
    // Skip forEach iteration variables like type.id
    if (idRaw.includes(".")) continue;
    const priorityRaw = args[1].trim();
    const priority = /^\d+$/.test(priorityRaw) ? priorityRaw : null;
    const id = resolveWithFallback(idRaw, table, src);
    // Name from last arg if it's an options object { name: ... }
    let name = null;
    const lastArg = args[args.length - 1].trim();
    if (lastArg.startsWith("{")) {
      const nameM = lastArg.match(/(?:"name"|name)\s*:\s*([^,}\n]+)/);
      if (nameM) name = resolveWithFallback(nameM[1].trim(), table, src);
    }
    // Folder from a getPath of the form (game) => pathPattern(context.api, game, <expr>).
    // Any other getPath (a helper call, a block body) is left unresolved.
    let targetPath = null;
    if (args.length >= 4) {
      const pathM = args[3]
        .trim()
        .match(
          /^\(?\s*game\s*\)?\s*=>\s*pathPattern\(\s*context\.api\s*,\s*game\s*,\s*([\s\S]+)\)$/,
        );
      if (pathM)
        targetPath = cleanResolvedPath(resolveWithFallback(pathM[1].trim(), table, src), src);
    }
    results.push({ id, name: name || id, priority, targetPath });
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
  const dqRe = new RegExp(`${key}\\s*:\\s*"([^"]*)"`, "s");
  const dqM = objStr.match(dqRe);
  if (dqM) return '"' + dqM[1] + '"';

  // Try single-quoted value (may contain double quotes)
  const sqRe = new RegExp(`${key}\\s*:\\s*'([^']*)'`, "s");
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
    const parenClosePos = scanToMatchingClose(objStr, parenOpenPos, "(", ")");
    if (parenClosePos !== -1) {
      return "path.join(" + objStr.slice(parenOpenPos + 1, parenClosePos) + ")";
    }
  }
  // Fall back to regular extraction
  return extractField(objStr, fieldName);
}

/**
 * Name of the function a registerInstaller argument refers to, or null.
 * Some games wrap the function in an arrow to inject the api, e.g.
 * `(files, gameId) => testSave(context.api, files, gameId)`; the wrapped callee
 * is the real identity.
 */
function calleeName(arg) {
  const a = arg.trim();
  if (/^[A-Za-z_$]\w*$/.test(a)) return a;
  const arrowM = a.match(/=>\s*(?:\{\s*return\s+)?([A-Za-z_$]\w*)\s*\(/);
  return arrowM ? arrowM[1] : null;
}

/**
 * Extract installer registrations with resolved IDs.
 *
 * Returns { id, rawId, priority, testFn, installFn, guardFlag } per registration. `rawId` is
 * the id argument as written (usually a `FOO_ID` constant). `testFn` is the
 * third argument to registerInstaller — the stable cross-extension identity of an
 * installer (e.g. `testLogic` means the same thing in every game that registers it),
 * so it is the join key for per-installer documentation. `installFn` is the fourth
 * argument, read for the mod type its instructions set. `guardFlag` is the boolean
 * feature flag wrapping the call, if any; guarded-off installers are already dropped.
 *
 * `id` and `priority` predate the extra fields and are unchanged.
 */
function extractInstallers(src, table) {
  const results = [];
  // Strip block comments but preserve line structure
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, "");
  // Skip a leading `//comment` line some extensions put right after the opening
  // paren to document the installer -- without this the comment text itself gets
  // captured as the id (see game-warhammer40kdarktide's `//covers DML and LOFM`).
  const re = /context\.registerInstaller\(\s*(?:\/\/[^\n]*\n\s*)*([^,]+),\s*(\d+)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    // Check this isn't in a comment
    const lineStart = stripped.lastIndexOf("\n", m.index);
    const linePrefix = stripped.substring(lineStart + 1, m.index).trim();
    if (linePrefix.startsWith("//")) continue;
    const inlineGuard = inlineGuardAt(stripped, m.index);
    if (!isGuardActive(inlineGuard, table)) continue;
    const guardInst = getGuardCondition(stripped, m.index);
    if (!isGuardActive(guardInst, table)) continue;
    const guardFlagInst = guardInst ? guardInst.flag : inlineGuard ? inlineGuard.flag : null;

    const rawId = m[1].trim();
    const priority = m[2];
    const resolvedId = resolveValue(rawId, table);

    // Third argument is the test function, fourth the install function. Read the
    // remaining args by depth-tracked scan so arrow-function args don't confuse the split.
    let testFn = null;
    let installFn = null;
    const argsOpen = stripped.indexOf("(", m.index);
    const argsClose = scanToMatchingClose(stripped, argsOpen, "(", ")");
    if (argsClose !== -1) {
      const args = splitAtTopLevelCommas(stripped.slice(argsOpen + 1, argsClose));
      if (args.length >= 3) testFn = calleeName(args[2]);
      if (args.length >= 4) installFn = calleeName(args[3]);
    }

    results.push({
      id: resolvedId,
      rawId,
      priority,
      testFn,
      installFn,
      guardFlag: guardFlagInst || null,
    });
  }
  return results;
}

module.exports = {
  buildSymbolTable,
  activeReassignments,
  splitPathJoinArgs,
  splitAtTopLevelCommas,
  scanToMatchingClose,
  getGuardFlag,
  findInnermostBlockHead,
  findInnermostBlockOpen,
  getGuardCondition,
  isGuardActive,
  isGuardChainActive,
  cleanEnvPath,
  scanToMatchingOpen,
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
