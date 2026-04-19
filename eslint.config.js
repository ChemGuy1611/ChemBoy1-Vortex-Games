const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const globals = require("globals");

module.exports = defineConfig([
  {
    files: ["**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
    },
    languageOptions: {
      "sourceType": "commonjs",
      globals: {
				...globals.node,
			},
    },
  },
]);
