const { db } = require('./db');

/**
 * Insert user into de database
 * @param username
 * @param password
 * @returns {Promise<void>}
 */
const insertUser = async (username, password) => {
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function (err) {
        if (err) {
            reject(err);
        }
        console.log(`Inserted user with id ${this.lastID}`);
        return this.lastID;
    });
};

/**
 * Get user data by his username
 * @param username
 * @returns {Promise<unknown>}
 */
function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve(null); // User not found
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Check if user exist on the database
 * @param username
 * @returns {Promise<boolean|*>}
 */
const checkIfUserExists = async (username) => {
    try {
        const exists = await getUserByName(username);
        return exists;
    } catch (err) {
        console.error(err.message);
        return false;
    }
};

/**
 * Get user by ID of the database table
 * @param id
 * @returns {Promise<unknown>}
 */
const getUserById = (id) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });
};



module.exports = {
    insertUser,
    checkIfUserExists,
    getUserById,
    getUserByUsername,
};