/* What the checks are allowed to fail you for.
   Not a style sheet. Every rule here is one that catches code that is wrong
   rather than code that is untidy, because the layer files are loaded as plain
   <script> tags with no build step: whatever is in them is what runs. */
export default [
  {
    ignores: ["game/fins.js", "node_modules/**", "dist/**"],
  },
  {
    files: ["game/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: { window: "readonly", document: "readonly", globalThis: "readonly" },
    },
    rules: {
      /* The layers reach for each other and for the bundle through the window,
         so an undeclared name is the normal case here, not a mistake. */
      "no-undef": "off",
      /* The codebase's own idiom for "this is allowed to fail". */
      "no-empty": "off",
      /* Worth seeing, not worth failing a build over. */
      "no-unused-vars": ["warn", { vars: "all", args: "none", caughtErrors: "none" }],

      /* Two entries of the same name in an object: one of them silently is not
         there. The sound catalog is a hundred and eighteen keys long. */
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      /* `var` twice in one scope is legal and the layers do it. Worth a look,
         not worth a red build. */
      "no-redeclare": "warn",
      /* The layers wrap each other by capturing a function declaration and
         reassigning the name. That is the idiom here, not a mistake. */
      "no-func-assign": "off",
      "no-const-assign": "error",
      "no-global-assign": "error",
      "no-shadow-restricted-names": "error",

      "no-unreachable": "error",
      "no-fallthrough": "error",
      "no-cond-assign": ["error", "except-parens"],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-unsafe-negation": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-optional-chaining": "error",
      "getter-return": "error",
      "no-setter-return": "error",
      "no-obj-calls": "error",
      "no-self-assign": "error",
      /* `x === x` is how this codebase asks "is it NaN", ten times over in
         nn.js alone. It is deliberate. */
      "no-self-compare": "off",
      "no-compare-neg-zero": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "no-sparse-arrays": "error",
      "no-invalid-regexp": "error",
      "no-misleading-character-class": "error",
      "no-async-promise-executor": "error",
      "no-delete-var": "error",
      "no-octal": "error",
      "no-with": "error",
      "no-debugger": "error",

      /* This one is here for a specific bug. feel.js guarded a canvas resize
         with `overlay.width !== (w * dpr) | 0`, and `!==` binds tighter than
         `|`, so it read `(overlay.width !== w * dpr) | 0` and came out 1 on
         every frame with a fractional device ratio. The canvas was torn down
         and rebuilt sixty times a second for as long as the tab was open.
         Parenthesise, or do not mix the two. */
      "no-mixed-operators": [
        "error",
        {
          groups: [["==", "!=", "===", "!==", ">", ">=", "<", "<=", "&", "|", "^", "~", "<<", ">>", ">>>"]],
          allowSamePrecedence: true,
        },
      ],
    },
  },
  {
    files: ["desktop/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { require: "readonly", module: "readonly", process: "readonly", __dirname: "readonly", console: "readonly" },
    },
    rules: {
      "no-undef": "off",
      "no-empty": "off",
      "no-unused-vars": ["warn", { vars: "all", args: "none", caughtErrors: "none" }],
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-debugger": "error",
    },
  },
  {
    files: ["tools/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      /* boot-check is a Node script that also carries functions which are
         shipped into the page and run there, so both sets of globals are
         real in the same file. */
      globals: {
        process: "readonly",
        console: "readonly",
        window: "readonly",
        document: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { vars: "all", args: "none", caughtErrors: "none" }],
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-debugger": "error",
    },
  },
];
