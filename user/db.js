const sqlite3 = require('sqlite3').verbose();

/**
 * get database instance
 * @type {Database}
 */
const db = new sqlite3.Database('database/database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

module.exports = {
    db
};