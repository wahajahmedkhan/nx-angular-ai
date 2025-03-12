import nx from '@nx/eslint-plugin';
import unusedImports from 'eslint-plugin-unused-imports';
import angularEslint from '@angular-eslint/eslint-plugin';
import angularEslintTemplate from '@angular-eslint/eslint-plugin-template';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/.angular/cache/**',
      '**/coverage',
      '**/tmp',
    ],
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // '@typescript-eslint/no-unused-vars': 'warn', // Unused variables - changed to warning
      // 'unused-imports/no-unused-imports': 'warn', // Unused imports - changed to warning
      // 'no-console': 'warn', // Console statements - changed to warning
      'no-debugger': 'error', // Debugger statements ko block karega
      'prefer-const': 'error', // `const` use karne ko encourage karega
    },
  },
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    plugins: {
      '@angular-eslint': angularEslint,
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component'] }],
      '@angular-eslint/use-lifecycle-interface': 'error', // Lifecycle interfaces ko enforce karega
      '@angular-eslint/no-output-on-prefix': 'error', // `on` prefix ko block karega
      '@angular-eslint/no-input-rename': 'error', // Input renaming ko block karega
      
      // New modern Angular rules - Rule 2: Standalone Components
      '@angular-eslint/prefer-standalone': 'warn', // Enforce standalone components instead of NgModules
      
      // New modern Angular rules - Rule 5: OnPush Change Detection
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn', // Enforce OnPush change detection
    },
  },
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angularEslintTemplate,
    },
    rules: {
      '@angular-eslint/template/no-negated-async': 'error', // Negated async pipe ko block karega
      '@angular-eslint/template/cyclomatic-complexity': ['warn', { maxComplexity: 10 }], // Template complexity ko limit karega - increased limit and changed to warning
      '@angular-eslint/template/no-call-expression': 'warn', // Template mein method calls ko block karega - changed to warning
      
      // New modern Angular rules - Rule 1: Self-closing Tags
      '@angular-eslint/template/prefer-self-closing-tags': 'warn', // Enforce self-closing tags
      
      // New modern Angular rules - Rule 3: Optimized Images
      '@angular-eslint/template/prefer-ngsrc': 'warn', // Enforce NgOptimizedImage directive
      
      // New modern Angular rules - Rule 4: Control Flow
      '@angular-eslint/template/prefer-control-flow': 'warn', // Enforce built-in control flow syntax
    },
  },
];