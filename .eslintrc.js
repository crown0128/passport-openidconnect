module.exports = {
    root: true,
    env: {
        es6: true,
        mocha: true,
        node: true,
    },
    globals: {
        expect: "readonly",
    },
    parserOptions: {
        sourceType: "module",
    },
    extends: ["eslint:recommended", "prettier"],
    ignorePatterns: ["node_modules", "build"],
    rules: {
        "no-inner-declarations": "off",
        "no-unused-vars": "warn",
    },
};
