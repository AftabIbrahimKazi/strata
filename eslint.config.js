const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/dist/**',
      'strata-css-docs-site/**',
      'packages/*/node_modules/**',
      'packages/chart/dist/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  {
    // Node-side source: CLI, PostCSS plugin, scanner/registry/generator, benchmarks, root configs
    files: ['src/**/*.js', 'bin/**/*.js', 'benchmark/**/*.js', '*.config.js', 'eslint.config.js'],
    ignores: ['src/components/modules/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Tests exercise both the Node build pipeline and browser-side component behaviour
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Browser-side runtime code: component packages and src/components/modules
    files: ['packages/**/*.js', 'src/components/modules/**/*.js'],
    ignores: ['packages/*/node_modules/**', 'packages/chart/dist/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.browser,
        ...globals.amd,
        THREE: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // ESM build configs
    files: ['packages/*/rollup.config.js', 'packages/*/vite.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
]
