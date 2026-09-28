import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Standard Next.js ESLint config (same as `next lint`'s "Strict" scaffold
// choice) — added so `npm run lint` can run non-interactively. This is
// exactly what `create-next-app`/`next lint` would generate for this project
// (Next.js 15, TypeScript), just checked in instead of left to an
// interactive first run, plus one small addition below.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // The codebase already uses a leading underscore to mark a
      // deliberately-unused parameter throughout (e.g. `_req` in most API
      // routes, `_baseUrl` in the mockup providers, `_screenshotPaths` in
      // screenRecordingProvider.generate — required by the shared
      // VideoProvider interface even when a given provider doesn't use it).
      // The plain default rule doesn't honor that convention, so every one
      // of those intentional no-ops would otherwise warn.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default eslintConfig;
