module.exports = {
    env: {
        'browser': true,
        'es6': true,
        'node': true
    },
    parser: '@typescript-eslint/parser',
    extends:  [
        'plugin:@typescript-eslint/recommended',
        'eslint:recommended'
    ],
    parserOptions:  {
        ecmaVersion:  2018,  // Allows for the parsing of modern ECMAScript features
        sourceType:  'module',  // Allows for the use of imports
        project: './tsconfig.json'
    },
    rules:  {
        'no-var': 'error',
        'linebreak-style': [
            'error',
            'unix'
        ],
        'no-undef': 0,
        'no-unused-vars':0,
        //'no-multi-spaces': ['error'], // ovo mora da se iskljuci zbog imports
        'block-spacing': ['error', 'always'],
        'space-before-blocks': ['error', 'always'],
        'space-before-function-paren': [
            'error',
            {
                'anonymous': 'never',
                'named': 'always',
                'asyncArrow': 'always'
            }
        ],
        'no-whitespace-before-property': ['error'],
        'func-call-spacing': ['error', 'never'],
        'keyword-spacing': [
            'error',
            {
                'overrides':
                    {
                        'if': {'after': true},
                        'for': {'after': true},
                        'while': {'after': true},
                        'switch': {'after': true}
                    }
            }
        ],
        'spaced-comment': ['error', 'always'],
        'space-unary-ops': [
            'error',
            {
                'words': true,
                'nonwords': false,
                'overrides': {
                    'void': false,

                }
            }
        ],
        'space-infix-ops': 'error',
        'arrow-spacing': [
            'error',
            {
                'before': true,
                'after': true
            }
        ],
        'array-bracket-spacing': ['error', 'never'],
        'padding-line-between-statements': [
            'error',
            {blankLine: 'always', prev: '*', next: 'class'},
            {blankLine: 'always', prev: '*', next: 'cjs-export'},
            {blankLine: 'always', prev: 'directive', next: '*'},
        ],
        'function-paren-newline': ['error', 'never'],
        'no-multiple-empty-lines': [
            'error',
            {
                'max': 1
            }
        ],
        'curly': ['error', 'all'],
        'no-control-regex': 1, //	disallow control characters in regular expressions
        'newline-per-chained-call': 1,
        'no-useless-escape': 1,
        'no-cond-assign': 'error',
        'no-console': 'off',
        'react/prop-types': 0,
        '@typescript-eslint/indent': [
            'error',
            4,
            {
                'ignoreComments': true,
                'FunctionExpression': {
                    'body': 1,
                    'parameters': 'off'
                },
                'CallExpression': {
                    'arguments': 'off'
                },
                'ObjectExpression': 1,
                'ArrayExpression': 1,
                'SwitchCase': 1,
                'ImportDeclaration': 1,
                'VariableDeclarator': {'var': 2, 'let': 2, 'const': 3},
                'MemberExpression': 1,
                'outerIIFEBody': 1
            }
        ],
        '@typescript-eslint/quotes': ['error', 'single'],
        '@typescript-eslint/semi': ['error', 'never'],
        '@typescript-eslint/camelcase': [
            'error',
            {
                'properties': 'never'
            }
        ],
        '@typescript-eslint/brace-style': [
            'error',
            '1tbs'
        ],
        '@typescript-eslint/no-inferrable-types': 0,
        '@typescript-eslint/consistent-type-assertions': 0,
        '@typescript-eslint/class-name-casing': 0,
        '@typescript-eslint/func-call-spacing': ['error', 'never'],
        '@typescript-eslint/interface-name-prefix': [
            'error',
            {
                'prefixWithI': 'always'
            }
        ],
        '@typescript-eslint/no-array-constructor': 'error',
        '@typescript-eslint/no-empty-function': ['error'],
        '@typescript-eslint/no-empty-interface': 0,
        '@typescript-eslint/no-for-in-array': 1,
        '@typescript-eslint/no-non-null-assertion': 1,
        '@typescript-eslint/no-require-imports': 1,
        '@typescript-eslint/no-use-before-define': 0,
        '@typescript-eslint/prefer-function-type': 1,
        '@typescript-eslint/prefer-regexp-exec': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/require-await': 0,
        '@typescript-eslint/restrict-plus-operands': 'error',
        "@typescript-eslint/member-delimiter-style": 0,
        '@typescript-eslint/type-annotation-spacing': [
            'error',
            {
                'before': false,
                'after': true
            }
        ],
        '@typescript-eslint/unified-signatures': 1
    }
}
