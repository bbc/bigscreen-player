import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import babel from '@rollup/plugin-babel'
import serve from 'rollup-plugin-serve'
import liveReload from 'rollup-plugin-livereload'
import json from '@rollup/plugin-json'
import pkg from './package.json'

export default {
  input: 'src/main.js',
  output: {
    name: 'bsp',
    inlineDynamicImports: true,
    file: pkg.browser,
    sourcemap: true,
    format: 'es'
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    json(),
    nodePolyfills(),
    babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
    serve({
      open: true
    }),
    liveReload('dist')
  ]
}
