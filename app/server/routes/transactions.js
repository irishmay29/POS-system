const express = require('express');
const router = express.Router();
const Transaction = require('../Transaction');
const Product = require('../Product');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Create a transaction
// Body: { items: [{ productId, quantity }], paymentMethod }
router.post('/', verifyToken, async (req, res) => {
  const { items, paymentMethod } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items required' });

  try {
    // Load products and validate stock
    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productsMap = {};
    products.forEach(p => { productsMap[p._id] = p; });

    let total = 0;
    const txnItems = [];

    for (const it of items) {
      const prod = productsMap[it.productId];
      if (!prod) return res.status(400).json({ message: `Product ${it.productId} not found` });
      if (prod.stock < it.quantity) return res.status(400).json({ message: `Insufficient stock for ${prod.name}` });
      txnItems.push({ product: prod._id, name: prod.name, price: prod.price, quantity: it.quantity });
      total += prod.price * it.quantity;
    }

    // Decrement stock
    for (const it of items) {
      await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -it.quantity } });
    }

    const txn = new Transaction({ items: txnItems, total, cashier: req.user.id, paymentMethod });
    await txn.save();
    res.status(201).json(txn);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET / - list transactions
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const txns = await Transaction.find().populate('cashier', 'email name').sort({ createdAt: -1 });
      return res.json(txns);
    }
    // cashier -> return only their transactions
    const txns = await Transaction.find({ cashier: req.user.id }).sort({ createdAt: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id - get single transaction (owner or admin)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id).populate('cashier', 'email name');
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });
    if (req.user.role !== 'admin' && txn.cashier._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(txn);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
