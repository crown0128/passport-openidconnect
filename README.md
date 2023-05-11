# Passport OpenID Connect

> **Note**: Fork of [Jared Hansen's Passport](https://www.passportjs.org/) strategy for authenticating with [OpenID Connect](https://openid.net/connect/).

[![npm (scoped)](https://img.shields.io/npm/v/@techpass/passport-openidconnect?color=blue)](https://www.npmjs.com/package/@techpass/passport-openidconnect)

This module lets you authenticate using OpenID Connect in your Node.js applications. By plugging into Passport, OpenID Connect-based sign in can be easily and unobtrusively integrated into any application or framework that supports [Connect](https://github.com/senchalabs/connect#readme)-style middleware, including [Express](https://expressjs.com/).

## Install

```sh
npm install @techpass/passport-openidconnect
```

> If you are coding in typescript, this library has native typings support. But you may need to install type definitions for `express` and `passport-strategy` separately as there is a dependency on them.
>
> To install these typings from the [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) project run: `npm i -D @types/express @types/passport-strategy`.

## Usage

### Configure Strategy

The OpenID Connect authentication strategy authenticates users using their account at an OpenID Provider (OP). The strategy needs to be configured with the provider's endpoints, in order to function properly. Consult the provider's documentation for the locations of these endpoints and instructions on how to register a client.

The `Strategy` constructor takes in the following options:

```js
/**
 * Options available to pass into Strategy constructor during instantiation.
 *
 * @see https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
 */
interface StrategyOptions {
  issuer: string;
  authorizationURL: string;
  tokenURL: string;
  callbackURL: string;
  userInfoURL: string;
  clientID: string;
  clientSecret: string;
  acrValues?: string;
  claims?: object;
  customHeaders?: OutgoingHttpHeaders;
  display?: string;
  idTokenHint?: string;
  loginHint?: string;
  maxAge?: string;
  prompt?: string;
  proxy?: boolean;
  responseMode?: string;
  scope?: string | string[];
  uiLocales?: string;

  /**
   * If defined, an internally generated nonce will be added to the client request to mitigate replay attacks.
   *
   * @see https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes
   */
  nonce?: boolean;
  /**
   * Http client agent. If undefined, the default node agent is used.
   *
   * @see https://nodejs.org/api/http.html#class-httpagent
   */
  agent?: Agent;
  /**
   * If defined, the {@link express.Request | Request} object will be passed into {@link VerifyFunction}
   */
  passReqToCallback?: boolean;
  /**
   * Defines a PKCE protocol to use. If undefined, PKCE is not used.
   *
   * @see https://oauth.net/2/pkce/
   */
  pkce?: "S256" | "plain";
  /**
   * Unique session identifier for this issuer.
   * If none is given, the issuer's hostname will be used.
   */
  sessionKey?: string;
  /**
   * Custom session store instance with interface compliant to {@link SessionStore}.
   * If undefined, the internal store will be used.
   */
  store?: SessionStore;
  /**
   * Determines if user data is loaded from /userInfo endpoint. If not specified, loading of userInfo
   * is decided by arity of {@link VerifyFunction} and value of `passReqToCallback`
   */
  skipUserProfile?:
    | boolean
    | ((
        req: express.Request,
        claims: any,
        done: (err: Error | null, skip: boolean) => void
      ) => void)
    | ((req: express.Request, claims: any) => boolean);
}
```

### Verify Function

The strategy constructor also takes a `verify` function as an argument, which is responsible for processing the authenticated user info that the OP returns.

The function accepts `issuer`, `profile` and `done` callback as arguments. `issuer` is set to an identifier for the OP and `profile` contains the user's [profile information](https://www.passportjs.org/reference/normalized-profile/) stored in their account at the OP.

The `done` [callback](./lib/strategy.js#L20) is invoked to end processing for the middleware and return either an error a user object that is local to the application together with any additional auth info.

> Depending on `skipUserProfile` and arity of `verify` function, the returning `profile` may contain:
>
> - data parse from id_token claim
> - merge data from both id_token claim & userInfo endpoint
>
> Instead of a single `profile` instance, you can get the strategy to return profile from id_token and userInfo endpoint separately. They will return as `idProfile` and `uiProfile`.
>
> Check out the [overloads](./lib/strategy.js#L43) available for the function in the code for more info.

Typically, when the account is logging in for the first time, a new user record is created in the application. On subsequent logins, the existing user record will be found via its relation to the OP account.

Because the `verify` function is supplied by the application, the app is free to use any database of its choosing. The example below illustrates usage of a SQL database.

```js
const OpenIDConnectStrategy = require("@techpass/passport-openidconnect");

passport.use(
  new OpenIDConnectStrategy(
    {
      issuer: "https://server.example.com",
      authorizationURL: "https://server.example.com/authorize",
      tokenURL: "https://server.example.com/token",
      userInfoURL: "https://server.example.com/userinfo",
      clientID: process.env["CLIENT_ID"],
      clientSecret: process.env["CLIENT_SECRET"],
      callbackURL: "https://client.example.org/cb",
    },
    function verify(issuer, profile, done) {
      db.get(
        "SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?",
        [issuer, profile.id],
        function (err, cred) {
          if (err) {
            return done(err);
          }

          if (!cred) {
            // The account at the OpenID Provider (OP) has not logged in to this app
            // before.  Create a new user account and associate it with the account
            // at the OP.
            db.run(
              "INSERT INTO users (name) VALUES (?)",
              [profile.displayName],
              function (err) {
                if (err) {
                  return done(err);
                }

                var id = this.lastID;
                db.run(
                  "INSERT INTO federated_credentials (user_id, provider, subject) VALUES (?, ?, ?)",
                  [id, issuer, profile.id],
                  function (err) {
                    if (err) {
                      return done(err);
                    }
                    var user = {
                      id: id,
                      name: profile.displayName,
                    };
                    return done(null, user);
                  }
                );
              }
            );
          } else {
            // The account at the OpenID Provider (OP) has previously logged in to
            // the app.  Get the user account associated with the account at the OP
            // and log the user in.
            db.get(
              "SELECT * FROM users WHERE id = ?",
              [cred.user_id],
              function (err, row) {
                if (err) {
                  return done(err);
                }
                if (!row) {
                  return done(null, false);
                }
                return done(null, row);
              }
            );
          }
        }
      );
    }
  )
);
```

### Define Routes

Two routes are needed in order to allow users to log in with their account at an OP. The first route redirects the user to the OP, where they will authenticate:

```js
app.get("/login", passport.authenticate("openidconnect"));
```

The second route processes the authentication response and logs the user in, when the OP redirects the user back to the app:

```js
app.get(
  "/cb",
  passport.authenticate("openidconnect", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  function (req, res) {
    res.redirect("/");
  }
);
```

## Examples

- [todos-express-openidconnect](https://github.com/passport/todos-express-openidconnect)

  Illustrates how to use the OpenID Connect strategy within an Express application.

- [todos-express-auth0](https://github.com/passport/todos-express-auth0)

  Illustrates how to use the OpenID Connect strategy to integrate with [Auth0](https://auth0.com/) in an Express application. For developers new to Passport and getting started, a [tutorial](https://www.passportjs.org/tutorials/auth0/) is available.

## Changelog

See [CHANGELOG](./CHANGELOG.md).

## Credits

- Original Author: [Jared Hansen](http://github.com/jaredhanson)
- Fork Contributor(s): [GovTechSG](https://github.com/GovTechSG)

## License

See [LICENSE](./LICENSE) for more info.
