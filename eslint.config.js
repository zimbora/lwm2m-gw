const js = require('@eslint/js');
const prettier = require('eslint-plugin-prettier/recommended');

module.exports = [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Jest globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        // Project specific global
        $: 'writable',
        // Node.js built-ins that may not be recognized
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console.log for this project
      'no-undef': 'error',
      'no-unreachable': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'always'],
      curly: ['warn', 'all'],
      'no-constant-condition': 'warn',
      'no-empty': 'warn',
      'no-async-promise-executor': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.min.js',
      // Temporary: Files with critical issues that need major refactoring
      'client/bootstrap.js',
      'client/examples/dtlsClient.js',
      'client/registration.js',
      'client/routes.js',
      'server/examples/server.js',
      'server/examples/dtlsServer.js',
      'server/examples/serverMqttGw.js',
      'server/examples/serverMqttBidirectional.js',
      'server/observationRegistry.js',
      'server/resourceClient.js',
      'server/transport/mqttClient.js',
      'test/server/coapServerEvents.test.js',
    ],
  },
];
