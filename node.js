const express = require('express')
const logger = require('morgan')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const cookieParser = require('cookie-parser');
const fortune = require('fortune-teller');
const scryptMcf = require('scrypt-mcf')

const { insertUser, checkIfUserExists, getUserByUsername, verifyPassword, hashPassword } = require('./user/user-management');
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
            return done(null, false);
        }

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
        usernameField: 'username',  // it MUST match the name of the input field for the username in the login HTML formulary
        passwordField: 'password',  // it MUST match the name of the input field for the password in the login HTML formulary
        session: false // we will store a JWT in the cookie with all the required session data. Our server does not need to keep a session, it's going to be stateless
    },
    async function (username, password, done) {

        const userExists = await checkIfUserExists(username);

        if (userExists) {
            return done(null, false)
        } else {
            const hashedString = await scryptMcf.hash(password)
            await insertUser(username, hashedString)

            const user = {
                username: username,
                description: 'the only user that deserves to contact the fortune teller'
            }

            return done(null, user)
        }
    }
))

app.use(express.urlencoded({ extended: true })) // needed to retrieve html form fields (it's a requirement of the local strategy)
app.use(passport.initialize())  // we load the passport auth middleware to our express application. It should be loaded before any route.

app.get('/', verifyToken, (req, res) => {
    const adage = fortune.fortune();
    res.send(adage);
})

app.get('/logout', (req, res) => {
    res.clearCookie('user_login'); // Delete the session token cookie
    res.redirect('/login'); // Redirect the user to the login page
});

app.get('/login', verifyToken, redirectHome, (req, res) => {
        res.sendFile('render/login/login.html', { root: __dirname })
    }
)

app.get('/register', verifyToken, redirectHome, (req, res) => {
        res.sendFile('render/register/register.html', { root: __dirname })
    }
)

app.post('/login',
    passport.authenticate('username-password-login', { failureRedirect: '/login', session: false }), generateToken, (req, res) => {
    }
)

app.post('/register', passport.authenticate('username-password-register', { failureRedirect: '/register', session: false }), generateToken, (req, res) => {
    }
)

app.get('*', (req, res) => {
    res.redirect('/login');
});

app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})



app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})