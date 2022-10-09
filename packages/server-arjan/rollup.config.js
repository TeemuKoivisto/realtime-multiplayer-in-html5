import commonjs from '@rollup/plugin-commonjs'
import path from 'path'

import pkg from './package.json'

/** @type {import('rollup').MergedRollupOptions} */
export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
  plugins: [commonjs()],
}
