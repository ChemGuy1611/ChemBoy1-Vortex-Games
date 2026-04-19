const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");

module.exports = defineConfig([
  {
    files: ["**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "off",
    },
    languageOptions: {
      "sourceType": "commonjs",
    },
  },
]);