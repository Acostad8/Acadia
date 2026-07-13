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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefactos de test / cobertura
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    // Regla nueva de React 19 muy ruidosa con patrones sync-a-prop legítimos.
    // Fase 8 la va a reactivar y refactorizar; por ahora warn.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
