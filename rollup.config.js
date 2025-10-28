import PackageJSON from "./package.json" with { type: "json" }

import alias from "@rollup/plugin-alias"
import replace from "@rollup/plugin-replace"
import typescript from "@rollup/plugin-typescript"
import { dts } from "rollup-plugin-dts"

export default [
  {
    input: "src/main.ts",
    external: [/^dashjs/, "smp-imsc", "tslib"],
    output: [{ dir: "dist/esm", format: "es" }],
    plugins: [
      alias({
        entries: [{ find: "imsc", replacement: "smp-imsc" }],
      }),
      replace({
        preventAssignment: true,
        __VERSION__: () => PackageJSON.version,
      }),
      typescript({
        tsconfig: "./tsconfig.dist.json",
      }),
    ],
  },
  {
    input: "./dist/esm/__tmp/dts/main.d.ts",
    output: [{ file: "./dist/esm/main.d.ts", format: "es" }],
    plugins: [dts()],
  },
]
