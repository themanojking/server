const Pool = require('pg').Pool;
const pool = new Pool({
    user: 'neondb_owner',
    password: 'npg_MnDw2kTiVu0Y',
    host: 'ep-raspy-silence-a8rqgyos-pooler.eastus2.azure.neon.tech',
    database: 'neondb',
    port: "5432",
    ssl: {
        rejectUnauthorized: false,
    },

});

module.exports = pool;