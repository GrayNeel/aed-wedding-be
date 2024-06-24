'use strict';

const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Load environment variables
require('dotenv').config();

// Connection to the database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

exports.getUser = (username, password) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM users WHERE username=?';
        db.get(sql, [username], (err, row) => {
            if (err) {
                reject(err); // DB error
            } else if (row === undefined)
              resolve({error: 'User not found.'}); //user not found
            else {
                bcrypt.compare(password, row.hash).then(result => {
                    if (result) // password matches
                        resolve({ userId: row.userid, username: row.username});
                    else
                        resolve(false); // password not matching
                })
            }
        });
    });
};

exports.getUserByUserId = (userId) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE user_id = ?';
        db.get(sql, [userId], (err, row) => {
          if (err) 
            reject(err);
          else if (row === undefined)
            resolve({error: 'User not found.'});
          else {
            // by default, the local strategy looks for "username": not to create confusion in server.js, we can create an object with that property
            const user = {userId: row.user_id, username: row.username}
            resolve(user);
          }
      });
    });
  };