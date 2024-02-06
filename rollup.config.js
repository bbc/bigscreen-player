import PackageJSON from "./package.json" assert { type: "json" }

import replace from "@rollup/plugin-replace"
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
        exclude: ["./src/**/*.test.ts"],
      }),
    ],
  },
]
