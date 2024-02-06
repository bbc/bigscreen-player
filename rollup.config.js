import PackageJSON from "./package.json" assert { type: "json" }

import replace from "@rollup/plugin-replace"
import { dts } from "rollup-plugin-dts"
import ts from "rollup-plugin-ts"

export default [
  {
    input: "src/main.ts",
    external: [/^dashjs/, "smp-imsc", "tslib"],
    output: [{ dir: "dist/esm", format: "es" }],
    plugins: [
      replace({
        preventAssignment: true,
        __VERSION__: () => PackageJSON.version,
      }),
      ts({
        tsconfig: "./tsconfig.dist.json",
      }),
    ],
  },
  {
    input: "./dist/tmp/dts/main.d.ts",
    output: [{ file: "./dist/esm/main.d.ts", format: "es" }],
    plugins: [dts()],
  },
]
