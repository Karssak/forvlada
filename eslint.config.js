import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        lucide: "readonly",
        io: "readonly",
        Chart: "readonly"
      }
    },
    rules: {
      "no-empty": ["error", { "allowEmptyCatch": true }]
    }
  },
  pluginJs.configs.recommended
];
