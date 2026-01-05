require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./Product');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/pos_db';

const sampleProducts = [
  { name: 'Espresso', price: 2.5, category: 'Drink', stock: 100 },
  { name: 'Cappuccino', price: 3.5, category: 'Drink', stock: 80 },
  { name: 'Latte', price: 3.75, category: 'Drink', stock: 80 },
  { name: 'Black Tea', price: 2.0, category: 'Drink', stock: 60 },
  { name: 'Orange Juice', price: 3.0, category: 'Drink', stock: 50 },
  { name: 'Bottled Water', price: 1.0, category: 'Drink', stock: 200 },

  { name: 'Cheeseburger', price: 5.5, category: 'Food', stock: 40 },
  { name: 'Veggie Sandwich', price: 4.5, category: 'Food', stock: 35 },
  { name: 'French Fries', price: 2.5, category: 'Food', stock: 120 },
  { name: 'Chicken Wrap', price: 5.0, category: 'Food', stock: 45 },
  { name: 'Margherita Pizza Slice', price: 3.0, category: 'Food', stock: 60 },
  { name: 'Caesar Salad', price: 4.0, category: 'Food', stock: 30 },
  { name: 'Chocolate Cake (slice)', price: 2.75, category: 'Food', stock: 25 }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to', MONGODB_URL);

    const results = { created: [], updated: [] };

    for (const p of sampleProducts) {
      const existing = await Product.findOne({ name: p.name });
      if (existing) {
        existing.price = p.price;
        existing.category = p.category;
        existing.stock = Math.max(existing.stock || 0, p.stock);
        await existing.save();
        results.updated.push(p.name);
      } else {
        await Product.create(p);
        results.created.push(p.name);
      }
    }

    console.log('Seed completed:', results);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
