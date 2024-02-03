import json from "@rollup/plugin-json"
import typescript from "@rollup/plugin-typescript"
import { dts } from "rollup-plugin-dts"
import copy from "rollup-plugin-copy"
import del from "rollup-plugin-delete"

export default [
  {
    input: "src/main.ts",
    external: [/^dashjs/, "smp-imsc"],
    output: [{ dir: "dist/esm", format: "es" }],
    plugins: [
      del({ targets: "dist/*" }),
      typescript({
        exclude: ["./src/**/*.test.ts"],
      }),
      json(),
      copy({
        targets: [
          {
            src: "package.json",
            dest: "dist",
          },
        ],
      }),
    ],
  },
  {
    input: "./dist/esm/main.d.ts",
    output: [{ file: "dist/bigscreen-player.d.ts", format: "es" }],
    plugins: [dts(), json()],
  },
  {
    input: "package.json",
    plugins: [json(), del({ targets: ["./dist/esm/**/*.d.ts", "./dist/esm/*/", "./dist/package.json"] })],
  },
]
