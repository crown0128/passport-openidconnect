/// <reference types="passport-strategy"/>
/// <reference types="express"/>

import passportStrategy = require("passport-strategy");
import express = require("express");
import { OAuth2 } from "oauth";
import { Agent, OutgoingHttpHeaders } from "http";

/**
 * The OpenID Connect authentication strategy authenticates requests using
 * OpenID Connect, which is an identity layer on top of the OAuth 2.0 protocol.
 *
 * Extends passport-strategy
 */
declare class OpenIDConnectStrategy extends passportStrategy.Strategy {
    name: string;

    /**
     * `_oauth2` property is considered "protected".
     *
     * Subclasses are allowed to use it when making protected resource requests to retrieve
     * the user profile.
     */
    protected _oauth2: OAuth2;

    /**
     * Creates an instance of `OpenIDConnectStrategy`.
     *
     * @param options - constructor {@link OpenIDConnectStrategy.StrategyOptions | options}.
     * @param verify - {@link OpenIDConnectStrategy.VerifyFunction | callback} to verify response from OIDC provider.
     */
    constructor(
        options: OpenIDConnectStrategy.StrategyOptions,
        verify: OpenIDConnectStrategy.VerifyFunction
    );
    /**
     * Authenticate request by delegating to OpenID Connect provider.
     *
     * @param req - request object of the incoming http message
     * @param options - additional options
     */
    authenticate(
        req: express.Request,
        options?: OpenIDConnectStrategy.AuthenticateOptions
    ): any;

    /**
     * Return extra parameters to be included in the authorization request.
     *
     * @remarks
     * Some OpenID Connect providers allow additional, non-standard parameters to be
     * included when requesting authorization.  Since these parameters are not
     * standardized by the OpenID Connect specification, OpenID Connect-based
     * authentication strategies can overrride this function in order to populate
     * these parameters as required by the provider.
     *
     * @param options
     */
    authorizationParams(options?: any): object;
}

declare namespace OpenIDConnectStrategy {
    type Strategy = OpenIDConnectStrategy;
    const Strategy: typeof OpenIDConnectStrategy;

    interface SessionStoreContext {
        issued?: string | undefined;
        maxAge?: number | undefined;
        nonce?: string | undefined;
    }

    /**
     * Callback function to pass into {@link SessionStore.store | SessionStore.store()}
     *
     * @param err - Error object if the store function encounters any error, null otherwise.
     * @param handle - Generated uuid string that identifies an unique auth session across multiple requests to OIDC provider
     *
     */
    type SessionStoreCallback = (err: Error | null, handle?: string) => void;

    /**
     * Callback function to pass into {@link SessionStore.verify | SessionStore.verify()}
     *
     * @param err - Error object if the store function encounters any error, null otherwise.
     * @param ctx - Auth session context
     * @param state - Verified session state
     */
    type SessionVerifyCallback = (
        err: Error | null,
        ctx?: false | SessionStoreContext,
        state?: any
    ) => void;

    /**
     * This is the state store implementation for the OIDCStrategy used when
     * the `state` option is enabled.  It generates a random state and stores it in
     * `req.session` and verifies it when the service provider redirects the user
     * back to the application.
     *
     * This state store requires session support.  If no session exists, an error
     * will be thrown.
     */
    class SessionStore {
        /**
         * Creates an instance of `SessionStore`.
         *
         * @param options - config options for session store
         */
        constructor(options: { key: string });

        /**
         * Store request state.
         *
         * This implementation simply generates a random string and stores the value in
         * the session, where it will be used for verification when the user is
         * redirected back to the application.
         *
         * @param req - Request object of the incoming http request
         * @param ctx - {@link SessionStoreContext} info
         * @param appState - additional app state to be stored in session
         * @param meta - metadata of the request
         * @param cb - {@link SessionStoreCallback} to execute after storing session
         */
        store(
            req: express.Request,
            ctx: SessionStoreContext,
            appState?: object | undefined,
            meta?: any,
            cb: SessionStoreCallback
        ): void;

        /**
         * Verify request state.
         *
         * This implementation simply compares the state parameter in the request to the
         * value generated earlier and stored in the session.
         *
         * @param req - Request object of the incoming http request
         * @param reqState - Generated uuid string that identifies a unique auth session across multiple requests to OIDC provider
         * @param cb - {@link SessionVerifyCallback} to execute after storing session
         */
        verify(
            req: express.Request,
            reqState: string,
            cb: SessionVerifyCallback
        ): void;
    }

    /**
     * Options available to pass into {@link OpenIDConnectStrategy} during instantiation.
     * Majority of these parameters adhere to the OAuth2 Auth Code Flow spec.
     *
     * @see https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth
     */
    interface StrategyOptions {
        issuer: string;
        authorizationURL: string;
        tokenURL: string;
        callbackURL: string;
        userInfoURL: string;
        clientID: string;
        clientSecret: string;

        acrValues?: string | undefined;
        agent?: boolean | Agent | undefined;
        claims?: object | undefined;
        customHeaders?: OutgoingHttpHeaders | undefined;
        display?: string | undefined;
        idTokenHint?: string | undefined;
        loginHint?: string | undefined;
        maxAge?: string | undefined;
        nonce?: string | undefined;
        prompt?: string | undefined;
        proxy?: boolean | undefined;
        responseMode?: string | undefined;
        scope?: string | string[] | undefined;
        uiLocales?: string | undefined;

        /**
         * If defined, the {@link express.Request | Request} object will be passed into {@link VerifyFunction}
         */
        passReqToCallback?: boolean | undefined;
        /**
         * Defines which PKCE protocol to use. If undefined, PKCE is not used.
         *
         * @see https://oauth.net/2/pkce/
         */
        pkce?: "S256" | "plain" | undefined;
        /**
         * Unique session identifier for this particular provider.
         * If none is given, the provider's hostname will be used.
         */
        sessionKey?: string | undefined;
        /**
         * Session store instance with interface compliant to {@link SessionStore}
         */
        store?: SessionStore | undefined;
        /**
         * If defined, skips the loading of the user profile
         */
        skipUserProfile?: boolean | undefined;
    }

    type VerifyCallback = (
        err?: Error | null,
        user?: express.User,
        info?: any
    ) => void;

    type JwtToken = string | { [key: string]: unknown };

    type VerifyFunction =
        | ((issuer: string, profile: Profile, done: VerifyCallback) => void)
        | ((
              issuer: string,
              profile: Profile,
              context: object,
              done: VerifyCallback
          ) => void)
        | ((
              issuer: string,
              profile: Profile,
              context: object,
              idToken: string | object,
              done: VerifyCallback
          ) => void)
        | ((
              issuer: string,
              profile: Profile,
              context: object,
              idToken: string | object,
              accessToken: string | object,
              refreshToken: string,
              done: VerifyCallback
          ) => void)
        | ((
              issuer: string,
              profile: Profile,
              context: object,
              idToken: string | object,
              accessToken: string | object,
              refreshToken: string,
              params: any,
              done: VerifyCallback
          ) => void)
        | ((
              issuer: string,
              uiProfile: object,
              idProfile: object,
              context: object,
              idToken: string | object,
              accessToken: string | object,
              refreshToken: string,
              params: any,
              done: VerifyCallback
          ) => void)
        | ((
              req: Request,
              issuer: string,
              profile: Profile,
              done: VerifyCallback
          ) => void)
        | ((
              req: Request,
              issuer: string,
              profile: Profile,
              context: object,
              done: VerifyCallback
          ) => void)
        | ((
              req: Request,
              issuer: string,
              profile: Profile,
              context: object,
              idToken: string | object,
              done: VerifyCallback
          ) => void)
        | ((
              req: Request,
              issuer: string,
              profile: Profile,
              context: object,
              idToken: string | object,
              accessToken: string | object,
              refreshToken: string,
              done: VerifyCallback
          ) => void)
        | ((
              req: Request,
              issuer: string,
              profile: Profile,
              context: object,
              idToken: string | object,
              accessToken: string | object,
              refreshToken: string,
              params: any,
              done: VerifyCallback
          ) => void)
        | ((
              req: Request,
              issuer: string,
              uiProfile: object,
              idProfile: object,
              context: object,
              idToken: string | object,
              accessToken: string | object,
              refreshToken: string,
              params: any,
              done: VerifyCallback
          ) => void);

    /**
     * Authenticated user's profile
     */
    interface Profile extends passportStrategy.Profile {
        /**
         * Profile's object id within idp store.
         */
        oid?: string;
    }

    /**
     * Options available to pass {@link OpenIDConnectStrategy.authenticate | Strategy.autheticate()}
     */
    interface AuthenticateOptions {
        callbackURL?: string | undefined;
        display?: string | undefined;
        loginHint?: string | undefined;
        prompt?: string | undefined;
        scope?: string | string[] | undefined;
        state?: object | undefined;
    }

    /**
     * AuthorizationError represents an error in response to an authorization
     * request.  For details, refer to RFC 6749, section 4.1.2.1.
     *
     * References:
     *   - [The OAuth 2.0 Authorization Framework](http://tools.ietf.org/html/rfc6749)
     *
     */
    class AuthorizationError extends Error {
        code: string;
        uri?: string | undefined;
        status: number;

        /**
         * Constructs an AuthorizationError instance
         *
         * @param message - error message
         * @param code - error code
         * @param uri - error uri
         * @param status - error status code
         */
        constructor(code: string, uri?: string, status?: number);
    }

    /**
     * TokenError represents an error received from a token endpoint.  For details,
     * refer to RFC 6749, section 5.2.
     *
     * References:
     *   - [The OAuth 2.0 Authorization Framework](http://tools.ietf.org/html/rfc6749)
     *
     */
    class TokenError extends Error {
        code: string;
        uri?: string | undefined;
        status?: number;

        /**
         * Constructs a TokenError instance
         *
         * @param message - error message
         * @param code - error code
         * @param uri - error uri
         * @param status - error status code
         */
        constructor(
            message: string,
            code?: string,
            uri?: string,
            status?: number
        );
    }

    /**
     * InternalOAuthError wraps errors generated by node-oauth.  By wrapping these
     * objects, error messages can be formatted in a manner that aids in debugging
     * OAuth issues.
     *
     */
    class InternalOAuthError extends Error {
        oauthError?: { statusCode?: number; data?: any };

        /**
         * Construccts an InternalOAuthError instance
         *
         * @param message - error message
         * @param err - error object
         */
        constructor(message: string, err: Error);

        toString(): string;
    }
}

export = OpenIDConnectStrategy;
