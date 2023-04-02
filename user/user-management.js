const { db } = require('./db');

const insertUser = async (username, password) => {

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function (err) {
        if (err) {
            reject(err);
        }
        console.log(`Inserted user with id ${this.lastID}`);
        return this.lastID;
    });
};

const getUserByName = (username) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(row !== undefined);
            }
        });
    });
};

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

const checkIfUserExists = async (username) => {
    try {
        const exists = await getUserByName(username);
        return exists;
    } catch (err) {
        console.error(err.message);
        return false;
    }
};

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
    getUserByName,
    checkIfUserExists,
    getUserById,
    getUserByUsername,
};