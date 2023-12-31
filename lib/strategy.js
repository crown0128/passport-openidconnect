/**
 * Module dependencies.
 */
const passport = require("passport-strategy"),
    crypto = require("crypto"),
    url = require("url"),
    util = require("util"),
    utils = require("./utils"),
    OAuth2 = require("oauth").OAuth2,
    Profile = require("./profile"),
    Context = require("./context"),
    SessionStateStore = require("./state/session"),
    AuthorizationError = require("./errors/authorizationerror"),
    TokenError = require("./errors/tokenerror"),
    InternalOAuthError = require("./errors/internaloautherror");

/**
 * Callback for VerifyFunction to return either a valid user profile, false or error
 *
 * @callback VerifyCallback
 * @param {Error | string | null} err
 * @param {*} [user] - user object defined by the app or false if authentication fails at application.
 * @param {*} [info] - optional `info` argument will be passed, containing additional details provided by the strategy's verify callback.
 * @see https://www.passportjs.org/concepts/authentication/strategies/
 */

/**
 * Function to process authenticated info and return a valid user profile via {@link VerifyCallback}
 *
 * @typedef {{
 *  (issuer: string, profile: Profile.Profile, done: VerifyCallback): void;
 *  (issuer: string, profile: Profile.Profile, context: Context.AuthContext, done: VerifyCallback): void;
 *  (issuer: string, profile: Profile.Profile, context: Context.AuthContext, idToken: string, done: VerifyCallback): void;
 *  (issuer: string, profile: Profile.Profile, context: Context.AuthContext, idToken: string, accessToken: string, refreshToken: string, done: VerifyCallback): void;
 *  (issuer: string, profile: Profile.Profile, context: Context.AuthContext, idToken: string, accessToken: string, refreshToken: string, params: any, done: VerifyCallback): void;
 *  (issuer: string, uiProfile: Profile.MergedProfile, idProfile: Profile.Profile, context: Context.AuthContext, idToken: string, accessToken: string, refreshToken: string, params: any, done: VerifyCallback): void;
 *  (req: http.IncomingMessage, issuer: string, profile: Profile.Profile, done: VerifyCallback): void;
 *  (req: http.IncomingMessage, issuer: string, profile: Profile.Profile, context: Context.AuthContext, done: VerifyCallback): void;
 *  (req: http.IncomingMessage, issuer: string, profile: Profile.Profile, context: Context.AuthContext, idToken: string, done: VerifyCallback): void;
 *  (req: http.IncomingMessage, issuer: string, profile: Profile.Profile, context: Context.AuthContext, idToken: string, accessToken: string, refreshToken: string, done: VerifyCallback): void;
 *  (req: http.IncomingMessage, issuer: string, profile: Profile.Profile, context: Context.AuthContext, idToken: string, accessToken: string, refreshToken: string, params: any, done: VerifyCallback): void;
 *  (req: http.IncomingMessage, issuer: string, uiProfile: Profile.MergedProfile, idProfile: Profile.Profile, context: Context.AuthContext, idToken: string, accessToken: string, refreshToken: string, params: any, done: VerifyCallback): void;
 * }} VerifyFunction
 */

/**
 * Callback to determine if loading user profile via /userInfo endpoint should be skipped.
 *
 * @typedef {{
 *  (req: http.IncomingMessage, claims: any): boolean;
 *  (req: http.IncomingMessage, claims: any, done: (err: Error | null, skip?: boolean) => void): void;
 * }} SkipUserProfileFunc
 */

/**
 * Creates an instance of `OpenIDConnectStrategy`.
 *
 * The OpenID Connect authentication strategy authenticates requests using
 * OpenID Connect, which is an identity layer on top of the OAuth 2.0 protocol.
 *
 * @param {Object} options - config params for the passport strategy.
 * @param {string} options.issuer
 * @param {string} options.authorizationURL
 * @param {string} options.tokenURL
 * @param {string} options.callbackURL
 * @param {string} options.userInfoURL
 * @param {string} options.clientID
 * @param {string} options.clientSecret
 * @param {string} [options.acrValues]
 * @param {http.Agent} [options.agent]
 * @param {object} [options.claims]
 * @param {http.OutgoingHttpHeaders} [options.customHeaders]
 * @param {string} [options.display]
 * @param {string} [options.idTokenHint]
 * @param {string} [options.loginHint]
 * @param {string} [options.maxAge]
 * @param {string} [options.prompt]
 * @param {boolean} [options.proxy]
 * @param {string} [options.responseMode]
 * @param {string | string[]} [options.scope]
 * @param {string} [options.uiLocales]
 * @param {boolean} [options.nonce]
 * @param {boolean} [options.passReqToCallback] - If defined, the `Request` object will be passed into {@link VerifyFunction}
 * @param {string} [options.pkce] - defines a PKCE protocol to use. If not defined, PKCE is disabled.
 * @param {string} [options.sessionKey] - unqiue session id for this issuer. If none is given, issuer's hostname is used.
 * @param {SessionStateStore} [options.store] - custom session store instance
 * @param {SkipUserProfileFunc | boolean} [options.skipUserProfile] - determines if user data is loaded from /userInfo endpoint.
 * @param {VerifyFunction} verify - {@link VerifyFunction} callback
 *
 * @see https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
 *
 * @constructor
 */
function Strategy(options, verify) {
    options = options || {};

    if (!verify) {
        throw new TypeError("OpenIDConnectStrategy requires a verify function");
    }
    if (!options.issuer) {
        throw new TypeError("OpenIDConnectStrategy requires an issuer option");
    }
    if (!options.authorizationURL) {
        throw new TypeError(
            "OpenIDConnectStrategy requires an authorizationURL option"
        );
    }
    if (!options.tokenURL) {
        throw new TypeError("OpenIDConnectStrategy requires a tokenURL option");
    }
    if (!options.clientID) {
        throw new TypeError("OpenIDConnectStrategy requires a clientID option");
    }

    passport.Strategy.call(this);
    this.name = "openidconnect";
    this._verify = verify;
    this._passReqToCallback = options.passReqToCallback;

    // NOTE: The _oauth2 property is considered "protected".  Subclasses are
    //       allowed to use it when making protected resource requests to retrieve
    //       the user profile.
    this._oauth2 = new OAuth2(
        options.clientID,
        options.clientSecret,
        "",
        options.authorizationURL,
        options.tokenURL,
        options.customHeaders
    );
    this._oauth2.useAuthorizationHeaderforGET(true);
    if (options.agent) {
        this._oauth2.setAgent(options.agent);
    }

    this._issuer = options.issuer;
    this._callbackURL = options.callbackURL;
    this._scope = options.scope;
    this._responseMode = options.responseMode;
    this._prompt = options.prompt;
    this._trustProxy = options.proxy;
    this._display = options.display;
    this._uiLocales = options.uiLocales;
    this._loginHint = options.loginHint;
    this._maxAge = options.maxAge;
    this._acrValues = options.acrValues;
    this._idTokenHint = options.idTokenHint;
    this._claims = options.claims;
    this._userInfoURL = options.userInfoURL;

    this._nonce = options.nonce;
    this._pkce = options.pkce;

    this._originalReqProp = options.originalReqProp;

    const key =
        options.sessionKey ||
        this.name + ":" + url.parse(options.authorizationURL).hostname;
    this._stateStore = options.store || new SessionStateStore({ key: key });

    // This determine if /userInfo endpoint is called.
    this._skipUserProfile =
        options.skipUserProfile === undefined
            ? function () {
                  if (
                      (options.passReqToCallback && verify.length >= 10) ||
                      (!options.passReqToCallback && verify.length >= 9)
                  ) {
                      return false;
                  }
                  return true;
              }
            : options.skipUserProfile;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request by delegating to OpenID Connect provider.
 *
 * @param {http.IncomingMessage} req - request object of the incoming http message
 * @param {object} options - additional options, supercedes any values pass into the Strategy constructor
 * @param {string} [options.callbackURL]
 * @param {string} [options.display]
 * @param {string} [options.loginHint]
 * @param {string | string[]} [options.scope]
 * @param {*} [options.state]
 *
 * @override
 */
Strategy.prototype.authenticate = function (req, options) {
    options = options || {};
    const self = this;

    if (req.query && req.query.error) {
        if (req.query.error == "access_denied") {
            return this.fail({ message: req.query.error_description });
        } else {
            return this.error(
                new AuthorizationError(
                    req.query.error_description,
                    req.query.error,
                    req.query.error_uri
                )
            );
        }
    }

    let callbackURL = options.callbackURL || self._callbackURL;
    if (callbackURL) {
        const parsed = url.parse(callbackURL);
        if (!parsed.protocol) {
            // The callback URL is relative, resolve a fully qualified URL from the
            // URL of the originating request.
            callbackURL = url.resolve(
                utils.originalURL(req, { proxy: self._trustProxy }),
                callbackURL
            );
        }
    }

    if (req.query && req.query.code) {
        // form the /token request using response from /authorize
        // using the auth code grant flow

        /** @type {SessionStateStore.SessionVerifyCallback} */
        function restored(err, ctx, state) {
            if (err) {
                return self.error(err);
            }
            if (!ctx) {
                return self.fail(state, 403);
            }

            const code = req.query.code;

            const params = { grant_type: "authorization_code" };
            if (callbackURL) {
                params.redirect_uri = callbackURL;
            }

            // add code_verifier param if pkce is enabled
            if (self._pkce) {
                if (!ctx.verifier) {
                    return self.error(
                        new Error(
                            "PKCE flag is defined but verifier string is not found in session ctx"
                        )
                    );
                }
                params.code_verifier = ctx.verifier;
            }

            self._oauth2.getOAuthAccessToken(
                code,
                params,
                function (err, accessToken, refreshToken, params) {
                    if (err) {
                        if (err.statusCode && err.data) {
                            try {
                                console.log(err);
                                const json = JSON.parse(err.data);

                                if (json.error) {
                                    return self.error(
                                        new TokenError(
                                            json.error_description,
                                            json.error,
                                            json.error_uri
                                        )
                                    );
                                }
                                // eslint-disable-next-line no-empty
                            } catch (e) {
                                // trap it here and do nothing to the json parse throws
                                // and let InternalOAuthError return it instead
                            }
                        }
                        return self.error(
                            new InternalOAuthError(
                                "Failed to obtain access token",
                                err
                            )
                        );
                    }

                    const idToken = params["id_token"];
                    if (!idToken) {
                        return self.error(
                            new Error("ID token not present in token response")
                        );
                    }

                    let components = idToken.split("."),
                        payload,
                        claims;

                    try {
                        payload = Buffer.from(components[1], "base64");
                        claims = JSON.parse(payload);
                    } catch (ex) {
                        return self.error(ex);
                    }

                    if (!claims.iss) {
                        return self.error(
                            new Error("ID token missing issuer claim")
                        );
                    }
                    if (!claims.sub) {
                        return self.error(
                            new Error("ID token missing subject claim")
                        );
                    }
                    if (!claims.aud) {
                        return self.error(
                            new Error("ID token missing audience claim")
                        );
                    }
                    if (!claims.exp) {
                        return self.error(
                            new Error("ID token missing expiration time claim")
                        );
                    }
                    if (!claims.iat) {
                        return self.error(
                            new Error("ID token missing issued at claim")
                        );
                    }

                    if (
                        !(
                            typeof claims.aud === "string" ||
                            Array.isArray(claims.aud)
                        )
                    ) {
                        return self.error(
                            new Error(
                                "ID token audience claim not an array or string value"
                            )
                        );
                    }

                    // https://openid.net/specs/openid-connect-basic-1_0.html#IDTokenValidation - check 1.
                    if (claims.iss !== self._issuer) {
                        return self.fail(
                            {
                                message:
                                    "ID token not issued by expected OpenID provider.",
                            },
                            403
                        );
                    }

                    // https://openid.net/specs/openid-connect-basic-1_0.html#IDTokenValidation - checks 2 and 3.
                    if (typeof claims.aud === "string") {
                        if (claims.aud !== self._oauth2._clientId) {
                            return self.fail(
                                {
                                    message:
                                        "ID token not intended for this relying party.",
                                },
                                403
                            );
                        }
                    } else {
                        if (claims.aud.indexOf(self._oauth2._clientId) === -1) {
                            return self.fail(
                                {
                                    message:
                                        "ID token not intended for this relying party.",
                                },
                                403
                            );
                        }
                        if (claims.aud.length > 1 && !claims.azp) {
                            return self.fail(
                                {
                                    message:
                                        "ID token missing authorizied party claim.",
                                },
                                403
                            );
                        }
                    }

                    // https://openid.net/specs/openid-connect-basic-1_0.html#IDTokenValidation - check 4.
                    if (claims.azp && claims.azp !== self._oauth2._clientId) {
                        return self.fail(
                            {
                                message:
                                    "ID token not issued to this relying party.",
                            },
                            403
                        );
                    }

                    // Possible TODO: Add accounting for some clock skew.
                    // https://openid.net/specs/openid-connect-basic-1_0.html#IDTokenValidation - check 5.
                    if (claims.exp <= Date.now() / 1000) {
                        return self.fail(
                            { message: "ID token has expired." },
                            403
                        );
                    }

                    // Note: https://openid.net/specs/openid-connect-basic-1_0.html#IDTokenValidation - checks 6 and 7 are out of scope of this library.

                    // https://openid.net/specs/openid-connect-basic-1_0.html#IDTokenValidation - check 8.
                    if (
                        ctx.maxAge &&
                        (!claims.auth_time ||
                            ctx.issued.valueOf() - ctx.maxAge * 1000 >
                                claims.auth_time * 1000)
                    ) {
                        return self.fail(
                            {
                                message:
                                    "Too much time has elapsed since last authentication.",
                            },
                            403
                        );
                    }

                    if (ctx.nonce && claims.nonce !== ctx.nonce) {
                        return self.fail(
                            { message: "ID token contains invalid nonce." },
                            403
                        );
                    }

                    self._shouldLoadUserProfile(
                        req,
                        claims,
                        function (err, load) {
                            if (err) {
                                return self.error(err);
                            }

                            /**
                             * Callback to handle result from GET /userInfo endpont
                             *
                             * @param {Profile.MergedProfile} [uiProfile]
                             * @param {*} [json]
                             * @param {*} [body]
                             * @returns {void}
                             */
                            function loaded(uiProfile, json, body) {
                                /** @type {VerifyCallback} */
                                function verified(err, user, info) {
                                    if (err) {
                                        return self.error(err);
                                    }
                                    if (!user) {
                                        return self.fail(info);
                                    }

                                    info = info || {};
                                    // return session appState if available
                                    if (state) {
                                        info.state = state;
                                    }
                                    self.success(user, info);
                                } // verified

                                /** @type {Profile.Profile} */
                                const idProfile = Profile.parse(claims);
                                /** @type {Profile.Profile} */
                                let profile = {};
                                utils.merge(profile, idProfile);
                                utils.merge(profile, uiProfile);

                                if (uiProfile) {
                                    uiProfile._raw = body;
                                    uiProfile._json = json;
                                }

                                const context = Context.parse(claims); // nothing from id token for this.

                                try {
                                    if (self._passReqToCallback) {
                                        const arity = self._verify.length;
                                        if (arity == 10) {
                                            self._verify(
                                                req,
                                                claims.iss,
                                                uiProfile,
                                                idProfile,
                                                context,
                                                idToken,
                                                accessToken,
                                                refreshToken,
                                                params,
                                                verified
                                            );
                                        } else if (arity == 9) {
                                            self._verify(
                                                req,
                                                claims.iss,
                                                profile,
                                                context,
                                                idToken,
                                                accessToken,
                                                refreshToken,
                                                params,
                                                verified
                                            );
                                        } else if (arity == 8) {
                                            self._verify(
                                                req,
                                                claims.iss,
                                                profile,
                                                context,
                                                idToken,
                                                accessToken,
                                                refreshToken,
                                                verified
                                            );
                                        } else if (arity == 6) {
                                            self._verify(
                                                req,
                                                claims.iss,
                                                profile,
                                                context,
                                                idToken,
                                                verified
                                            );
                                        } else if (arity == 5) {
                                            self._verify(
                                                req,
                                                claims.iss,
                                                profile,
                                                context,
                                                verified
                                            );
                                        } else {
                                            // arity == 4
                                            self._verify(
                                                req,
                                                claims.iss,
                                                profile,
                                                verified
                                            );
                                        }
                                    } else {
                                        const arity = self._verify.length;
                                        if (arity == 9) {
                                            self._verify(
                                                claims.iss,
                                                uiProfile,
                                                idProfile,
                                                context,
                                                idToken,
                                                accessToken,
                                                refreshToken,
                                                params,
                                                verified
                                            );
                                        } else if (arity == 8) {
                                            self._verify(
                                                claims.iss,
                                                profile,
                                                context,
                                                idToken,
                                                accessToken,
                                                refreshToken,
                                                params,
                                                verified
                                            );
                                        } else if (arity == 7) {
                                            self._verify(
                                                claims.iss,
                                                profile,
                                                context,
                                                idToken,
                                                accessToken,
                                                refreshToken,
                                                verified
                                            );
                                        } else if (arity == 5) {
                                            self._verify(
                                                claims.iss,
                                                profile,
                                                context,
                                                idToken,
                                                verified
                                            );
                                        } else if (arity == 4) {
                                            self._verify(
                                                claims.iss,
                                                profile,
                                                context,
                                                verified
                                            );
                                        } else {
                                            // arity == 3
                                            self._verify(
                                                claims.iss,
                                                profile,
                                                verified
                                            );
                                        }
                                    }
                                } catch (ex) {
                                    return self.error(ex);
                                }
                            } // loaded

                            if (!load) {
                                return loaded();
                            }

                            self._oauth2.get(
                                self._userInfoURL,
                                accessToken,
                                function (err, body, res) {
                                    if (err) {
                                        return self.error(
                                            new InternalOAuthError(
                                                "Failed to fetch user profile",
                                                err
                                            )
                                        );
                                    }

                                    let json;
                                    try {
                                        json = JSON.parse(body);
                                    } catch (ex) {
                                        return self.error(
                                            new Error(
                                                "Failed to parse user profile"
                                            )
                                        );
                                    }

                                    /** @type {Profile.Profile} */
                                    const uiProfile = Profile.parse(json);
                                    loaded(uiProfile, json, body);
                                }
                            );
                        }
                    ); // self._shouldLoadUserProfile
                }
            ); // oauth2.getOAuthAccessToken
        } // restored

        const state = req.query.state;
        try {
            self._stateStore.verify(req, state, restored);
        } catch (ex) {
            return self.error(ex);
        }
    } else {
        // form the /authorize request
        const params = this.authorizationParams(options);
        params.response_type = "code";
        if (this._responseMode) {
            params.response_mode = this._responseMode;
        }
        params.client_id = this._oauth2._clientId;
        if (callbackURL) {
            params.redirect_uri = callbackURL;
        }
        let scope = options.scope || this._scope;
        if (scope) {
            if (typeof scope == "string") {
                scope = scope.split(" ");
            }
            if (Array.isArray(scope)) {
                // fix duplicated 'openid' entries in scope
                if (!scope.includes("openid")) {
                    scope.unshift("openid");
                }
                params.scope = scope.join(" ");
            }
        } else {
            params.scope = "openid";
        }

        const prompt = options.prompt || this._prompt;
        if (prompt) {
            params.prompt = prompt;
        }
        const display = options.display || this._display;
        if (display) {
            params.display = display;
        }
        const uiLocales = this._uiLocales;
        if (uiLocales) {
            params.ui_locales = uiLocales;
        }
        const loginHint = options.loginHint || this._loginHint;
        if (loginHint) {
            params.login_hint = loginHint;
        }
        const maxAge = this._maxAge;
        if (maxAge) {
            params.max_age = maxAge;
        }
        const acrValues = this._acrValues;
        if (acrValues) {
            params.acr_values = acrValues;
        }
        const idTokenHint = this._idTokenHint;
        if (idTokenHint) {
            params.id_token_hint = idTokenHint;
        }
        const nonce = this._nonce;
        if (nonce) {
            params.nonce = utils.uid(20);
        }
        const claims = this._claims;
        if (claims) {
            params.claims = JSON.stringify(claims);
        }

        /** @type {SessionStateStore.SessionContext} */
        const ctx = {};
        if (params.max_age) {
            ctx.maxAge = params.max_age;
            ctx.issued = new Date();
        }
        if (params.nonce) {
            ctx.nonce = params.nonce;
        }

        const state = options.state;

        // generate pkce params if enabled
        const pkce = this._pkce;
        if (pkce) {
            const verifier = crypto.pseudoRandomBytes(32).toString("base64url");

            if (pkce === "S256") {
                params.code_challenge = crypto
                    .createHash("sha256")
                    .update(verifier)
                    .digest()
                    .toString("base64url");
            } else if (pkce === "plain") {
                params.code_challenge = verifier;
            } else {
                return self.error(
                    new Error(
                        "Unsupported code verifier transformation method: " +
                            pkce
                    )
                );
            }
            params.code_challenge_method = "S256";
            ctx.verifier = verifier;
        }

        /**
         * After session is stored, process the `/authorize` HTTP call to OP
         * @type {SessionStateStore.SessionStoreCallback}
         */
        function stored(err, handle) {
            if (err) {
                return self.error(err);
            }
            if (!handle) {
                return self.error(
                    new Error(
                        "OpenID Connect state store did not yield state for authentication request"
                    )
                );
            }

            params.state = handle;
            const parsed = url.parse(self._oauth2._authorizeUrl, true);

            utils.merge(parsed.query, params);
            delete parsed.search;
            const location = url.format(parsed);
            self.redirect(location);
        } // stored

        try {
            this._stateStore.store(req, ctx, state, stored);
        } catch (ex) {
            return this.error(ex);
        }
    }
};

/**
 * Return extra parameters to be included in the authorization request.
 *
 * Some OpenID Connect providers allow additional, non-standard parameters to be
 * included when requesting authorization.  Since these parameters are not
 * standardized by the OpenID Connect specification, OpenID Connect-based
 * authentication strategies can overrride this function in order to populate
 * these parameters as required by the provider.
 *
 * @param {Object} options
 * @return {Object}
 * @api protected
 */
Strategy.prototype.authorizationParams = function (options) {
    return {};
};

/**
 * Check if should load user profile, contingent upon options.
 *
 * @param {http.IncomingMessage} req
 * @param {string} claims
 * @param {LoadUserProfileCallback} done
 * @api private
 */
Strategy.prototype._shouldLoadUserProfile = function (req, claims, done) {
    if (
        typeof this._skipUserProfile == "function" &&
        this._skipUserProfile.length > 2
    ) {
        // async
        this._skipUserProfile(req, claims, function (err, skip) {
            if (err) {
                return done(err);
            }
            if (!skip) {
                return done(null, true);
            }
            return done(null, false);
        });
    } else {
        const skip =
            typeof this._skipUserProfile == "function"
                ? this._skipUserProfile(req, claims)
                : this._skipUserProfile;
        if (!skip) {
            return done(null, true);
        }
        return done(null, false);
    }
};

/**
 * @callback LoadUserProfileCallback
 * @param {http.IncomingMessage} req
 * @param {boolean} skip
 * @return {void}
 */

/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
