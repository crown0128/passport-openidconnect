var utils = require("../utils");

/**
 * Creates an instance of `SessionStore`.
 *
 * This is the state store implementation for the OIDCStrategy used when
 * the `state` option is enabled.  It generates a random state and stores it in
 * `req.session` and verifies it when the service provider redirects the user
 * back to the application.
 *
 * This state store requires session support.  If no session exists, an error
 * will be thrown.
 *
 * @param {Object} options - config options for session store
 * @param {string} options.key - unique identifier for the session
 *
 * @constructor
 * @public
 */
function SessionStore(options) {
    if (!options.key) {
        throw new TypeError("Session-based state store requires a session key");
    }
    this._key = options.key;
}

/**
 * Store request state.
 *
 * This implementation simply generates a random string and stores the value in
 * the session, where it will be used for verification when the user is
 * redirected back to the application.
 *
 * @param {http.IncomingMessage} req - Request object of the incoming http request
 * @param {SessionContext} ctx - {@link SessionContext}
 * @param {*} appState - additional app state to be stored in session
 * @param {*} meta - metadata of the request. not used.
 * @param {SessionStoreCallback} cb - callback to execute after storing session
 */
SessionStore.prototype.store = function (req, ctx, appState, meta, cb) {
    if (!req.session) {
        return cb(
            new Error(
                "OpenID Connect requires session support. Did you forget to use `express-session` middleware?"
            )
        );
    }

    var key = this._key;
    var handle = utils.uid(24); // uuid state param needed by OIDC auth flow requests.

    var state = { handle: handle };
    if (ctx.maxAge) {
        state.maxAge = ctx.maxAge;
    }
    if (ctx.nonce) {
        state.nonce = ctx.nonce;
    }
    if (ctx.issued) {
        state.issued = ctx.issued;
    }
    if (ctx.verifier) {
        state.verifier = ctx.verifier;
    }

    if (appState) {
        state.state = appState;
    }

    if (!req.session[key]) {
        req.session[key] = {};
    }
    req.session[key].state = state;

    cb(null, handle);
};

/**
 * Callback after session is stored.
 *
 * @callback SessionStoreCallback
 * @param {Error | null} err - Error object if the store function encounters any error, null otherwise.
 * @param {string} [handle] - Generated uuid string that identifies an unique auth session across multiple requests to OIDC provider
 *
 */

/** Session Context
 *
 * @typedef {object} SessionContext
 * @prop {string | Date} [issued]
 * @prop {string} [maxAge]
 * @prop {string} [nonce]
 * @prop {string} [verifier]
 */

/**
 * Verify request state.
 *
 * This implementation simply compares the state parameter in the request to the
 * value generated earlier and stored in the session.
 *
 * @param {http.IncomingMessage} req - Request object of the incoming http request
 * @param {string} reqState - Generated uuid string that identifies a unique auth session across multiple requests to OIDC provider
 * @param {SessionVerifyCallback} cb - callback to execute after storing session
 *
 * @public
 */
SessionStore.prototype.verify = function (req, reqState, cb) {
    if (!req.session) {
        return cb(
            new Error(
                "OpenID Connect requires session support. Did you forget to use `express-session` middleware?"
            )
        );
    }

    var key = this._key;
    if (!req.session[key]) {
        return cb(null, false, {
            message: "Unable to verify authorization request state.",
        });
    }

    var state = req.session[key].state;
    if (!state) {
        return cb(null, false, {
            message: "Unable to verify authorization request state.",
        });
    }

    delete req.session[key].state;
    if (Object.keys(req.session[key]).length === 0) {
        delete req.session[key];
    }

    if (state.handle !== reqState) {
        return cb(null, false, {
            message: "Invalid authorization request state.",
        });
    }

    /** @type {SessionContext} */
    var ctx = {
        maxAge: state.maxAge,
        nonce: state.nonce,
        issued: state.issued,
    };

    if (typeof ctx.issued === "string") {
        // convert issued to a Date object
        ctx.issued = new Date(ctx.issued);
    }
    if (state.verifier) {
        // if pkce verifier string is present
        ctx.verifier = state.verifier;
    }

    return cb(null, ctx, state.state);
};

/**
 * Callback function after verifying a session in store
 *
 * @callback SessionVerifyCallback
 * @param {Error | null} err - Error object if the store function encounters any error, null otherwise.
 * @param {SessionContext | false} [ctx] - {@link SessionContext}
 * @param {*} [state] - Verified session state
 */

// Expose constructor.
module.exports = SessionStore;
