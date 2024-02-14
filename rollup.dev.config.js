import PackageJSON from "./package.json" assert { type: "json" }

import babel from "@rollup/plugin-babel"
import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import replace from "@rollup/plugin-replace"
import liveReload from "rollup-plugin-livereload"
import nodePolyfills from "rollup-plugin-polyfill-node"
import serve from "rollup-plugin-serve"

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
    replace({
      preventAssignment: true,
      __VERSION__: () => PackageJSON.version,
    }),
    resolve({ extensions, preferBuiltins: false }),
    commonjs(),
    nodePolyfills(),
    babel({ extensions, babelHelpers: "bundled" }),
    serve({
      open: true,
    }),
    liveReload("dist"),
  ],
}
