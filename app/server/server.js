const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

//MongoDB connection
if (!process.env.MONGODB_URL) {
    console.error('Missing MONGODB_URL in environment. Please set it in .env');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

//Routes 
app.get('/', (req, res) => {
    res.send('POS System Backend');
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Products routes
const productsRoutes = require('./routes/products');
app.use('/products', productsRoutes);

// Transactions routes
const transactionsRoutes = require('./routes/transactions');
app.use('/transactions', transactionsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));