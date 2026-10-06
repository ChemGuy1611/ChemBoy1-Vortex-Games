"use strict";

// Source rewrites for loadExtension's `transform` option. They exist so a test can flip a
// feature toggle or a constant in memory and observe how registration changes, without ever
// editing the template on disk.

// Replace the value of a top-level `const NAME = ...;` / `let NAME = ...;`. Throws when the
// declaration is gone, so renaming a toggle turns the test red instead of silently passing.
function setConst(name, literal) {
  const pattern = new RegExp(`^(\\s*(?:const|let) ${name} = )[^;]+;`, "m");
  return (source) => {
    if (!pattern.test(source)) throw new Error(`declaration of ${name} not found`);
    return source.replace(pattern, `$1${literal};`);
  };
}

// Apply several transforms in order, e.g. all(setConst("a", "1"), setConst("b", "2")).
const all =
  (...transforms) =>
  (source) =>
    transforms.reduce((text, transform) => transform(text), source);

module.exports = { setConst, all };
