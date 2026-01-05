import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const resp = await api.get('products');
      setProducts(resp.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = products.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product === product._id);
      if (existing) {
        return prev.map(i => i.product === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: product._id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(i => i.product === productId ? { ...i, quantity: qty } : i));
  };

  const changeQty = (productId, delta) => {
    setCart(prev => prev.map(i => i.product === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product !== productId));
  };

  const subtotal = cart.reduce((s, it) => s + it.price * it.quantity, 0);
  const discountAmount = (() => {
    const v = Number(discountValue) || 0;
    if (v <= 0) return 0;
    if (discountType === 'percent') return Math.min(subtotal, subtotal * (v / 100));
    return Math.min(subtotal, v);
  })();
  const total = Math.max(0, subtotal - discountAmount);

  const processTransaction = async (paymentMethod = 'cash') => {
    if (!user) {
      setError('You must be logged in to process transactions');
      return;
    }
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const items = cart.map(i => ({ productId: i.product, quantity: i.quantity }));
      const resp = await api.post('transactions', { items, paymentMethod });
      // optionally could send discount info to backend; currently backend calculates totals
      setCart([]);
      setDiscountValue(0);
      navigate('/transactions');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Point of Sale</h2>

      <div style={{ display: 'flex', gap: 24 }}>
        <section style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <input placeholder="Search products" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', padding: 8 }} />
          </div>

          <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
            {filtered.map(p => (
              <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 12, color: '#666' }}>{p.category} • ${p.price.toFixed(2)} • stock: {p.stock}</div>
                </div>
                <div>
                  <button onClick={() => addToCart(p)}>Add</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside style={{ width: 420, border: '1px solid #eee', padding: 12 }}>
          <h3>Cart</h3>
          {cart.length === 0 && <div style={{ color: '#666' }}>Cart is empty</div>}
          {cart.map(it => (
            <div key={it.product} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ flex: 1 }}>
                <div><strong>{it.name}</strong></div>
                <div style={{ fontSize: 12, color: '#666' }}>${it.price.toFixed(2)}</div>
              </div>
              <div>
                <button onClick={() => changeQty(it.product, -1)}>-</button>
                <input type="number" value={it.quantity} onChange={e => updateQty(it.product, Number(e.target.value))} style={{ width: 50, textAlign: 'center' }} />
                <button onClick={() => changeQty(it.product, 1)}>+</button>
              </div>
              <div>
                <button onClick={() => removeFromCart(it.product)}>Remove</button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label>Discount:</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)}>
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} style={{ width: 100 }} />
            </div>

            <div style={{ marginTop: 12 }}>
              <div>Subtotal: ${subtotal.toFixed(2)}</div>
              <div>Discount: -${discountAmount.toFixed(2)}</div>
              <div style={{ fontWeight: 'bold' }}>Total: ${total.toFixed(2)}</div>
            </div>

            {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => processTransaction('cash')} disabled={loading}>{loading ? 'Processing...' : 'Pay Cash'}</button>
              <button onClick={() => processTransaction('card')} disabled={loading}>{loading ? 'Processing...' : 'Pay Card'}</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
