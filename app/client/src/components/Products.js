import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function Products() {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('products')
      .then(res => { if (mounted) setProducts(res.data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const found = prev.find(p => p.productId === product._id);
      if (found) return prev.map(p => p.productId === product._id ? { ...p, quantity: p.quantity + qty } : p);
      return [...prev, { productId: product._id, name: product.name, price: product.price, quantity: qty }];
    });
  };

  const updateQuantity = (productId, qty) => {
    setCart(prev => prev.map(p => p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p));
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(p => p.productId !== productId));

  const total = cart.reduce((s, it) => s + it.price * it.quantity, 0);

  const checkout = async () => {
    if (!user) return alert('Please login to checkout');
    if (cart.length === 0) return alert('Cart is empty');
    setCheckingOut(true);
    try {
      const body = { items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })), paymentMethod: 'cash' };
      const resp = await api.post('transactions', body);
      alert('Checkout successful — transaction id: ' + resp.data._id);
      setCart([]);
      // refresh products (stock changed)
      const p = await api.get('products');
      setProducts(p.data);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Checkout failed';
      alert(msg);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Products</h2>
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
              {products.map(p => (
                <div key={p._id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div>Price: ${p.price.toFixed(2)}</div>
                  <div>Stock: {p.stock}</div>
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => addToCart(p)} disabled={p.stock <= 0}>Add to cart</button>
                    <button style={{ marginLeft: 8 }} onClick={() => addToCart(p, 5)} disabled={p.stock < 5}>+5</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside style={{ width: 360, border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
            <h3>Cart</h3>
            {cart.length === 0 ? <p>Your cart is empty</p> : (
              <div>
                {cart.map(it => (
                  <div key={it.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div>${it.price.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => updateQuantity(it.productId, it.quantity - 1)}>-</button>
                      <div>{it.quantity}</div>
                      <button onClick={() => updateQuantity(it.productId, it.quantity + 1)}>+</button>
                      <button onClick={() => removeFromCart(it.productId)}>Remove</button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #ddd', paddingTop: 8, marginTop: 8 }}>
                  <div style={{ fontWeight: 700 }}>Total: ${total.toFixed(2)}</div>
                  <div style={{ marginTop: 8 }}>
                    <button onClick={checkout} disabled={checkingOut}>{checkingOut ? 'Processing...' : 'Checkout'}</button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
