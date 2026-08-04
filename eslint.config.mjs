import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // "Load data on mount" (`useEffect(() => { carregar() }, [carregar])`) and "reset
      // form fields when a dialog opens" are this app's two deliberate, consistently-used
      // patterns across every page/dialog — not accidental derived-state bugs. Audited
      // 2026-08-04: every single hit (24 of them) was one of these two intentional shapes.
      // Left on, it's pure noise that hides real regressions instead of catching them.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
