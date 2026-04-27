import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from 'react-bootstrap';
import { useCart } from '../context/CartContext';

export default function CartToast() {
  const { cartNotice, dismissCartNotice } = useCart();
  const [renderNotice, setRenderNotice] = useState(null);

  useEffect(() => {
    if (cartNotice) setRenderNotice(cartNotice);
  }, [cartNotice]);

  useEffect(() => {
    if (!cartNotice?.id) return undefined;
    const timer = window.setTimeout(() => {
      dismissCartNotice();
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [cartNotice?.id, dismissCartNotice]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="cart-toast-layer" aria-live="polite" aria-atomic="true">
      <div className="cart-toast-container">
        <Toast
          show={Boolean(cartNotice)}
          onClose={dismissCartNotice}
          onExited={() => setRenderNotice(null)}
          className={`cart-toast cart-toast-${renderNotice?.tone || 'success'} shadow`}
        >
          <div className="cart-toast-progress" key={renderNotice?.id || 'idle'} />
          <Toast.Header closeButton className="cart-toast-header">
            <div className="cart-toast-mark" aria-hidden="true">
              {renderNotice?.tone === 'danger' ? '−' : '✓'}
            </div>
            <div className="cart-toast-heading">
              <strong>{renderNotice?.title || 'Carrito'}</strong>
              <small>Ahora</small>
            </div>
          </Toast.Header>
          <Toast.Body className="cart-toast-body">
            <div className="cart-toast-product">{renderNotice?.productName || ''}</div>
            <div className="cart-toast-copy">{renderNotice?.message || ''}</div>
          </Toast.Body>
        </Toast>
      </div>
    </div>,
    document.body,
  );
}
