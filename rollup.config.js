import fs from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import alias from "@rollup/plugin-alias"
import replace from "@rollup/plugin-replace"
import typescript from "@rollup/plugin-typescript"
import { dts } from "rollup-plugin-dts"

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "./package.json")
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

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
        __VERSION__: () => packageJson.version,
      }),
      typescript({
        tsconfig: "./tsconfig.dist.json",
      }),
    ],
  },
  {
    input: "./src/debugger/validator.ts",
    output: [{ dir: "dist/esm", format: "es" }],
    external: ["tslib"],
    plugins: [
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
  {
    input: "./dist/esm/__tmp/dts/debugger/validator.d.ts",
    output: [{ file: "./dist/esm/validator.d.ts", format: "es" }],
    plugins: [dts()],
  },
]
