import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node },
      parserOptions: { sourceType: "script" },
    },
    rules: {
      "no-console": "off",
      "no-undef": "error",
    },
  },
];
