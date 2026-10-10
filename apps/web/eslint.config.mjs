import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-local/**", // local-stack dev server build dir
    ".next-build/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Vendored from the @chaiui registry (shadcn add). Kept byte-identical so
    // `shadcn add @chaiui/<name> --overwrite` stays a clean update, so the React
    // Compiler lint rules and the <img> hint are relaxed for these files only.
    files: [
      "src/components/ui/**",
      "src/components/theme-provider.tsx",
      "src/components/theme-switcher.tsx",
      "src/components/backdrop.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
