import React from 'react';

export default function LogoutModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Confirm logout">
        <h3 className="modal-title">Confirm logout</h3>
        <p>Are you sure you want to log out?</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>Log out</button>
        </div>
      </div>
    </div>
  );
}
