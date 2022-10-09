import commonjs from '@rollup/plugin-commonjs'
import path from 'path'
import typescript from 'rollup-plugin-typescript2'

import pkg from './package.json'

/** @type {import('rollup').MergedRollupOptions} */
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
  plugins: [typescript(), commonjs()],
}
