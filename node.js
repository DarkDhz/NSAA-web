const express = require('express')
const logger = require('morgan')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const cookieParser = require('cookie-parser');
const fortune = require('fortune-teller');
const scryptMcf = require('scrypt-mcf')

const { insertUser, checkIfUserExists, getUserByUsername } = require('./user/user-management');
const { generateToken, redirectHome, verifyToken } = require('./user/token-management');


const app = express()
const port = 3000

app.use(logger('dev'))
app.use(cookieParser());

/*const { db } = require('./user/db');

db.serialize(() => {
    db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
});*/


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
            return done(null, user)
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

app.get('/', verifyToken, (req, res) => {
    // If token verified (verifyToken) send a random adage
    const adage = fortune.fortune();
    res.send(adage);
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

app.post('/login',
    passport.authenticate('username-password-login', { failureRedirect: '/login', session: false }), generateToken, (req, res) => {
    // perform login authentication, if successful redirect to main page
})

app.post('/register', passport.authenticate('username-password-register', { failureRedirect: '/register', session: false }), generateToken, (req, res) => {
    // perform register authentication, if successful redirect main page
})

app.get('*', (req, res) => {
    // If any random endpoint redirect to login page
    // in case user is logged with token, will be redirected to main page
    res.redirect('/login');
});

app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})