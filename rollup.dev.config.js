import PackageJSON from "./package.json" assert { type: "json" }

import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import replace from "@rollup/plugin-replace"
import liveReload from "rollup-plugin-livereload"
import nodePolyfills from "rollup-plugin-polyfill-node"
import serve from "rollup-plugin-serve"
import ts from "rollup-plugin-ts"

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
    resolve({ preferBuiltins: false }),
    commonjs(),
    nodePolyfills(),
    ts({ browserslist: false, transpiler: "babel" }),
    serve({
      open: true,
    }),
    liveReload("dist"),
  ],
}
