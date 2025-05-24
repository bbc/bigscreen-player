import eslint from "@eslint/js"
import eslintPluginJest from "eslint-plugin-jest"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import tseslint from "typescript-eslint"
import { sonarjs } from "./eslint.compat.js"

const unsafe = [
  "src/playbackstrategy/modifiers/html5.js",
  "src/playbackstrategy/modifiers/cehtml.js",
  "src/playbackstrategy/modifiers/samsungmaple.js",
  "src/playbackstrategy/modifiers/samsungstreaming.js",
  "src/playbackstrategy/modifiers/samsungstreaming2015.js",
]

const namingConvention = [
  {
    selector: "default",
    format: ["camelCase"],
    leadingUnderscore: "allow",
    trailingUnderscore: "allow",
  },
  {
    selector: ["function"],
    modifiers: ["exported"],
    format: ["camelCase", "PascalCase"],
  },
  {
    selector: "import",
    format: ["camelCase", "PascalCase"],
  },
  {
    selector: "property",
    format: ["camelCase", "UPPER_CASE"],
  },
  {
    selector: ["enumMember"],
    format: ["camelCase", "UPPER_CASE"],
  },
  {
    selector: "variable",
    format: ["camelCase", "PascalCase", "UPPER_CASE"],
    leadingUnderscore: "allow",
    trailingUnderscore: "allow",
  },
  {
    selector: "typeLike",
    format: ["PascalCase"],
  },
  {
    selector: "property",
    modifiers: ["requiresQuotes"],
    format: null, // Format rules disabled
  },
]

export default tseslint.config(
  {
    ignores: [...unsafe],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...sonarjs.configs.recommended,
      eslintPluginUnicorn.configs["flat/recommended"],
    ],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      // Discuss these!
      "sonarjs/cognitive-complexity": "off",
      "unicorn/consistent-function-scoping": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/catch-error-name": "off",

      // STYLE
      // Sorted alphabetically
      "arrow-body-style": ["error", "as-needed"],
      "curly": ["error", "multi-line"],
      "default-param-last": "error",
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
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/dot-notation": "error",
      "@typescript-eslint/naming-convention": ["error", ...namingConvention],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { allowDefaultCaseForExhaustiveSwitch: false, requireDefaultForNonUnion: true },
      ],

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
      "no-sequences": "error",
      "no-throw-literal": "error",
      "no-unneeded-ternary": "error",
      "no-unreachable-loop": "error",
      "no-unused-private-class-members": "error",
      "no-useless-call": "error",
      "no-useless-return": "error",
      "no-use-before-define": ["error", "nofunc"],
      "no-with": "error",
      "use-isnan": "error",
      "wrap-iife": ["error", "any"],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/prefer-promise-reject-errors": "error",
      "@typescript-eslint/prefer-return-this-type": "error",
      "@typescript-eslint/return-await": "error",

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
      "unicorn/prefer-set-has": "off",
      "unicorn/prefer-string-replace-all": "off",

      // HAS ISSUES
      "sonarjs/no-duplicate-string": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-array-method-this-argument": "off",
    },
  },
  {
    // Overrides for all JavaScript files
    files: ["**/*.{js,cjs,mjs}"],
    ignores: [...unsafe],
    // Turn off type-aware linting
    extends: [tseslint.configs.disableTypeChecked, ...tseslint.configs.recommended],
  },
  {
    // Overrides for all tests
    files: ["**/*.test.{js,cjs,mjs,ts,cts,mts}"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/unbound-method": "off",
      "max-nested-callbacks": "off",
      "sonarjs/no-identical-functions": "off",
      "unicorn/consistent-function-scoping": "off",
    },
  },
  {
    // Overrides for Jest unit tests
    files: ["src/**/*.test.{js,cjs,mjs,ts,cts,mts}"],
    extends: [eslintPluginJest.configs["flat/recommended"], eslintPluginJest.configs["flat/style"]],
    rules: {
      "jest/prefer-each": "error",
      "jest/prefer-spy-on": "error",
    },
  }
)
