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
                nightsNeeded: i.nights_needed,
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
                fullName: i.full_name, 
                menuType: i.menu_type, 
                menuKids: i.menu_kids,
                needs: i.needs,
                status: i.status, 
                nightsNeeded: i.nights_needed,
                estimatedPartecipation: i.estimated_partecipation
            }));
            resolve(guests);
        })
    })
};

// Add a new guest of a given invitation to the database by adding name, surname and estimated_partecipation
exports.addGuest = (guestId, invitationId, fullName, menuType, menuKids, needs, status, nightsNeeded, estimatedPartecipation) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO guests (guest_id, invitation_id, full_name, menu_type, menu_kids, needs, status, nights_needed, estimated_partecipation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(sql, [guestId, invitationId, fullName, menuType, menuKids, needs, status, nightsNeeded, estimatedPartecipation], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(guestId);
        })
    })
}

// Edit a guest by its id
exports.editGuest = (guestId, fullName, menuType, menuKids, needs, status, nightsNeeded, estimatedPartecipation) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE guests SET full_name = ?, menu_type = ?, menu_kids = ?, needs = ?, status = ?, nightsNeeded = ?, estimated_partecipation = ? WHERE guest_id = ?';
        db.query(sql, [fullName, menuType, menuKids, needs, status, nightsNeeded, estimatedPartecipation, guestId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(guestId);
        })
    })
}

exports.editMultipleGuests = async (guests) => {
    return new Promise((resolve, reject) => {
        db.beginTransaction(err => {
            if (err) { reject(err); return; }

            const promises = guests.map(guest => {
                return new Promise((resolve, reject) => {
                    const { guestId, fullName, menuType, menuKids, needs, status, nightsNeeded, estimatedPartecipation } = guest;
                    let updateSql = `UPDATE guests SET `;
                    const updateParams = [];
                    if (fullName !== undefined) {
                        updateParams.push(fullName);
                        updateSql += `full_name = ?, `;
                    }
                    if (menuType !== undefined) {
                        updateParams.push(menuType);
                        updateSql += `menu_type = ?, `;
                    }
                    if (menuKids !== undefined) {
                        updateParams.push(menuKids);
                        updateSql += `menu_kids = ?, `;
                    }
                    if (needs !== undefined) {
                        updateParams.push(needs);
                        updateSql += `needs = ?, `;
                    }
                    if (status !== undefined) {
                        updateParams.push(status);
                        updateSql += `status = ?, `;
                    }   
                    if (nightsNeeded !== undefined) {
                        updateParams.push(nightsNeeded);
                        updateSql += `nights_needed = ?, `;
                    }
                    if (estimatedPartecipation !== undefined) {
                        updateParams.push(estimatedPartecipation);
                        updateSql += `estimated_partecipation = ?, `;
                    }

                    // Remove trailing comma and space
                    updateSql = updateSql.slice(0, -2);
                    updateSql += ` WHERE guest_id = ?`;
                    updateParams.push(guestId);

                    db.query(updateSql, updateParams, function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            });

            Promise.all(promises).then(() => {
                db.commit(err => {
                    if (err) {
                        db.rollback(() => reject(err));
                        return;
                    }
                    resolve('Update successful');
                });
            }).catch(err => {
                db.rollback(() => reject(err));
            });
        });
    });
}

// Delete a guest by its id
exports.deleteGuest = (guestId) => {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM guests WHERE guest_id = ?';
        db.query(sql, [guestId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        })
    })
}

exports.deleteAllGuestsOfInvitation = (invitationId) => {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM guests WHERE invitation_id = ?';
        db.query(sql, [invitationId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
};
// Get the maximum guest id
exports.getMaxGuestId = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT MAX(guest_id) as max_guest_id FROM guests';
        db.query(sql, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows[0].max_guest_id);
        })
    })
}

