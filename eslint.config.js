import eslint from "@eslint/js"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginUnicorn.configs["flat/recommended"],
  {
    // ignores: ["samsungmaple.js", "samsungstreaming.js", "samsungstreaming2015.js"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      ecmaVersion: 5,
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      // Discuss these!
      // sonarjs/cognitive-complexity: off
      "unicorn/consistent-function-scoping": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/catch-error-name": "off",

      // STYLE
      // Sorted alphabetically
      "arrow-body-style": ["error", "as-needed"],
      "camelcase": "error",
      "curly": ["error", "multi-line"],
      "default-param-last": "error",
      "dot-notation": "error",
      "id-length": ["error", { min: 2, exceptions: ["_"] }],
      "max-nested-callbacks": ["error", 3],
      "new-cap": ["error", { newIsCap: true, capIsNew: false }],
      "no-else-return": "error",
      "no-floating-decimal": "error",
      "no-multi-str": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "one-var": ["error", { initialized: "never" }],
      "prefer-arrow-callback": "error",
      "prefer-const": ["error", { destructuring: "all", ignoreReadBeforeAssign: true }],
      "prefer-template": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "yoda": ["error", "never"],
      "unicorn/no-null": "off",
      "unicorn/switch-case-braces": ["error", "avoid"],

      // PROBLEMS
      // Sorted alphabetically
      "array-callback-return": "error",
      "default-case-last": "error",
      "eqeqeq": ["error", "allow-null"],
      "no-array-constructor": "error",
      "no-await-in-loop": "error",
      "no-caller": "error",
      "no-console": "error",
      "no-constant-binary-expression": "error",
      "no-constructor-return": "error",
      "no-debugger": "error",
      "no-div-regex": "error",
      "no-duplicate-imports": "error",
      "no-eval": "error",
      "no-extend-native": "error",
      "no-extra-bind": "error",
      "no-implied-eval": "error",
      "no-iterator": "error",
      "no-label-var": "error",
      "no-labels": "error",
      "no-lone-blocks": "error",
      "no-loop-func": "error",
      "no-new": "error",
      "no-new-func": "error",
      "no-new-object": "error",
      "no-new-wrappers": "error",
      "no-octal-escape": "error",
      "no-param-reassign": "error",
      "no-proto": "error",
      "no-return-assign": "error",
      "no-return-await": "error",
      "no-sequences": "error",
      "no-throw-literal": "error",
      "no-unneeded-ternary": "error",
      "no-unreachable-loop": "error",
      "no-unused-private-class-members": "error",
      "no-useless-call": "error",
      "no-useless-constructor": "error",
      "no-useless-return": "error",
      "no-use-before-define": ["error", "nofunc"],
      "no-with": "error",
      "use-isnan": "error",
      "wrap-iife": ["error", "any"],

      // TV COMPATIBILITY – features that aren't fully supported
      // Sorted alphabetically
      "unicorn/no-array-for-each": "off",
      "unicorn/no-for-loop": "off",
      "unicorn/numeric-separators-style": "off",
      "unicorn/prefer-array-flat": "off",
      "unicorn/prefer-at": "off",
      "unicorn/prefer-dom-node-append": "off",
      "unicorn/prefer-dom-node-remove": "off",
      "unicorn/prefer-includes": "off",
      "unicorn/prefer-math-trunc": "off",
      "unicorn/prefer-number-properties": "off",
      "unicorn/prefer-optional-catch-binding": "off",
      "unicorn/prefer-string-replace-all": "off",

      // TYPESCRIPT
      // Sorted alphabetically
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // turn off type-aware linting for pure JS files
  {
    files: ["*.ts"],
    ...tseslint.configs.recommendedTypeChecked,
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { allowDefaultCaseForExhaustiveSwitch: false, requireDefaultForNonUnion: true },
      ],
    },
  }
)
