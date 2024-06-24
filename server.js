'use strict';
// Load environment variables
require('dotenv').config();
// Load the server framework
const express = require('express');
// Debugging middleware (prints all request on console)
const morgan = require('morgan');
// This is a middleware that handles "session" (user) 
const session = require('express-session');
// Express validator middleware 
const { body, validationResult, check } = require('express-validator');

// Initialize expressJS
const app = new express();
const port = process.env.SERVER_PORT;

/** Import DB queries */
const usersDao = require('./usersDao');
const invitationsDao = require('./invitationsDao');
const guestsDao = require('./guestsDao');

/* Enable CORS */
const cors = require('cors');
app.use(cors());

/********************************* Session Management ************************************/

/** Middleware for log-in and log-out */
const passport = require('passport');
const passportLocal = require('passport-local');

/** Initialize and configure passport */
passport.use(new passportLocal.Strategy((username, password, done) => {
  /** verification callback for authentication */
  usersDao.getUser(username, password).then(user => {
    if (user)
      done(null, user);
    else
      done(null, false, { message: 'Username or password wrong' });
  }).catch(err => {
    done(err);
  });
}));

/** serialize and de-serialize the user (user object <-> session)
 *  we serialize the user id and we store it in the session: the session is very small in this way
 */
passport.serializeUser((user, done) => {
  done(null, user.userId);
});

// starting from the data in the session, we extract the current (logged-in) user
// This is so powerful because now we can access data stored in the db for the current user, simply writing req.user
// I have to write another api to make frontend able to user the same information: this api is app.get('/api/sessions/current')
passport.deserializeUser((userId, done) => {
  usersDao.getUserByUserId(userId)
    .then(user => {
      done(null, user); // this will be available in req.user
    }).catch(err => {
      done(err, null);
    });
});


// custom middleware: check if a given request is coming from an authenticated user
// simple way could be check req.isAuthenticated() at the beginning of every callback body in each route to protect
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated())
    // If authenticated, you can call the next function
    return next();
  // Otherwise unauthenticated error
  return res.status(401).json({ error: 'User is not authenticated' });
}

// initialize and configure HTTP sessions
app.use(session({
  secret: 'Elementary, my dear Watson.',
  resave: false,
  saveUninitialized: false
}));

// tell passport to use session cookies
app.use(passport.initialize());
app.use(passport.session());

/*****************************************************************************************/
/************************************** API **********************************************/

/** Enable morgan for logs */
app.use(morgan('dev'));
/** to parse the tasks from string to json */
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World, from your server');
});

/* Return all available invitations and guests to a logged user */
app.get('/api/invitations', (req, res) => {
  invitationsDao.getAllInvitationsWithGuests().then(invitations => {
    if (Object.entries(invitations).length === 0)
      res.status(404).json({ error: "No invitations found" });
    else
      res.json(invitations);
  }).catch(err => {
    res.status(500).json({ error: 'An error occurred', description: err});
  });
});

/* Return all guests to a logged user */
app.get('/api/guests', (req, res) => {
  guestsDao.getAllGuests().then(guests => {
    if (Object.entries(guests).length === 0)
      res.status(404).json({ error: "No guests found" });
    else
      res.json(guests);
  }).catch(err => {
    res.status(500).json({ error: 'An error occurred' });
  });
});

/* Return an invitation including all guests */
app.get('/api/invitations/:invitationId', (req, res) => {
  let invitationId = req.params.invitationId;

  // InvitationId must be 6 digits 
  if (invitationId.length != 6) {
    res.status(400).json({ error: 'Invalid invitationId' });
    return;
  }

  invitationsDao.getInvitationById(invitationId).then(invitation => {
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
    } else {
      guestsDao.getAllGuestsOfInvitation(invitationId).then(guests => {
        if (Object.entries(guests).length === 0)
          res.status(404).json({ error: "No guests found" });
        else {
          invitation.guests = guests;
          res.json(invitation);
        }
      }).catch(err => {
        res.status(500).json({ error: 'An error occurred', description: err });
      });
    }
  }).catch(err => {
    res.status(500).json({ error: 'An error occurred', description: err });
  });
});

/* Return all guests of a given invitation to a logged user */
app.get('/api/invitations/:invitationId/guests', (req, res) => {
  let invitationId = req.params.invitationId;

  // InvitationId must be 6 digits 
  if (invitationId.length != 6) {
    res.status(400).json({ error: 'Invalid invitationId' });
    return;
  }

  // Check if the invitation exists
  invitationsDao.getInvitationById(invitationId).then(invitation => {
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
    } else {
      // Get all guests of the invitation
      guestsDao.getAllGuestsOfInvitation(invitationId).then(guests => {
        if (Object.entries(guests).length === 0)
          res.status(404).json({ error: "No guests found" });
        else
          res.json(guests);
      }).catch(err => {
        res.status(500).json({ error: 'An error occurred' });
      });
    }
  }).catch(err => {
    res.status(500).json({ error: 'An error occurred', description: err });
  });
});

/* Add a new invitation received from a logged user */
app.post('/api/invitations', body('name').isString().isLength({ min: 1 }), (req, res) => {
  let name = req.body.name;
  let status = req.body.status;
  let comment = req.body.comment;

  // Validate the input data
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // If status is null or empty set Pending as default
  if (!status)
    status = 'Pending';

  // If comment is null or empty set it empty
  if (!comment)
    comment = '';

  // Generate a 6-digits characters ID while it exists on the database, until a valid one is found
  let invitationId = Math.floor(100000 + Math.random() * 900000);
  
  // Check that the invitationId is not already in use
  invitationsDao.getInvitationById(invitationId).then(invitation => {
    if (invitation) {
      invitationId = Math.floor(100000 + Math.random() * 900000);
    }
  }).catch(err => {
    res.status(500).json({ error: 'An error occurred', description: err });
  });

  invitationsDao.addInvitation(invitationId, name, status, comment).then(invitationId => {
    res.status(201).json({ invitationId: invitationId });
  }).catch(err => {
    res.status(500).json({ error: 'An error occurred', description: err});
  });
});

// Add a new guest to a given invitation
app.post('/api/invitations/:invitationId/guests', 
  body('fullName').isString().isLength({ min: 1 }),
  body('estimatedPartecipation').isBoolean(),
  (req, res) => {
    // Validate body data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let invitationId = req.params.invitationId;
    // InvitationId must be 6 digits 
    if (invitationId.length != 6) {
      res.status(400).json({ error: 'Invalid invitationId' });
      return;
    }

    // Check if the invitation exists
    invitationsDao.getInvitationById(invitationId).then(invitation => {
      if (!invitation) {
        res.status(404).json({ error: 'Invitation not found' });
      }
    }).catch(err => {
      res.status(500).json({ error: 'An error occurred', description: err });
    });

    let fullName = req.body.fullName;
    let estimatedPartecipation = req.body.estimatedPartecipation;
    let menuType = req.body.menuType;
    let menuKids = req.body.menuKids;
    let needs = req.body.needs;
    let status = req.body.status;

    // If menuType is null set Standard as default
    if (!menuType)
      menuType = 'Standard';

    // If menuKids is null set false as default
    if (!menuKids)
      menuKids = false;

    // If needs is null set Autonomous as default
    if (!needs)
      needs = 'Autonomous';

    // If status is null set Pending as default
    if (!status)
      status = 'Pending';

    // Get the latest maximum guestId and increment it by 1
    guestsDao.getMaxGuestId().then(guestId => {
      if (!guestId)
        guestId = 1;
      else
        guestId++;

      // Add the new guest to the database
      guestsDao.addGuest(guestId, invitationId, fullName, menuType, menuKids, needs, status, estimatedPartecipation).then(guestId => {
        res.status(201).json({ guestId: guestId });
      }).catch(err => {
        res.status(500).json({ error: 'An error occurred', description: err });
      });

    }).catch(err => {
      res.status(500).json({ error: 'An error occurred', description: err });
    });
});

/* Remove an invitation received from a logged user by invitationId */
app.delete('/api/invitations/:invitationId', (req, res) => {
  let invitationId = req.params.invitationId;

  // InvitationId must be 6 digits 
  if (invitationId.length != 6) {
    res.status(400).json({ error: 'Invalid invitationId' });
    return;
  }

  // Check if the invitation exists
  invitationsDao.getInvitationById(invitationId).then(invitation => {
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
    } else {

      // Remove all guests related to the invitation
      guestsDao.deleteAllGuestsOfInvitation(invitationId).then(() => {
        // Remove the invitation
        invitationsDao.deleteInvitation(invitationId).then(() => {
          res.status(204).end();
        }).catch(err => {
          res.status(500).json({ error: 'An error occurred while removing invitation', description: err });
        });
      }).catch(err => {
        res.status(500).json({ error: 'An error occurred while removing guests', description: err });
      });

    }

  }).catch(err => {
    res.status(500).json({ error: 'An error occurred while checking invitationId', description: err });
  });
});

/* Remove a guest received from a logged user by guestId */
app.delete('/api/guests/:guestId', (req, res) => {
  let guestId = req.params.guestId;

  guestsDao.deleteGuest(guestId).then(() => {
    res.status(204).end();
  }).catch(err => {
    res.status(500).json({ error: 'An error occurred', description: err });
  });
});

/* Update invitation and all guests of that invitation received from not logged user. The user will send a JSON like this:
{
  "comment": "",
  "guests": [
    {
      "guestId": 1,
      "menuType": "Standard",
      "menuKids": 0,
      "needs": "Autonomous",
      "status": "Pending"
    },
    {
      "guestId": 2,
      "menuType": "Standard",
      "menuKids": 0,
      "needs": "Autonomous",
      "status": "Pending"
    }
  ]
}
  */
app.put('/api/invitations/:invitationId', 
  // Comment must exist, can be empty
  body('comment').isString(),
  // Guests must be an array
  body('guests').isArray(),
  // Each guest must have the following fields
  body('guests.*.guestId').isInt(),
  // Menu type must contain one of the following strings: 'Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free'
  body('guests.*.menuType').isString().isIn(['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free']),
  // Menu kids must be a boolean
  body('guests.*.menuKids').isBoolean(),
  // Needs must contain one of the following strings: 'Autonomous', 'Bus-Only', 'Bus-And-Hotel', 'Hotel-Only'
  body('guests.*.needs').isString().isIn(['Autonomous', 'Bus-Only', 'Bus-And-Hotel', 'Hotel-Only']),
  // Status must contain one of the following strings: 'Pending', 'Accepted', 'Declined'
  body('guests.*.status').isString().isIn(['Pending', 'Accepted', 'Declined']),
  (req, res) => {
  // Validate the input data
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let invitationId = req.params.invitationId;

  // InvitationId must be 6 digits 
  if (invitationId.length != 6) {
    res.status(400).json({ error: 'Invalid invitationId' });
    return;
  }

  // Check if the invitation exists
  invitationsDao.getInvitationById(invitationId).then(invitation => {
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
    } else {
      let comment = req.body.comment;
      let guests = req.body.guests;

      // If comment is null or empty set it empty
      if (!comment)
        comment = '';

      // Get the status of each guest in guests variable
      let allAccepted = true;

      guests.forEach(guest => {
        if(guest.status != 'Accepted')
          allAccepted = false;
      });

      let allDeclined = true;

      guests.forEach(guest => {
        if(guest.status != 'Declined')
          allDeclined = false;
      });

      let status = 'Pending';

      if(allAccepted)
        status = 'Accepted';
      else if(allDeclined)
        status = 'Declined';
      else if(!allAccepted && !allDeclined)
        status = 'Partially Accepted';

      // Check that all guestsId provided by input are in the invitation
      guestsDao.getAllGuestsOfInvitation(invitationId).then(invitationGuests => {
        let guestsId = invitationGuests.map(guest => guest.guestId);
        let guestsIdInput = guests.map(guest => guest.guestId);

        let allGuestsInInvitation = true;

        guestsIdInput.forEach(guestId => {
          if (!guestsId.includes(guestId))
            allGuestsInInvitation = false;
        });
        
        if (!allGuestsInInvitation) {
          res.status(400).json({ error: 'Some guests are not in the invitation' });
        } else {
          // Update the invitation
          invitationsDao.editInvitation(invitationId, invitation.name, status, comment).then(() => {
            // Update all guests
            guestsDao.editMultipleGuests(guests).then(() => {
              res.status(204).end();
            }).catch(err => {
              res.status(500).json({ error: 'An error occurred while editing guests', description: err });
            });
          }).catch(err => {
            res.status(500).json({ error: 'An error occurred while editing invitation', description: err });
          });
        }

      }).catch(err => {
        res.status(500).json({ error: 'An error occurred while getting all guests of invitation', description: err });
      });
    }

  }).catch(err => {
    res.status(500).json({ error: 'An error occurred while getting invitation details', description: err });
  });
});

/*****************************************************************************************/
/************************************* USER'S API ****************************************/
// POST /sessions 
// login
app.post('/api/sessions', function (req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err)
      return next(err);
    if (!user) {
      // display wrong login messages
      return res.status(401).json(info);
    }
    // success, perform the login
    req.login(user, (err) => {
      if (err)
        return next(err);

      // req.user contains the authenticated user, we send all the user info back
      // this is coming from usersDao.getUser()
      return res.json(req.user);
    });
  })(req, res, next);
});

// DELETE /sessions/current 
// logout
app.delete('/api/sessions/current', isLoggedIn, (req, res) => {
  req.logout();
  res.end();
});

// GET /sessions/current
// check whether the user is logged in or not
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json(req.user);
  }
  else
    res.status(401).json({ error: 'Unauthenticated user!' });
});

/*****************************************************************************************/

/** If i get here, it is an unknown route */
app.use(function (req, res) {
  res.status(404).json({ error: 'Requested resource was not found!' });
});

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});