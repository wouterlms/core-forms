module.exports = {
  root: true,

  env: {
    node: true,
  },

  extends: [
    // 'plugin:vue/vue3-recommended',
    // '@vue/airbnb',
    // '@vue/typescript/recommended'
    'appwise'
  ],

  // plugins: ['putout'],

  parserOptions: {
    ecmaVersion: 2020,
    project: ['./tsconfig.json']
  },

  settings: {
    'import/resolver': {
      node: {
        extensions: [
          '.js',
          '.ts',
          '.d.ts',
          '.json',
          '.vue'
        ],
      },
      alias: {
        map: [
          [
            '@',
            './src',
            '~',
            './'
          ]
        ],
        extensions: [
          '.js',
          '.vue',
          '.ts',
          '.d.ts'
        ],
      },
    },
  },
}
