import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: { globals: globals.node },
  },
  {
    overrides: [
      {
        files: ["__tests__/**/*"],
        env: {
          jest: true,
        },
      },
    ],
  },
  tseslint.configs.strict,
  tseslint.configs.stylistic,
]);
