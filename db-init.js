const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// DB Connection. Variables are taken from .env file
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Function to execute queries using promises
function queryPromise(sql) {
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

// Create tables fuctions
async function createTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      hash VARCHAR(255) NOT NULL
    );
  `;

  const createInvitationsTable = `
    CREATE TABLE IF NOT EXISTS invitations (
      invitation_id INT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status ENUM('Pending', 'Partially Accepted', 'Accepted', 'Declined') NOT NULL DEFAULT 'Pending',
      comment TEXT
    );
  `;

  const createGuestsTable = `
    CREATE TABLE IF NOT EXISTS guests (
      guest_id CHAR(36) PRIMARY KEY,
      invitation_id INT,
      fullname VARCHAR(100) NOT NULL,
      menu_type ENUM('Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free') NOT NULL DEFAULT 'Standard',
      needs ENUM('Autonomous', 'Bus-Only', 'Bus-And-Hotel', 'Hotel-Only') NOT NULL DEFAULT 'Autonomous',
      status ENUM('Pending', 'Accepted', 'Declined') NOT NULL DEFAULT 'Pending',
      estimated_partecipation ENUM('Yes', 'No') NOT NULL DEFAULT 'Yes',
      FOREIGN KEY (invitation_id) REFERENCES invitations(invitation_id) ON DELETE SET NULL
    );
  `;

  await queryPromise(createUsersTable);
  console.log('Tabella users creata con successo');
  await queryPromise(createInvitationsTable);
  console.log('Tabella invitations creata con successo');
  await queryPromise(createGuestsTable);
  console.log('Tabella guests creata con successo');
}

// Funzione per inserire gli utenti
async function insertUsers() {
  const users = [
    { username: 'antonino', password: 'password' },
    { username: 'daiana', password: 'password' },
    { username: 'marco', password: 'password' }
  ];

  const saltRounds = 10;

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    const insertUser = `
      INSERT INTO users (username, hash)
      VALUES ('${user.username}', '${hashedPassword}');
    `;
    await queryPromise(insertUser);
    console.log(`Utente ${user.username} inserito con successo`);
  }
}

// Funzione principale per creare le tabelle e inserire gli utenti
async function main() {
  connection.connect();

  try {
    await createTables();
    await insertUsers();
  } catch (err) {
    console.error('Errore:', err);
  } finally {
    connection.end();
  }
}

main();