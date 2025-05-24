import fs from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import alias from "@rollup/plugin-alias"
import babel from "@rollup/plugin-babel"
import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import replace from "@rollup/plugin-replace"
import liveReload from "rollup-plugin-livereload"
import nodePolyfills from "rollup-plugin-polyfill-node"
import serve from "rollup-plugin-serve"

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "./package.json")
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

const extensions = [".js", ".ts"]

export default {
  input: "src/main.ts",
  output: {
    file: "dist-local/esm/main.js",
    name: "bsp",
    inlineDynamicImports: true,
    sourcemap: true,
    format: "es",
  },
  plugins: [
    alias({
      entries: [{ find: "imsc", replacement: "smp-imsc" }],
    }),
    replace({
      preventAssignment: true,
      __VERSION__: () => packageJson.version,
    }),
    resolve({ extensions, preferBuiltins: false }),
    commonjs(),
    nodePolyfills(),
    babel({ extensions, babelHelpers: "bundled" }),
    serve({
      open: true,
    }),
    liveReload({
      watch: ["index.html", "dist-local"],
    }),
  ],
}
