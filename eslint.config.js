// ESLint flat config. A port of eslint-config-react-app 7 (the CRA rule set the project used
// through ESLint 8) onto ESLint 10: the same rules at the same levels, minus the TypeScript,
// Flow and Jest parts the project never had. Test files get Vitest's globals, cypress/ gets the
// Cypress plugin's recommended set, as cypress/.eslintrc.json used to give it.
import { fixupPluginRules } from '@eslint/compat'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import cypress from 'eslint-plugin-cypress'
import testingLibrary from 'eslint-plugin-testing-library'
import vitest from '@vitest/eslint-plugin'

// eslint-plugin-react 7.37 and eslint-plugin-jsx-a11y 6.10 still call context APIs that ESLint 10
// removed (context.getFilename and friends); ESLint's own compat layer maps those onto the
// current ones. Drop the wrapping once each plugin lists eslint 10 as a peer.
const react = fixupPluginRules(reactPlugin)
const jsxA11y = fixupPluginRules(jsxA11yPlugin)

// confusing-browser-globals, inlined: window properties that are almost always a typo when
// used bare (react-app makes them errors)
const restrictedGlobals = [
    'addEventListener', 'blur', 'close', 'closed', 'confirm', 'defaultStatus', 'defaultstatus', 'event',
    'external', 'find', 'focus', 'frameElement', 'frames', 'history', 'innerHeight', 'innerWidth', 'length',
    'location', 'locationbar', 'menubar', 'moveBy', 'moveTo', 'name', 'onblur', 'onerror', 'onfocus', 'onload',
    'onresize', 'onunload', 'open', 'opener', 'opera', 'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset',
    'parent', 'print', 'removeEventListener', 'resizeBy', 'resizeTo', 'screen', 'screenLeft', 'screenTop',
    'screenX', 'screenY', 'scroll', 'scrollbars', 'scrollBy', 'scrollTo', 'scrollX', 'scrollY', 'self', 'status',
    'statusbar', 'stop', 'toolbar', 'top',
]

// Left out of the port on purpose: react-app's formatting rules (dot-location, new-parens,
// no-mixed-operators, rest-spread-spacing, no-whitespace-before-property), which ESLint has
// deprecated in favour of formatters, and no-new-symbol / no-new-object, whose successors
// (no-new-native-nonconstructor / no-object-constructor) are used instead.
const reactAppRules = {
    'array-callback-return': 'warn',
    'default-case': ['warn', { commentPattern: '^no default$' }],
    eqeqeq: ['warn', 'smart'],
    'no-array-constructor': 'warn',
    'no-caller': 'warn',
    'no-cond-assign': ['warn', 'except-parens'],
    'no-const-assign': 'warn',
    'no-control-regex': 'warn',
    'no-delete-var': 'warn',
    'no-dupe-args': 'warn',
    'no-dupe-class-members': 'warn',
    'no-dupe-keys': 'warn',
    'no-duplicate-case': 'warn',
    'no-empty-character-class': 'warn',
    'no-empty-pattern': 'warn',
    'no-eval': 'warn',
    'no-ex-assign': 'warn',
    'no-extend-native': 'warn',
    'no-extra-bind': 'warn',
    'no-extra-label': 'warn',
    'no-fallthrough': 'warn',
    'no-func-assign': 'warn',
    'no-implied-eval': 'warn',
    'no-invalid-regexp': 'warn',
    'no-iterator': 'warn',
    'no-label-var': 'warn',
    'no-labels': ['warn', { allowLoop: true, allowSwitch: false }],
    'no-lone-blocks': 'warn',
    'no-loop-func': 'warn',
    'no-multi-str': 'warn',
    'no-global-assign': 'warn',
    'no-unsafe-negation': 'warn',
    'no-new-func': 'warn',
    'no-new-native-nonconstructor': 'warn',
    'no-object-constructor': 'warn',
    'no-new-wrappers': 'warn',
    'no-obj-calls': 'warn',
    'no-octal': 'warn',
    'no-octal-escape': 'warn',
    'no-redeclare': 'warn',
    'no-regex-spaces': 'warn',
    'no-restricted-syntax': ['warn', 'WithStatement'],
    'no-script-url': 'warn',
    'no-self-assign': 'warn',
    'no-self-compare': 'warn',
    'no-sequences': 'warn',
    'no-shadow-restricted-names': 'warn',
    'no-sparse-arrays': 'warn',
    'no-template-curly-in-string': 'warn',
    'no-this-before-super': 'warn',
    'no-throw-literal': 'warn',
    'no-undef': 'error',
    'no-restricted-globals': ['error', ...restrictedGlobals],
    'no-unreachable': 'warn',
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }],
    'no-unused-labels': 'warn',
    // caughtErrors: 'none' is what ESLint 8 defaulted to, so `catch (e) {}` stays clean as before
    'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true, caughtErrors: 'none' }],
    'no-use-before-define': ['warn', { functions: false, classes: false, variables: false }],
    'no-useless-computed-key': 'warn',
    'no-useless-concat': 'warn',
    'no-useless-constructor': 'warn',
    'no-useless-escape': 'warn',
    'no-useless-rename': ['warn', { ignoreDestructuring: false, ignoreImport: false, ignoreExport: false }],
    'no-with': 'warn',
    'require-yield': 'warn',
    strict: ['warn', 'never'],
    'unicode-bom': ['warn', 'never'],
    'use-isnan': 'warn',
    'valid-typeof': 'warn',
    'no-restricted-properties': [
        'error',
        { object: 'require', property: 'ensure', message: 'Please use import() instead.' },
        { object: 'System', property: 'import', message: 'Please use import() instead.' },
    ],
    'getter-return': 'warn',

    'react/forbid-foreign-prop-types': ['warn', { allowInPropTypes: true }],
    'react/jsx-no-comment-textnodes': 'warn',
    'react/jsx-no-duplicate-props': 'warn',
    'react/jsx-no-target-blank': 'warn',
    'react/jsx-no-undef': 'error',
    'react/jsx-pascal-case': ['warn', { allowAllCaps: true, ignore: [] }],
    'react/jsx-uses-react': 'warn',
    'react/jsx-uses-vars': 'warn',
    'react/no-danger-with-children': 'warn',
    'react/no-direct-mutation-state': 'warn',
    'react/no-is-mounted': 'warn',
    'react/no-typos': 'error',
    'react/require-render-return': 'error',
    'react/style-prop-object': 'warn',

    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/anchor-has-content': 'warn',
    'jsx-a11y/anchor-is-valid': ['warn', { aspects: ['noHref', 'invalidHref'] }],
    'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
    'jsx-a11y/aria-props': 'warn',
    'jsx-a11y/aria-proptypes': 'warn',
    'jsx-a11y/aria-role': ['warn', { ignoreNonDOM: true }],
    'jsx-a11y/aria-unsupported-elements': 'warn',
    'jsx-a11y/heading-has-content': 'warn',
    'jsx-a11y/iframe-has-title': 'warn',
    'jsx-a11y/img-redundant-alt': 'warn',
    'jsx-a11y/no-access-key': 'warn',
    'jsx-a11y/no-distracting-elements': 'warn',
    'jsx-a11y/no-redundant-roles': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'warn',
    'jsx-a11y/role-supports-aria-props': 'warn',
    'jsx-a11y/scope': 'warn',
}

export default [
    { ignores: ['build/**', 'node_modules/**', 'functions/**', 'cypress/results/**', 'cypress/screenshots/**', 'cypress/videos/**'] },
    {
        files: ['**/*.{js,jsx,mjs}'],
        plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.es2021 },
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        settings: { react: { version: 'detect' } },
        // react-app starts from nothing and enables only its own list, so no js.configs.recommended
        // here: the recommended set adds rules the project never ran under.
        rules: reactAppRules,
    },
    // react-app/jest gave test files the Testing Library rules and Jest's; the suite runs on
    // Vitest, so Vitest's plugin stands in for the Jest one.
    {
        files: ['src/**/*.test.{js,jsx}', 'src/setupTests.js', 'src/test/**/*.{js,jsx}'],
        plugins: { 'testing-library': testingLibrary, vitest },
        languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
        rules: { ...testingLibrary.configs['flat/react'].rules, ...vitest.configs.recommended.rules },
    },
    {
        files: ['cypress/**/*.js'],
        ...cypress.configs.recommended,
        languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.mocha, ...cypress.configs.globals.languageOptions.globals } },
        rules: { ...reactAppRules, ...cypress.configs.recommended.rules },
    },
    {
        // Vitest runs without `globals: true`, so Testing Library cannot register its own afterEach
        // cleanup; the manual one in setupTests.js is what keeps tests from seeing each other's DOM.
        files: ['src/setupTests.js'],
        rules: { 'testing-library/no-manual-cleanup': 'off' },
    },
    {
        files: ['vite.config.js', 'eslint.config.js'],
        languageOptions: { globals: { ...globals.node } },
    },
]
