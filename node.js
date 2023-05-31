const express = require('express')
const logger = require('morgan')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const cookieParser = require('cookie-parser');
const fortune = require('fortune-teller');
const scryptMcf = require('scrypt-mcf')
const session = require('express-session')
const GoogleStrategy = require('passport-google-oidc').Strategy;

const dotenv = require('dotenv')
dotenv.config()

const { insertUser, checkIfUserExists, getUserByUsername } = require('./user/user-management');
const { generateToken, redirectHome, verifyToken } = require('./user/token-management');
const { doOAuth } = require('./user/oauth');

const app = express()
const port = 3000

app.use(logger('dev'))
app.use(cookieParser());
app.use(session({
    secret: require('crypto').randomBytes(32).toString('base64url'), // This is the secret used to sign the session cookie. We are creating a random base64url string with 256 bits of entropy.
    resave: false, // Default value is true (although it is going to be false in the next major release). We do not need the session to be saved back to the session store when the session has not been modified during the request.
    saveUninitialized: false // Default value is true (although it is going to be false in the next major release). We do not need sessions that are "uninitialized" to be saved to the store
}))

/*const { db } = require('./user/db');

db.serialize(() => {
    db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
});*/

app.get('/oauth2cb', doOAuth, async (req, res) => {})

passport.use('username-password-login', new LocalStrategy(
    {
        usernameField: 'username',  // it MUST match the name of the input field for the username in the login HTML formulary
        passwordField: 'password',  // it MUST match the name of the input field for the password in the login HTML formulary
        session: false // we will store a JWT in the cookie with all the required session data. Our server does not need to keep a session, it's going to be stateless
    },
    async function (username, password, done) {
        const userDB = await getUserByUsername(username);

        if (!userDB) {
            // user not found on the database
            return done(null, false);
        }

        // verify if the provided password matches the hash stored
        if (await scryptMcf.verify(password, userDB.password)) {
            const user = {
                username: userDB.username,
            }
            return done(null, user);
        } else {
            return done(null, false);
        }
    }
))

passport.use('username-password-register', new LocalStrategy(
    {
        usernameField: 'username',
        passwordField: 'password',
        session: false
    },
    async function (username, password, done) {

        // check if user exists on the DB
        const userExists = await checkIfUserExists(username);

        if (userExists) {
            // cannot register as user already exist
            return done(null, false)
        } else {
            // hash user password
            const hashedString = await scryptMcf.hash(password)
            // insert user into db
            await insertUser(username, hashedString)

            const user = {
                username: username,
                description: 'the only user that deserves to contact the fortune teller'
            }

            return done(null, user)
        }
    }
))

app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())

// We will store in the session the complete passport user object
passport.serializeUser(function (user, done) {
    return done(null, user)
})

// The returned passport user is just the user object that is stored in the session
passport.deserializeUser(function (user, done) {
    return done(null, user)
})

passport.use( "oidc" , new GoogleStrategy({
        clientID: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        callbackURL: process.env.OIDC_CALLBACK_URL,
    },
    function verify(issuer, profile, cb) {
        console.log(profile)
        let familyName = 'not set on google account';

        if (profile.name && profile.name.familyName) {
            familyName = profile.name.familyName;
        }
        const user = {
            id: profile.id,
            username: profile.displayName,
            mail: profile.emails[0].value,
            family: familyName,
        }
        return cb(null, user);
    }
));

app.get('/oidc/login', passport.authenticate('oidc', {scope: 'openid email profile'}))

app.get('/oidc/cb', passport.authenticate('oidc', { failureRedirect: '/login', failureMessage: true }),
    generateToken, redirectHome, (req, res) => {})

app.get('/', verifyToken, (req, res) => {
    // If token verified (verifyToken) send a random adage
    const adage = fortune.fortune();
    toSend = "SUB: " + req.user.sub + "\n\nEMAIL: " + req.user.email + "\n\nFAMILY: " + req.user.family_name +
        "\n\nADAGE: " + adage;

    res.send(toSend);
})

app.get('/logout', (req, res) => {
    // Delete user login cookie and redirect to login page
    res.clearCookie('user_login');
    res.redirect('/login');
});

app.get('/login', verifyToken, redirectHome, (req, res) => {
    // If user has no login token send login page
    res.sendFile('render/login/login.html', { root: __dirname })
})

app.get('/register', verifyToken, redirectHome, (req, res) => {
    // If user has no login token send register page
    res.sendFile('render/register/register.html', { root: __dirname })
})

// perform login authentication, if successful redirect to main page
app.post('/login', passport.authenticate('username-password-login', { failureRedirect: '/login', session: false }), generateToken, (req, res) => {})

// perform register authentication, if successful redirect main page
app.post('/register', passport.authenticate('username-password-register', { failureRedirect: '/register', session: false }), generateToken, (req, res) => {})

app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})