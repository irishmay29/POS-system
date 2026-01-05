const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
});

const transactionSchema = new mongoose.Schema({
  items: [transactionItemSchema],
  total: { type: Number, required: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
'use strict';

/**
 * Simple sales Transaction module
 * Usage:
 *   const Transaction = require('./Transaction');
 *   const tx = new Transaction({ taxIncluded: false });
 *   tx.addItem({ sku: 'A1', name: 'Widget', price: 9.99, qty: 2, taxRate: 0.07 });
 *   tx.applyDiscount({ type: 'percent', value: 10 }); // 10% off subtotal
 *   tx.processPayment({ amount: 20, method: 'cash' });
 */

class Transaction {
    constructor(opts = {}) {
        this.id = opts.id || Transaction._generateId();
        this.createdAt = opts.createdAt || new Date().toISOString();
        this.items = []; // { sku, name, price, qty, taxRate, lineDiscount }
        this.payments = []; // { amount, method, at }
        this.discounts = []; // global discounts: { type: 'percent'|'amount', value }
        this.taxIncluded = !!opts.taxIncluded; // are prices tax-included
        this.meta = opts.meta || {};
        this.status = 'open'; // open | paid | refunded | cancelled
    }

    static _generateId() {
        return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    }

    static _round(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    addItem(item) {
        if (!item || typeof item.price !== 'number' || !item.qty) throw new Error('Invalid item');
        const entry = {
            sku: item.sku || null,
            name: item.name || 'Item',
            price: Number(item.price),
            qty: Number(item.qty),
            taxRate: Number(item.taxRate || 0),
            lineDiscount: item.lineDiscount || null // { type, value }
        };
        this.items.push(entry);
        return entry;
    }

    removeItem(indexOrMatcher) {
        if (typeof indexOrMatcher === 'number') {
            if (indexOrMatcher < 0 || indexOrMatcher >= this.items.length) throw new Error('Index out of range');
            return this.items.splice(indexOrMatcher, 1)[0];
        }
        const idx = this.items.findIndex(i => {
            if (typeof indexOrMatcher === 'function') return indexOrMatcher(i);
            if (typeof indexOrMatcher === 'string') return i.sku === indexOrMatcher;
            return false;
        });
        if (idx === -1) return null;
        return this.items.splice(idx, 1)[0];
    }

    updateItemQty(indexOrSku, qty) {
        const item = typeof indexOrSku === 'number'
            ? this.items[indexOrSku]
            : this.items.find(i => i.sku === indexOrSku);
        if (!item) throw new Error('Item not found');
        item.qty = Number(qty);
        return item;
    }

    applyDiscount(discount) {
        // discount: { type: 'percent'|'amount', value: number }
        if (!discount || (discount.type !== 'percent' && discount.type !== 'amount')) {
            throw new Error('Invalid discount');
        }
        this.discounts.push({ type: discount.type, value: Number(discount.value) });
        return discount;
    }

    clearDiscounts() {
        this.discounts = [];
    }

    subtotal() {
        const subtotal = this.items.reduce((sum, it) => sum + it.price * it.qty, 0);
        return Transaction._round(subtotal);
    }

    totalLineDiscounts() {
        // sum of per-line discounts (supports percent or amount)
        let total = 0;
        for (const it of this.items) {
            if (!it.lineDiscount) continue;
            if (it.lineDiscount.type === 'percent') {
                total += (it.price * it.qty) * (it.lineDiscount.value / 100);
            } else {
                total += Number(it.lineDiscount.value);
            }
        }
        return Transaction._round(total);
    }

    totalGlobalDiscounts() {
        const base = this.subtotal() - this.totalLineDiscounts();
        let total = 0;
        for (const d of this.discounts) {
            if (d.type === 'percent') total += base * (d.value / 100);
            else total += Number(d.value);
        }
        return Transaction._round(total);
    }

    totalTax() {
        // compute tax per item after line discounts and proportionally after global discounts
        const subtotal = this.subtotal();
        const lineDiscounts = this.totalLineDiscounts();
        const globalDiscounts = this.totalGlobalDiscounts();
        const taxableBase = subtotal - lineDiscounts - globalDiscounts;
        if (taxableBase <= 0) return 0;

        // distribute global discounts proportionally per line and compute tax
        let tax = 0;
        const subtotalBefore = subtotal;
        for (const it of this.items) {
            const lineTotal = it.price * it.qty;
            const lineAfterLineDiscount = lineTotal - (it.lineDiscount ? (it.lineDiscount.type === 'percent' ? lineTotal * (it.lineDiscount.value/100) : it.lineDiscount.value) : 0);
            // proportion of global discounts applied to this line:
            const prop = subtotalBefore > 0 ? lineAfterLineDiscount / subtotalBefore : 0;
            const lineAfterAllDiscounts = lineAfterLineDiscount - (globalDiscounts * prop);
            const taxableAmount = this.taxIncluded ? lineAfterAllDiscounts / (1 + it.taxRate) : lineAfterAllDiscounts;
            const lineTax = taxableAmount * it.taxRate;
            tax += lineTax;
        }
        return Transaction._round(Math.max(0, tax));
    }

    total() {
        const subtotal = this.subtotal();
        const lineDiscounts = this.totalLineDiscounts();
        const globalDiscounts = this.totalGlobalDiscounts();
        const tax = this.totalTax();
        if (this.taxIncluded) {
            // prices already include tax -> total is subtotal minus discounts
            return Transaction._round(Math.max(0, subtotal - lineDiscounts - globalDiscounts));
        }
        return Transaction._round(Math.max(0, subtotal - lineDiscounts - globalDiscounts + tax));
    }

    amountDue() {
        return Transaction._round(Math.max(0, this.total() - this.totalPaid()));
    }

    totalPaid() {
        return Transaction._round(this.payments.reduce((s, p) => s + p.amount, 0));
    }

    processPayment(payment) {
        // payment: { amount, method }
        if (!payment || typeof payment.amount !== 'number' || payment.amount <= 0) {
            throw new Error('Invalid payment');
        }
        if (this.status === 'paid') throw new Error('Transaction already paid');
        const pay = {
            amount: Transaction._round(payment.amount),
            method: payment.method || 'unknown',
            at: new Date().toISOString()
        };
        this.payments.push(pay);

        if (this.amountDue() <= 0) {
            this.status = 'paid';
        }
        return {
            paid: this.totalPaid(),
            due: this.amountDue(),
            status: this.status,
            change: Transaction._round(Math.max(0, this.totalPaid() - this.total()))
        };
    }

    refund(amount) {
        // simple refund: mark refunded amount and adjust payments array with negative payment
        const amt = Transaction._round(Number(amount));
        if (amt <= 0) throw new Error('Invalid refund amount');
        this.payments.push({ amount: -amt, method: 'refund', at: new Date().toISOString() });
        if (this.totalPaid() < this.total()) this.status = 'open';
        return { refunded: amt, totalPaid: this.totalPaid(), status: this.status };
    }

    cancel() {
        this.status = 'cancelled';
        return this;
    }

    receipt() {
        return {
            id: this.id,
            createdAt: this.createdAt,
            status: this.status,
            items: this.items.map(it => ({
                sku: it.sku, name: it.name, price: Transaction._round(it.price), qty: it.qty, taxRate: it.taxRate
            })),
            subtotal: this.subtotal(),
            lineDiscounts: this.totalLineDiscounts(),
            globalDiscounts: this.totalGlobalDiscounts(),
            tax: this.totalTax(),
            total: this.total(),
            payments: this.payments.slice(),
            paid: this.totalPaid(),
            due: this.amountDue()
        };
    }

    toJSON() {
        return {
            id: this.id,
            createdAt: this.createdAt,
            items: this.items,
            payments: this.payments,
            discounts: this.discounts,
            taxIncluded: this.taxIncluded,
            meta: this.meta,
            status: this.status
        };
    }

    static fromJSON(data = {}) {
        const tx = new Transaction({ id: data.id, createdAt: data.createdAt, taxIncluded: data.taxIncluded, meta: data.meta });
        tx.items = Array.isArray(data.items) ? data.items.slice() : [];
        tx.payments = Array.isArray(data.payments) ? data.payments.slice() : [];
        tx.discounts = Array.isArray(data.discounts) ? data.discounts.slice() : [];
        tx.status = data.status || tx.status;
        return tx;
    }
}

module.exports = Transaction;