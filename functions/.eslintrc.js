// functions/.eslintrc.js
module.exports = {
  root: true, // This is important to ensure this is the root config for the functions directory
  env: {
    es6: true,
    node: true, // Already there, good for 'require' and 'module'
  },
  parserOptions: {
    ecmaVersion: 2018, // Can be higher if your Node.js supports it (e.g., 2020 or 2022)
    sourceType: "script", // <-- ESSENTIAL for CommonJS modules (using 'require' and 'module.exports')
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    quotes: ["error", "double", { allowTemplateLiterals: true }],
    "no-console": "off", // Allow console.log for debugging in functions
    "comma-dangle": "off", // Turn off strict Google styleguide rule if preferred
    "object-curly-spacing": "off", // Turn off strict Google styleguide rule if preferred
  },
  overrides: [
    {
      files: [".eslintrc.js", "*.config.js"],
      env: { node: true },
    },
    {
      files: ["**/*.spec.*"],
      env: { mocha: true },
      rules: {},
    },
  ],
  globals: {
    Buffer: "readonly",
    process: "readonly",
    require: "readonly",
    module: "readonly",
    exports: "writable",
  },
};
