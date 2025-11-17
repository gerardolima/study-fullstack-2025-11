import eslint from '@eslint/js';
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import tseslint from 'typescript-eslint';

/** @type {import("@typescript-eslint/utils").TSESLint.FlatConfig.Config} */
const configSource =  {
  files: ['**/*.ts'],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { project: true },
  },
  linterOptions: {
    reportUnusedDisableDirectives: true,
  },
  plugins: {
    import: importPlugin
  },
  rules: { // keep the rules sorted by name
    '@typescript-eslint/no-unused-vars': [ 'error', {
      // allow `_unused` identifiers
      // allow using destructuring to remove properties from an object
      'args': 'all',
      'argsIgnorePattern': '^_',
      'caughtErrors': 'all',
      'caughtErrorsIgnorePattern': '^_',
      'destructuredArrayIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'ignoreRestSiblings': true
    }],

    'import/order': ['error', {
      // enforce consistent ordering of import statements (https://github.com/import-js/eslint-plugin-import)
      groups: [ 'builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      pathGroups: [
        { group: 'internal', pattern: '@repo/**', position: 'after' },
        { group: 'internal', pattern: '@src/**', position: 'after' },
        { group: 'internal', pattern: '#src/**', position: 'after' },
      ],
      pathGroupsExcludedImportTypes: ['@src/', '#src/'],
      alphabetize: { order: 'asc' },
    }],

    '@typescript-eslint/no-floating-promises': ['error', {
      allowForKnownSafeCalls: [
        { from: 'package', package: 'node:test', name: ['it', 'describe'] },
      ],
    }],

    'sort-imports': ['error', {      // enforce consistent ordering of imported symbols only
      'ignoreDeclarationSort': true, // allow for `import/order` to handle the order of imported modules
      'ignoreCase': true,
    }],
  },
}

/**
 * Opinionated rules to apply only to specs.
 * @type {import("@typescript-eslint/utils").TSESLint.FlatConfig.Config}
 */
const configSpec =  {
  files: ['**/*.spec.ts'],
  rules: {
    // relax assigning from `any`, to easy assertions made on arguments of mocked functions/methods
    '@typescript-eslint/no-unsafe-assignment': 'off',
  },
}

const config = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  configSource,
  configSpec,
  eslintConfigPrettier, // prettier disables rules to avoid conflict with prettier, must be the las element
 )
export default config
