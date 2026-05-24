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
      "no-unused-vars": ["warn", { "vars": "all", "args": "after-used", "ignoreRestSiblings": true }],
      "no-useless-assignment": "off",
      "no-unsafe-finally": "warn",
      "require-yield": "warn",
    },
    languageOptions: {
      "sourceType": "commonjs",
      globals: {
				...globals.node,
        DOMParser: true,
        XMLSerializer: true,
			},
    },
  },
]);
