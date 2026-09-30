import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "test-results/", "playwright-report/", ".venv/"] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: "module" },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "no-console": ["error", { allow: ["info"] }],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: "error",
      curly: ["error", "multi-line"],
      "no-implicit-coercion": ["error", { allow: ["!!"] }],
      "no-param-reassign": ["error", { props: false }],
      "no-shadow": "error",
      "no-use-before-define": ["error", { functions: false }],
      "no-nested-ternary": "off",
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 30, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
    },
  },
  {
    files: ["assets/js/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["tests/**/*.js", "*.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "max-lines-per-function": "off" },
  },
];
