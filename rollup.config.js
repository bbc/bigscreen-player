import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import babel from '@rollup/plugin-babel'
import json from '@rollup/plugin-json'
import pkg from './package.json'
import { terser } from 'rollup-plugin-terser'
import { visualizer } from 'rollup-plugin-visualizer'

export default [{
  input: 'src/main.js',
  output: {
    inlineDynamicImports: true,
    name: 'bsp',
    file: pkg.browser,
    sourcemap: true,
    format: 'umd'
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    json(),
    nodePolyfills(),
    visualizer(),
    babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
    terser({format: {comments: 'all'}})
  ]
},
{
  input: 'src/main.js',
  external: ['dashjs', 'smp-imsc'],
  output: [
    { dir: 'dist/esm', format: 'es' }
  ],
  plugins: [    
    json()
  ]
}]
