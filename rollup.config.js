import json from '@rollup/plugin-json'

export default {
  input: 'src/main.js',
  external: ['dashjs', 'smp-imsc'],
  output: [
    { dir: 'dist/esm', format: 'es' }
  ],
  plugins: [
    json()
  ]
}
