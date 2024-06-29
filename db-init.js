const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// DB Connection. Variables are taken from .env file
const connection = mysql.createConnection({
  host: 'localhost', // Cambia se il database non è in locale
  user: 'admin', // Sostituisci con il tuo utente del database
  password: 'password', // Sostituisci con la tua password del database
  database: 'weddings'
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
      invitation_number INT NOT NULL UNIQUE AUTO_INCREMENT = 1,
      name VARCHAR(100) NOT NULL,
      status ENUM('Pending', 'Partially Accepted', 'Accepted', 'Declined') NOT NULL DEFAULT 'Pending',
      comment TEXT
    );
  `;

  const createGuestsTable = `
    CREATE TABLE IF NOT EXISTS guests (
      guest_id INT AUTO_INCREMENT PRIMARY KEY,
      invitation_id INT,
      full_name VARCHAR(100) NOT NULL,
      menu_type ENUM('Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free') NOT NULL DEFAULT 'Standard',
      menu_kids BOOLEAN NOT NULL DEFAULT FALSE,
      needs ENUM('Autonomous', 'Bus-Only', 'Bus-And-Hotel', 'Hotel-Only') NOT NULL DEFAULT 'Autonomous',
      status ENUM('Pending', 'Accepted', 'Declined') NOT NULL DEFAULT 'Pending',
      nights_needed ENUM('Both','21-Only','22-Only','None') NOT NULL DEFAULT 'None',
      estimated_partecipation BOOLEAN NOT NULL DEFAULT TRUE,
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