const jwt = require("jsonwebtoken");

const jwtSecret = require('crypto').randomBytes(16)

/**
 * Verify if token is valid
 * @param req
 * @param res
 * @param next
 */
const verifyToken = (req, res, next) => {
    const token = req.cookies.user_login;
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('user_login');
        if ((req.path === '/login') || (req.path === '/register')) {
            next();
        } else {
            res.redirect('/login');
        }
    }
};

/**
 * Redirect home if user has login token
 * @param req
 * @param res
 * @param next
 */
const redirectHome = (req, res, next) => {
    if (req.user !== undefined) {
        res.redirect('/');
    }
    next()
};

/**
 * Generate a login token for the user after successful authentication
 * @param req
 * @param res
 * @param next
 */
const generateToken = (req, res, next) => {
    if (!req.user.mail) {
        req.user.mail = "not set"
    }

    if (!req.user.family) {
        req.user.family = "not set"
    }

    const jwtClaims = {
        sub: req.user.username,
        email: req.user.mail,
        family_name: req.user.family,
        iss: 'localhost:3000',
        aud: 'localhost:3000',
        exp: Math.floor(Date.now() / 1000) + 604800, // 1 week (7×24×60×60=604800s) from now
        role: 'user'
    }

    const token = jwt.sign(jwtClaims, jwtSecret)

    res.cookie('user_login', token, { httpOnly: true, secure: true });
    res.redirect('/');

    console.log(`Token sent. Debug at https://jwt.io/?value=${token}`)
    console.log(`Token secret (for verifying the signature): ${jwtSecret.toString('base64')}`)
    //next()
};

const generateTokenOAuth = (username, res) => {
    const jwtClaims = {
        sub: username,
        iss: 'localhost:3000',
        aud: 'localhost:3000',
        exp: Math.floor(Date.now() / 1000) + 604800, // 1 week (7×24×60×60=604800s) from now
        role: 'user'
    }

    const token = jwt.sign(jwtClaims, jwtSecret)

    res.cookie('user_login', token, { httpOnly: true, secure: true });
    res.redirect('/');

    console.log(`Token sent. Debug at https://jwt.io/?value=${token}`)
    console.log(`Token secret (for verifying the signature): ${jwtSecret.toString('base64')}`)
};

module.exports = {
    generateToken,
    redirectHome,
    verifyToken,
    generateTokenOAuth
};