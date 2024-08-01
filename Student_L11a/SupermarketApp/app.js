const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();
const PORT = 3000;

// const dh = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'c237_l11b_supermarketapp'
// });

const dh = mysql.createConnection({
    host: 'mysql-xinrou.alwaysdata.net',
    user: 'xinrou',
    password: 'Basketball-55',
    database: 'xinrou_supermarket'
});

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Ensure 'public/images' directory exists
const fs = require('fs');
const dir = './public/images';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

dh.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Enable static files
app.use(express.static('public'));

// Enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Session Middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please login to access this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// Route to render register form
app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

// Route for register form submission
app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, address, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    dh.query(sql, [username, email, password, address, contact, role], (error, result) => {
        if (error) {
            throw error;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please login.');
        res.redirect('/login');
    });
});

// Route to render login form
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error'),
    });
});

// Route for login form submission
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error', 'All fields are required');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    dh.query(sql, [email, password], (error, results) => {
        if (error) {
            throw error;
        }

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful');
            if (req.session.user.role === 'admin') {
                res.redirect('/inventory');
            } else {
                res.redirect('/shopping');
            }
        } else {
            req.flash('error', 'Invalid email or password');
            res.redirect('/login');
        }
    });
});

app.get('/shopping', checkAuthenticated, (req, res) => {
    // Fetch data from MySQL
    dh.query('SELECT * FROM products', (error, results) => {
        if (error) throw error;
        res.render('shopping', { user: req.session.user, products: results });
    });
});

app.get('/inventory', checkAuthenticated, checkAdmin, (req, res) => {
    // Fetch data from MySQL
    dh.query('SELECT * FROM products', (error, results) => {
        if (error) throw error;
        res.render('inventory', { products: results, user: req.session.user });
    });
});

app.get('/product/:id', checkAuthenticated, (req, res) => {
    // Extract the product ID from the request parameters
    const productId = req.params.id;

    // Fetch data from MySQL based on the product ID
    dh.query('SELECT * FROM products WHERE productId = ?', [productId], (error, results) => {
        if (error) throw error;

        // Check if any product with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the product data
            res.render('product', { product: results[0], user: req.session.user });
        } else {
            // If no product with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Product not found');
        }
    });
});

app.get('/addproduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addproduct', { user: req.session.user });
});

app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), (req, res) => {
  const { productName, quantity, price } = req.body;
  const image = req.file.filename; // This should now correctly read the uploaded file's filename

  const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
  dh.query(sql, [productName, quantity, price, image], (error, results) => {
      if (error) {
          console.error("Error adding product:", error);
          return res.status(500).send('Error adding product');
      }
      res.redirect('/inventory');
  });
});


app.get('/product', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addproduct', { user: req.session.user });
});

app.post('/product', checkAuthenticated, checkAdmin, (req, res) => {
    // Extract product data from the request body
    const { name, quantity, price, image } = req.body;

    // Insert the new product into the database
    dh.query('INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)', [name, quantity, price, image], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding product:", error);
            res.status(500).send('Error adding product');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

app.get('/product/:id/update', checkAuthenticated, checkAdmin, (req, res) => {
  const productId = req.params.id;

  dh.query('SELECT * FROM products WHERE productId = ?', [productId], (error, results) => {
      if (error) throw error;

      if (results.length > 0) {
          res.render('editProduct', { product: results[0], user: req.session.user });
      } else {
          res.status(404).send('Product not found');
      }
  });
});


app.post('/product/:id/update', checkAuthenticated, checkAdmin, (req, res) => {
    const productId = req.params.id;
    // Extract product data from the request body
    const { name, quantity, price } = req.body;

    // Update the product in the database
    dh.query('UPDATE products SET productName = ?, quantity = ?, price = ? WHERE productId = ?', [name, quantity, price, productId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating product:", error);
            res.status(500).send('Error updating product');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

app.get('/product/:id/delete', checkAuthenticated, checkAdmin, (req, res) => {
    const productId = req.params.id;

    dh.query('DELETE FROM products WHERE productId = ?', [productId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error deleting product:", error);
            res.status(500).send('Error deleting product');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

// Route for logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
