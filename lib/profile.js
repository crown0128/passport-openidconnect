/**
 * User profile parsed from id token claims or userInfo endpoint
 *
 * @typedef {Object} Profile
 * @property {string} id - user id within the OIDC provider for the particular user
 * @property {string} [displayName] - user display name
 * @property {string} [username] - user preferred name
 * @property {Object} [name]
 * @property {string} [name.givenName] - user given name
 * @property {string} [name.familyName] - user family name
 * @property {string} [name.middleName] - user middle name
 * @property {string} [oid] - specific to MS id systems.
 * @property {Object[]} [emails] - emails
 * @property {string} emails[].value
 * @property {string} [emails[].type]
 */
/**
 *
 * @typedef {Object} RawUserInfo
 * @property {*} [_json]
 * @property {*} [_raw]
 */
/** @typedef {Profile & RawUserInfo} MergedProfile */

/**
 * Parses json into a user profile.
 *
 * @param {*} json - json data from OIDC provider
 * @returns {Profile} parsed user profile
 */
exports.parse = function (json) {
    var profile = {};
    profile.id = json.sub;
    // Prior to OpenID Connect Basic Client Profile 1.0 - draft 22, the "sub"
    // claim was named "user_id".  Many providers still use the old name, so
    // fallback to that.
    if (!profile.id) {
        profile.id = json.user_id;
    }

    // to support MS AAD ecosystems object id concept
    if (json.oid) {
        profile.oid = json.oid;
    }

    if (json.name) {
        profile.displayName = json.name;
    }
    if (json.preferred_username) {
        profile.username = json.preferred_username;
    }
    if (json.family_name || json.given_name || json.middle_name) {
        profile.name = {};
        if (json.family_name) {
            profile.name.familyName = json.family_name;
        }
        if (json.given_name) {
            profile.name.givenName = json.given_name;
        }
        if (json.middle_name) {
            profile.name.middleName = json.middle_name;
        }
    }
    if (json.email) {
        profile.emails = [{ value: json.email }];
    }

    return profile;
};
