'use strict';

const mysql = require('mysql2');

// Load environment variables
require('dotenv').config();

// Connection to the database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

// Get all guests
exports.getAllGuests = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM guests';
        db.query(sql, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const guests = rows.map((i) => ({
                guestId: i.guest_id, 
                invitationId: i.invitation_id, 
                fullName: i.full_name,
                menu_type: i.menu_type,
                menu_kids: i.menu_kids, 
                needs: i.needs,
                status: i.status, 
                estimatedPartecipation: i.estimated_partecipation
            }));
            
            resolve(guests);
        })
    })
};

// Get all guests of a given invitation id
exports.getAllGuestsOfInvitation = (invitationId) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM guests WHERE invitation_id = ?';
        db.query(sql, [invitationId], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const guests = rows.map((i) => ({
                guestId: i.guest_id, 
                invitationId: i.invitation_id,
                full_name: i.full_name, 
                menu_type: i.menu_type, 
                menu_kids: i.menu_kids,
                needs: i.needs,
                status: i.status, 
                estimatedPartecipation: i.estimated_partecipation
            }));
            resolve(guests);
        })
    })
};

// Add a new guest of a given invitation to the database by adding name, surname and estimated_partecipation
exports.addGuest = (guestId, invitationId, fullName, menuType, menuKids, needs, status, estimatedPartecipation) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO guests (guest_id, invitation_id, full_name, menu_type, menu_kids, needs, status, estimated_partecipation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(sql, [guestId, invitationId, fullName, menuType, menuKids, needs, status, estimatedPartecipation], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(guestId);
        })
    })
}

// Edit a guest by its id
exports.editGuest = (guestId, fullName, menuType, menuKids, needs, status, estimatedPartecipation) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE guests SET full_name = ?, menu_type = ?, menu_kids = ?, needs = ?, status = ?, estimated_partecipation = ? WHERE guest_id = ?';
        db.query(sql, [fullName, menuType, menuKids, needs, status, estimatedPartecipation, guestId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(guestId);
        })
    })
}

// Delete a guest by its id
exports.deleteGuest = (guestId) => {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM guests WHERE guest_id = ?';
        db.run(sql, [guestId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        })
    })
}