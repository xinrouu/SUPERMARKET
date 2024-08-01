const express = require('express');
const mysql = require('mysql2');

//******** TODO: Insert code to import 'express-session' *********//


const flash = require('connect-flash');

const app = express();

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'C237_L11_usersdb'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

//******** TODO: Insert code for Session Middleware below ********//


app.use(flash());

// Setting up EJS
app.set('view engine', 'ejs');

//******** TODO (ONLY IN L11B): Create a Middleware to check if user is logged in. ********//

//******** TODO (ONLY IN L11B): Create a Middleware to check if user is admin. ********//

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


//******** TODO: Create a middleware function validateRegistration ********//


//******** TODO: Integrate validateRegistration into the register route. ********//
app.post('/register', (req, res) => {
    //******** TODO (ONLY IN L11B): Update register route to include role. ********//
    const { username, email, password, address, contact } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact) VALUES (?, ?, SHA1(?), ?, ?)';
    db.query(sql, [username, email, password, address, contact], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

//******** TODO: Insert code for login routes to render login page below ********//


//******** TODO: Insert code for login routes for form submission below ********//

//******** TODO (ONLY IN L11B): Insert code for dashboard route to render dashboard page for users. ********//

//******** TODO (ONLY IN L11B): Insert code for admin route to render dashboard page for admin. ********//

//******** TODO: Insert code for logout route ********//

// Starting the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
