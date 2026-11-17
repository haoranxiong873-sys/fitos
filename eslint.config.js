const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const pluginQuery = require('@tanstack/eslint-plugin-query');

module.exports = defineConfig([
    expoConfig,
    eslintPluginPrettierRecommended,
    ...pluginQuery.configs['flat/recommended'],
    {
        rules: {
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    {
        ignores: ['dist/*', 'local/**'],
    },
]);
