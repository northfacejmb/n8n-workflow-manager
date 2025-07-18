module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Add any specific rules you want to enforce
    'no-console': 'off', // Allow console.log in CLI tools
    'no-unused-vars': 'warn',
  },
}; 