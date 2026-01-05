const express = require('express');
const router = express.Router();
const Product = require('../Product');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// GET /products - list all products
router.get('/', verifyToken, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /products/:id - get a single product
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /products - create product (admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, price, category, stock } = req.body;
  if (!name || price == null || !category || stock == null) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const product = new Product({ name, price, category, stock });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /products/:id - update product (admin only)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /products/:id - delete product (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
