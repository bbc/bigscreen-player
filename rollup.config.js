import PackageJSON from "./package.json" assert { type: "json" }

import typescript from "@rollup/plugin-typescript"
import replace from "@rollup/plugin-replace"

export default [
  {
    input: "src/main.ts",
    external: [/^dashjs/, "smp-imsc"],
    output: [{ dir: "dist/esm", format: "es" }],
    plugins: [
      replace({
        preventAssignment: true,
        __VERSION__: () => PackageJSON.version,
      }),
      typescript({
        exclude: ["./src/**/*.test.ts"],
      }),
    ],
  },
]
