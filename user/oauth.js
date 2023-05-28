const axios = require("axios");
const { generateTokenOAuth } = require('./token-management');

async function doOAuth(req, res, next) {
    /**
     * 1. Retrieve the authorization code from the query parameters
     */
    const code = req.query.code // Here we have the received code
    if (code === undefined) {
        const err = new Error('no code provided')
        err.status = 400 // Bad Request
        throw err
    }

    /**
     * 2. Exchange the authorization code for an actual access token at OUATH2_TOKEN_URL
     */
    const tokenResponse = await axios.post(process.env.OAUTH2_TOKEN_URL, {
        client_id: process.env.OAUTH2_CLIENT_ID,
        client_secret: process.env.OAUTH2_CLIENT_SECRET,
        code
    })

    // Let us parse them ang get the access token and the scope
    const params = new URLSearchParams(tokenResponse.data)
    const accessToken = params.get('access_token')
    const scope = params.get('scope')

    // if the scope does not include what we wanted, authorization fails
    if (scope !== 'user:email') {
        const err = new Error('user did not consent to release email')
        err.status = 401 // Unauthorized
        throw err
    }

    /**
     * 3. Use the access token to retrieve the user email from the USER_API endpoint
     */
    const userDataResponse = await axios.get(process.env.USER_API, {
        headers: {
            Authorization: `Bearer ${accessToken}` // we send the access token as a bearer token in the authorization header
        }
    })

    /**
     * 4. Create our JWT using the github email as subject, and set the cookie.
     */
    // just copy and paste or invoke the function you used for creating the JWT for a user logging in with username and password.
    const user = {
        username: userDataResponse.data.email,
        description: 'the only user that deserves to contact the fortune teller'
    }
    req.user = user
    generateTokenOAuth(user, res)
    next()
}

module.exports = {
    doOAuth
};