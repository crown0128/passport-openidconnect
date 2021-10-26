var Strategy = require('../lib/strategy')
  , chai = require('chai')
  , uri = require('url')
  , qs = require('querystring');

describe('Strategy', function() {
  
  describe('#authenticate', function() {
  
    it('should redirect with scope as array', function(done) {
      var strategy = new Strategy({
        issuer: 'https://server.example.com',
        authorizationURL: 'https://server.example.com/authorize',
        tokenURL: 'https://server.example.com/token',
        clientID: 's6BhdRkqt3',
        clientSecret: 'some_secret12345',
        callbackURL: 'https://client.example.org/cb'
      }, function() {});
  
      chai.passport.use(strategy)
        .request(function(req) {
          req.session = {};
        })
        .redirect(function(url) {
          var l = uri.parse(url, true);
          var state = l.query.state;
        
          expect(url).to.equal('https://server.example.com/authorize?response_type=code&client_id=s6BhdRkqt3&redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb&scope=openid%20profile%20email&state=' + encodeURIComponent(state));
          expect(state).to.have.length(24);
          expect(this.session['openidconnect:server.example.com'].state).to.deep.equal({
            handle: state,
            issuer: 'https://server.example.com',
            authorizationURL: 'https://server.example.com/authorize',
            tokenURL: 'https://server.example.com/token',
            userInfoURL: undefined,
            clientID: 's6BhdRkqt3',
            clientSecret: 'some_secret12345',
            callbackURL: 'https://client.example.org/cb',
            customHeaders: undefined,
            params: {
              response_type: 'code',
              client_id: 's6BhdRkqt3',
              redirect_uri: 'https://client.example.org/cb',
              scope: 'openid profile email',
              state: state
            }
          });
          done();
        })
        .error(done)
        .authenticate({ scope: [ 'profile', 'email' ] });
    }); // should redirect with scope as array
  
    it('should redirect with scope as string', function(done) {
      var strategy = new Strategy({
        issuer: 'https://server.example.com',
        authorizationURL: 'https://server.example.com/authorize',
        tokenURL: 'https://server.example.com/token',
        clientID: 's6BhdRkqt3',
        clientSecret: 'some_secret12345',
        callbackURL: 'https://client.example.org/cb'
      }, function() {});
    
      chai.passport.use(strategy)
        .request(function(req) {
          req.session = {};
        })
        .redirect(function(url) {
          var l = uri.parse(url, true);
          var state = l.query.state;
        
          expect(url).to.equal('https://server.example.com/authorize?response_type=code&client_id=s6BhdRkqt3&redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb&scope=openid%20profile%20email&state=' + encodeURIComponent(state));
          expect(state).to.have.length(24);
          expect(this.session['openidconnect:server.example.com'].state).to.deep.equal({
            handle: state,
            issuer: 'https://server.example.com',
            authorizationURL: 'https://server.example.com/authorize',
            tokenURL: 'https://server.example.com/token',
            userInfoURL: undefined,
            clientID: 's6BhdRkqt3',
            clientSecret: 'some_secret12345',
            callbackURL: 'https://client.example.org/cb',
            customHeaders: undefined,
            params: {
              response_type: 'code',
              client_id: 's6BhdRkqt3',
              redirect_uri: 'https://client.example.org/cb',
              scope: 'openid profile email',
              state: state
            }
          });
          done();
        })
        .error(done)
        .authenticate({ scope: 'profile email' });
    }); // should redirect with scope as string
    
    it('should redirect with redirect URI', function(done) {
      var strategy = new Strategy({
        issuer: 'https://server.example.com',
        authorizationURL: 'https://server.example.com/authorize',
        tokenURL: 'https://server.example.com/token',
        clientID: 's6BhdRkqt3',
        clientSecret: 'some_secret12345',
        callbackURL: 'https://client.example.org/cb'
      }, function() {});
      
      chai.passport.use(strategy)
        .request(function(req) {
          req.session = {};
        })
        .redirect(function(url) {
          var l = uri.parse(url, true);
          var state = l.query.state;
        
          expect(url).to.equal('https://server.example.com/authorize?response_type=code&client_id=s6BhdRkqt3&redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb2&scope=openid&state=' + encodeURIComponent(state));
          expect(state).to.have.length(24);
          expect(this.session['openidconnect:server.example.com'].state).to.deep.equal({
            handle: state,
            issuer: 'https://server.example.com',
            authorizationURL: 'https://server.example.com/authorize',
            tokenURL: 'https://server.example.com/token',
            userInfoURL: undefined,
            clientID: 's6BhdRkqt3',
            clientSecret: 'some_secret12345',
            callbackURL: 'https://client.example.org/cb2',
            customHeaders: undefined,
            params: {
              response_type: 'code',
              client_id: 's6BhdRkqt3',
              redirect_uri: 'https://client.example.org/cb2',
              scope: 'openid',
              state: state
            }
          });
          done();
        })
        .error(done)
        .authenticate({ callbackURL: 'https://client.example.org/cb2' });
    }); // should redirect with redirect URI
  
  }); // #authenticate
  
}); // Strategy
