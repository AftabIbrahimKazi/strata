import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import dts from 'rollup-plugin-dts'

const browserPlugins = [
  resolve({ browser: true }),
  commonjs(),
  typescript({ tsconfig: './tsconfig.json', declaration: false }),
]

const cliPlugins = [
  resolve({ preferBuiltins: true }),
  commonjs(),
  json(),
  typescript({ tsconfig: './tsconfig.node.json', declaration: false }),
]

export default [
  // ESM browser build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/shopmap.esm.js',
      format: 'es',
      sourcemap: true,
    },
    external: ['maplibre-gl', 'pmtiles'],
    plugins: browserPlugins,
  },

  // CJS browser build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/shopmap.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external: ['maplibre-gl', 'pmtiles'],
    plugins: browserPlugins,
  },

  // UMD browser build (bundles everything for plain script tag use)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/shopmap.umd.js',
      format: 'umd',
      name: 'ShopMap',
      sourcemap: true,
      globals: {
        'maplibre-gl': 'maplibregl',
        pmtiles: 'pmtiles',
      },
    },
    external: ['maplibre-gl', 'pmtiles'],
    plugins: browserPlugins,
  },

  // TypeScript declarations
  {
    input: 'src/index.ts',
    output: { file: 'dist/shopmap.d.ts', format: 'es' },
    external: ['maplibre-gl', 'pmtiles'],
    plugins: [dts()],
  },

  // CLI build
  {
    input: 'src/cli/index.ts',
    output: {
      file: 'dist/cli/index.js',
      format: 'cjs',
      banner: '#!/usr/bin/env node',
      inlineDynamicImports: true,
    },
    external: ['fs', 'path', 'url', 'https', 'http', 'stream', 'zlib', 'os', 'readline',
               'crypto', 'events', 'buffer', 'util', 'assert', 'tty', 'net', 'string_decoder',
               'timers', 'child_process'],
    plugins: cliPlugins,
  },
]
