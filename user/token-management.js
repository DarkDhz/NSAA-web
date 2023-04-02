const jwt = require("jsonwebtoken");

const jwtSecret = require('crypto').randomBytes(16)

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

const redirectHome = (req, res, next) => {
    if (req.user !== undefined) {
        res.redirect('/');
    }
    next()
};

const generateToken = (req, res, next) => {
    const jwtClaims = {
        sub: req.user.username,
        iss: 'localhost:3000',
        aud: 'localhost:3000',
        exp: Math.floor(Date.now() / 1000) + 604800, // 1 week (7×24×60×60=604800s) from now
        role: 'user' // just to show a private JWT field
    }

    // generate a signed json web token. By default the signing algorithm is HS256 (HMAC-SHA256), i.e. we will 'sign' with a symmetric secret
    const token = jwt.sign(jwtClaims, jwtSecret)

    // save cookie as user_login
    res.cookie('user_login', token, { httpOnly: true, secure: true });

    // From now, just send the JWT directly to the browser. Later, you should send the token inside a cookie.
    //res.json(token)
    res.redirect('/');

    // And let us log a link to the jwt.io debugger, for easy checking/verifying:
    console.log(`Token sent. Debug at https://jwt.io/?value=${token}`)
    console.log(`Token secret (for verifying the signature): ${jwtSecret.toString('base64')}`)
};

module.exports = {
    generateToken,
    redirectHome,
    verifyToken
};