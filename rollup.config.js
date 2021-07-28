import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import inject from '@rollup/plugin-inject';
import babel from '@rollup/plugin-babel';
import pkg from './package.json';
import { terser } from 'rollup-plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';

export default [{
  input: 'src/main.js',
  output: {
    name: 'BigscreenPlayer',
    inlineDynamicImports: true,
    file: pkg.browser,
    sourcemap: true,
    format: 'umd'
  },
  plugins: [
    visualizer(),
    alias({
      entries: {
        buffer: require.resolve('buffer'),
        process: require.resolve('process'),
        stream: require.resolve('stream-browserify')
      }
    }),
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    inject({
      Buffer: ['buffer', 'Buffer'],
      process: 'process'
    }),
    babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
    terser({format: {comments: 'all'}})
  ]
},
{
  input: 'src/main.js',
  external: ['dashjs', 'smp-imsc'],
  output: [
    { dir: 'dist/esm', format: 'es' }
  ]
}];
