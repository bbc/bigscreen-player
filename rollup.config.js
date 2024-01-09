import json from "@rollup/plugin-json"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"

export default {
  input: "src/main.js",
  external: ["dashjs", "smp-imsc"],
  output: [{ dir: "dist/esm", format: "es" }],
  plugins: [json(), typescript(), terser()],
}
