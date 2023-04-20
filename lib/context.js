/**
 * Auth Context
 * @typedef AuthContext
 * @prop {Date} [auth_time]
 * @prop {string} [class]
 * @prop {string} [methods]
 */

/**
 * Extracts the contextual info about the auth request
 *
 * @param {*} json
 * @returns {AuthContext}
 */
exports.parse = function (json) {
    var context = {};
    if (json.auth_time) {
        context.timestamp = new Date(json.auth_time * 1000);
    }
    if (json.acr) {
        context.class = json.acr;
    }
    if (json.amr) {
        context.methods = json.amr;
    }

    return context;
};
