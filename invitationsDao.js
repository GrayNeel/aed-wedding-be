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

// Get all invitations and then get all guests for each invitation so that all guests are an attribute of invitation
exports.getAllInvitationsWithGuests = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM invitations';
        db.query(sql, (err, invitationRows) => {
            if (err) {
                reject(err);
                return;
            }

            const invitations = invitationRows.map((i) => ({
                invitationId: i.invitation_id,
                invitationNumber: i.invitation_number,
                name: i.name,
                status: i.status,
                comment: i.comment,
                guests: []
            }));

            const guestPromises = invitations.map((invitation) => {
                return new Promise((resolve, reject) => {
                    const sql = 'SELECT guest_id, full_name, menu_type, menu_kids, needs, status, nights_needed, estimated_partecipation FROM guests WHERE invitation_id = ?';
                    db.query(sql, [invitation.invitationId], (err, guestRows) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const guests = guestRows.map((g) => ({
                            guestId: g.guest_id,
                            fullName: g.full_name,
                            menuType: g.menu_type,
                            menuKids: g.menu_kids,
                            needs: g.needs,
                            status: g.status,
                            nightsNeeded: g.nights_needed,
                            estimatedPartecipation: g.estimated_partecipation
                        }));

                        invitation.guests = guests;
                        resolve();
                    });
                });
            });

            Promise.all(guestPromises)
                .then(() => {
                    resolve(invitations);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });
};

// Add a new invitation
exports.addInvitation = (invitationId, name, status, comment) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO invitations (invitation_id, name, status, comment) VALUES (?, ?, ?, ?)';
        db.query(sql, [invitationId, name, status, comment], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(invitationId);
        });
    });
};

// Remove an invitation by its id
exports.deleteInvitation = (invitationId) => {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM invitations WHERE invitation_id = ?';
        db.query(sql, [invitationId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};

// Edit an invitation by its id
exports.editInvitation = (invitationId, name, status, comment) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE invitations SET name = ?, status = ?, comment = ? WHERE invitation_id = ?';
        db.query(sql, [name, status, comment, invitationId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};

// Get an invitation by its id
exports.getInvitationById = (invitationId) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM invitations WHERE invitation_id = ?';
        db.query(sql, [invitationId], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            if (rows.length > 0) {
                resolve(rows[0]);
            } else {
                resolve(null);
            }
        });
    });
};