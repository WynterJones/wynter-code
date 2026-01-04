import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // React hooks rules - use classic rules, not compiler rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      // JavaScript rules
      "no-console": "off",
      "no-case-declarations": "off",
      "no-constant-binary-expression": "warn",
      "prefer-const": "warn",
      "no-empty": "off",
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    // Relaxed rules for test files
    files: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-constant-binary-expression": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "dist-farmwork/**",
      "node_modules/**",
      "src-tauri/**",
      "*.config.js",
      "*.config.ts",
    ],
  }
);
