import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import nodePolyfills from "rollup-plugin-polyfill-node"
import babel from "@rollup/plugin-babel"
import serve from "rollup-plugin-serve"
import liveReload from "rollup-plugin-livereload"
import json from "@rollup/plugin-json"
import typescript from "@rollup/plugin-typescript"
import del from "rollup-plugin-delete"

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
    del({ targets: "dist-local/*", runOnce: true }),
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    json(),
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
