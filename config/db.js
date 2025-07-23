const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    ca: fs.readFileSync(process.env.DB_CA_CERT_PATH)
  }
});

module.exports = pool.promise();
