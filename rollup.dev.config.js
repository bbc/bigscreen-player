import PackageJSON from "./package.json" assert { type: "json" }

import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import nodePolyfills from "rollup-plugin-polyfill-node"
import babel from "@rollup/plugin-babel"
import serve from "rollup-plugin-serve"
import liveReload from "rollup-plugin-livereload"
import typescript from "@rollup/plugin-typescript"
import replace from "@rollup/plugin-replace"

export default {
  input: "src/main.ts",
  output: {
    name: "bsp",
    inlineDynamicImports: true,
    file: "dist-local/esm/main.js",
    sourcemap: true,
    format: "es",
  },
  plugins: [
    replace({
      preventAssignment: true,
      __VERSION__: () => PackageJSON.version,
    }),
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    nodePolyfills(),
    typescript({
      compilerOptions: {
        sourceMap: true,
      },
    }),
    babel({ babelHelpers: "bundled", presets: ["@babel/preset-env"] }),
    serve({
      open: true,
    }),
    liveReload("dist"),
  ],
}
