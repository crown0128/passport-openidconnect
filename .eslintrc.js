module.exports = {
    root: true,
    env: {
        chai: true,
        es6: true,
        mocha: true,
        node: true,
    },
    parserOptions: {
        sourceType: "module",
    },
    extends: ["eslint:recommended", "prettier"],
    ignorePatterns: ["node_modules", "build"],
    rules: {
        "no-unused-vars": "warn",
    },
};
