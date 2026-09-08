const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const globals = require("globals");

module.exports = defineConfig([
  {
    ignores: ["resources/snippets.js"],
  },
  {
    files: ["**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": ["warn", { vars: "all", args: "after-used", ignoreRestSiblings: true }],
      "no-useless-assignment": "off",
      "no-unsafe-finally": "warn",
      "require-yield": "warn",
      // node-fs migration (plan node-fs-migration-copper-crucible): after a file is
      // rebound, `fs` is native node fs and the vortex-api wrapper lives under `vfs`,
      // kept only for ensureDirWritableAsync / unlinkAsync / the fd-based calls. Any
      // other wrapper member has a native replacement - reach for that instead.
      // fsExtra was a Vortex-bundled dep, not an extension dep; it is retired and its
      // two used members map to native fs. The migration is complete, so this is at
      // "error" - new code must not reach for either wrapper.
      "no-restricted-properties": [
        "error",
        { object: "vfs", property: "statSync", message: "use native fs.statSync (fs is node fs)" },
        { object: "vfs", property: "statAsync", message: "use native fsp.stat" },
        { object: "vfs", property: "readdirSync", message: "use native fs.readdirSync" },
        { object: "vfs", property: "readdirAsync", message: "use native fsp.readdir" },
        { object: "vfs", property: "readFileSync", message: "use native fs.readFileSync" },
        { object: "vfs", property: "readFileAsync", message: "use native fsp.readFile" },
        { object: "vfs", property: "writeFileSync", message: "use native fs.writeFileSync" },
        { object: "vfs", property: "writeFileAsync", message: "use native fsp.writeFile" },
        { object: "vfs", property: "renameAsync", message: "use native fsp.rename" },
        { object: "vfs", property: "symlinkAsync", message: "use native fsp.symlink" },
        {
          object: "vfs",
          property: "ensureDirSync",
          message: "use fs.mkdirSync(p, { recursive: true })",
        },
        {
          object: "vfs",
          property: "ensureDirAsync",
          message: "use fsp.mkdir(p, { recursive: true })",
        },
        {
          object: "vfs",
          property: "ensureFileAsync",
          message: "use the injected ensureFileAsync() helper",
        },
        {
          object: "vfs",
          property: "removeAsync",
          message: "use fsp.rm(p, { recursive: true, force: true })",
        },
        { object: "vfs", property: "copyAsync", message: "use fsp.cp(s, d, { recursive: true })" },
        {
          object: "vfs",
          property: "copySync",
          message: "use fs.cpSync(s, d, { recursive: true })",
        },
        { object: "vfs", property: "moveAsync", message: "use fsp.rename with an EXDEV fallback" },
        { object: "fsExtra", property: "unlinkSync", message: "use native fs.unlinkSync" },
        { object: "fsExtra", property: "copyFileSync", message: "use native fs.copyFileSync" },
      ],
    },
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        DOMParser: true,
        XMLSerializer: true,
      },
    },
  },
]);
