import { useEffect, useState } from 'react';
import {
  Offcanvas,
  Button,
  Card,
  Image,
  Row,
  Col,
  OverlayTrigger,
  Tooltip,
  Form,
  Alert,
} from 'react-bootstrap';
import { FaTrash, FaPlus, FaMinus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../lib/api';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

const CarritoOffcanvas = ({ show, handleClose }) => {
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    getTotalPrice,
    clearCart,
    setQuantity,
  } = useCart();
  const navigate = useNavigate();
  const [minOrderAmount, setMinOrderAmount] = useState(100000);

  const totalPrice = getTotalPrice();
  const belowMinimum = totalPrice < minOrderAmount;
  useEffect(() => {
    let alive = true;
    api.products.storeConfig()
      .then((data) => {
        if (!alive) return;
        setMinOrderAmount(Number(data?.minOrderAmount || 100000));
      })
      .catch(() => {
        if (!alive) return;
        setMinOrderAmount(100000);
      });
    return () => { alive = false; };
  }, []);

  const handleChange = (id, value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const item = cartItems.find((x) => String(x.id) === String(id));
    const maxStock = Number.isFinite(Number(item?.maxStock)) ? Number(item.maxStock) : 9999;
    const cap = Math.min(9999, maxStock);
    setQuantity(id, Math.max(1, Math.min(cap, Math.trunc(num))));
  };

  const goCheckout = () => {
    if (!cartItems.length || belowMinimum) return;
    if (handleClose) handleClose();
    navigate('/checkout');
  };

  return (
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="end"
      className="cart-offcanvas"
      aria-labelledby="carrito-offcanvas-title"
      backdrop
      scroll={false}
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title id="carrito-offcanvas-title" className="fw-bold">
          Tu carrito
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body>
        {cartItems.length === 0 ? (
          <p className="text-center mt-5 text-muted">Carrito vacio.</p>
        ) : (
          <>
            {belowMinimum && (
              <Alert variant="warning" className="small">
                ¡Ya casi terminás tu compra! El mínimo es de {money.format(minOrderAmount)}. Podés agregar algunos productos más para alcanzarlo. ¡Gracias!
              </Alert>
            )}

            {cartItems.map((item) => (
              <Card key={item.id} className="mb-3 shadow-sm border-0">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col xs={3}>
                      <Image
                        src={item.imagen}
                        alt={item.nombre}
                        fluid
                        roundedCircle
                        style={{ width: 60, height: 60, objectFit: 'cover' }}
                      />
                    </Col>

                    <Col xs={6} className="d-flex flex-column align-items-center">
                      <OverlayTrigger placement="top" overlay={<Tooltip>{item.nombre}</Tooltip>}>
                        <span
                          className="fw-semibold text-center mb-2 text-truncate w-100"
                          style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                        >
                          {item.nombre}
                        </span>
                      </OverlayTrigger>
                      {item.atributos && Object.keys(item.atributos).length > 0 && (
                        <div className="text-muted small text-center mb-2">
                          {Object.entries(item.atributos)
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                            .join(' · ')}
                        </div>
                      )}

                      <div className="d-flex align-items-center justify-content-center gap-2">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => decreaseQuantity(item.id)}
                          aria-label={`Disminuir cantidad de ${item.nombre}`}
                        >
                          <FaMinus />
                        </Button>

                        <Form.Control
                          size="sm"
                          type="number"
                          min={1}
                          max={9999}
                          value={item.cantidad}
                          onChange={(e) => handleChange(item.id, e.target.value)}
                          style={{ width: 72, textAlign: 'center' }}
                          aria-label={`Cantidad para ${item.nombre}`}
                        />

                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => increaseQuantity(item.id)}
                          aria-label={`Aumentar cantidad de ${item.nombre}`}
                        >
                          <FaPlus />
                        </Button>
                      </div>
                    </Col>

                    <Col xs={3} className="text-end">
                      <small className="text-muted fw-semibold">
                        {money.format(Number(item.precio ?? item.price ?? 0) * item.cantidad)}
                      </small>
                      <br />
                      <Button
                        size="sm"
                        variant="outline-danger"
                        className="mt-2"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Eliminar ${item.nombre}`}
                      >
                        <FaTrash />
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}

            <hr />

            <div className="mb-3 text-end">
              <h5 className="fw-bold mb-1">Total: {money.format(totalPrice)}</h5>
              <div className="text-muted small">Minimo: {money.format(minOrderAmount)}</div>
            </div>

            <Button variant="danger" className="w-100 mb-2" onClick={clearCart}>
              Vaciar carrito
            </Button>
            <Button
              variant="success"
              className="w-100"
              onClick={goCheckout}
              disabled={belowMinimum}
            >
              Confirmar pedido
            </Button>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default CarritoOffcanvas;
