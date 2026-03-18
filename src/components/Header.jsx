// frontend/src/components/Header.jsx
import { useEffect, useRef, useState } from 'react';
import {
  Navbar,
  Nav,
  Container,
  Form,
  InputGroup,
  Button,
  Offcanvas,
  ListGroup,
  Modal
} from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaShoppingBag, FaBars } from 'react-icons/fa';

import { useCart } from '../context/CartContext';
import CarritoOffcanvas from './CarritoOffcanvas';
import logo from '../assets/logo-coti-optimized.webp';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE } from '../lib/api';

const TURNSTILE_SITE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TURNSTILE_SITE_KEY) ||
  ((typeof process !== 'undefined' && process.env && process.env.REACT_APP_TURNSTILE_SITE_KEY) || '') ||
  '';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalItems } = useCart();
  const cantidad = getTotalItems();
  const { user, logout } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [hideMobileHeader, setHideMobileHeader] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactCaptchaToken, setContactCaptchaToken] = useState('');
  const [contactForm, setContactForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    mensaje: '',
    archivo: null,
  });
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const current = qs.get('search') || '';
    setSearchTerm(current);
  }, [location.search]);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const goingDown = y > lastY;
          const shouldHide = goingDown && y > 80;
          setHideMobileHeader(shouldHide);
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!showContactModal || !TURNSTILE_SITE_KEY) return undefined;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile) return;
      turnstileRef.current.innerHTML = '';
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: (token) => setContactCaptchaToken(token),
        'expired-callback': () => setContactCaptchaToken(''),
        'error-callback': () => setContactCaptchaToken(''),
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector('script[data-turnstile-script="true"]');
      if (existing) {
        existing.addEventListener('load', renderWidget, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = 'true';
        script.addEventListener('load', renderWidget, { once: true });
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [showContactModal]);

  const submitSearch = (e) => {
    e?.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/productos?search=${encodeURIComponent(q)}`);
    } else {
      navigate('/productos');
    }
    setShowSearch(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openContactModal = () => {
    setContactSent(false);
    setContactError('');
    setContactCaptchaToken('');
    setShowContactModal(true);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setContactCaptchaToken('');
    if (window.turnstile && turnstileWidgetIdRef.current !== null) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  };

  const handleContactChange = (e) => {
    const { name, value, files } = e.target;
    setContactForm((prev) => ({
      ...prev,
      [name]: name === 'archivo' ? (files?.[0] || null) : value,
    }));
  };

  const submitContactForm = (e) => {
    e.preventDefault();
    if (TURNSTILE_SITE_KEY && !contactCaptchaToken) {
      setContactError('Completa el captcha antes de enviar la postulacion.');
      return;
    }
    setContactSubmitting(true);
    setContactError('');
    const formData = new FormData();
    formData.append('nombre', contactForm.nombre);
    formData.append('apellido', contactForm.apellido);
    formData.append('telefono', contactForm.telefono);
    formData.append('mensaje', contactForm.mensaje);
    if (contactForm.archivo) formData.append('archivo', contactForm.archivo);
    if (contactCaptchaToken) formData.append('turnstileToken', contactCaptchaToken);

    api.contact.createJobApplication(formData)
      .then(() => {
        setContactSent(true);
        setContactCaptchaToken('');
        setContactForm({
          nombre: '',
          apellido: '',
          telefono: '',
          mensaje: '',
          archivo: null,
        });
        if (window.turnstile && turnstileWidgetIdRef.current !== null) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
      })
      .catch((err) => {
        setContactError(err?.message || 'No se pudo enviar la postulacion.');
        setContactCaptchaToken('');
        if (window.turnstile && turnstileWidgetIdRef.current !== null) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
      })
      .finally(() => {
        setContactSubmitting(false);
      });
  };

  return (
    <>
      {/* DESKTOP */}
      <Navbar
        expand="md"
        variant="dark"
        sticky="top"
        className={`header-navbar d-none d-md-flex${hideMobileHeader ? ' is-hidden' : ''}`}
      >
        <Container fluid className="align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <Navbar.Brand as={Link} to="/" className="brand d-flex align-items-center m-0">
              <img src={logo} alt="CotiStore" className="brand-logo" loading="eager" decoding="async" />
            </Navbar.Brand>
            <Nav className="align-items-center gap-3 desktop-main-nav">
              <Nav.Link as={Link} to="/" className="nav-link-plain">Inicio</Nav.Link>
              <Nav.Link as={Link} to="/productos" className="nav-link-plain">Productos</Nav.Link>
              <Button type="button" className="header-contact-btn" onClick={openContactModal}>Contacto</Button>
              {user?.role === 'admin' && (
                <Nav.Link as={Link} to="/admin" className="nav-link-plain">Admin</Nav.Link>
              )}
            </Nav>
          </div>

          <div className="d-flex align-items-center gap-3">
            <Form className="header-search-form" onSubmit={submitSearch} role="search" aria-label="Buscar productos">
              <InputGroup className="header-search">
                <Form.Control
                  type="search"
                  placeholder="Buscar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button type="submit" className="btn-search-accent" aria-label="Buscar">
                  <FaSearch className="search-icon" />
                </Button>
              </InputGroup>
            </Form>

            <Nav className="align-items-center gap-3">
              {user ? (
                <>
                  <span className="header-user-name d-flex align-items-center gap-2">
                    {(() => {
                      let a = user?.profile?.avatar || '';
                      if (a && a.startsWith('/')) a = `${API_BASE}${a}`;
                      return a ? (
                        <img src={a} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : null;
                    })()}
                    <strong>{user.name}</strong>
                  </span>
                  <Nav.Link as={Link} to="/account" className="nav-link-plain">Mi cuenta</Nav.Link>
                  <Button className="header-logout-btn" size="sm" onClick={logout}>Salir</Button>
                </>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login" className="nav-link-plain">Iniciar sesión</Nav.Link>
                  <Nav.Link as={Link} to="/register" className="nav-link-plain">Registrarte</Nav.Link>
                </>
              )}

              {user && (
                <Button
                  variant="link"
                  className="cart-icon-btn position-relative p-0"
                  onClick={() => setShowCart(true)}
                  aria-label="Abrir carrito"
                >
                  <FaShoppingBag />
                  {cantidad > 0 && <span className="badge cart-badge">{cantidad}</span>}
                </Button>
              )}
            </Nav>
          </div>
        </Container>
      </Navbar>

      {/* MÓVIL */}
      <header className={`mobile-header d-md-none${hideMobileHeader ? ' is-hidden' : ''}`}>
        <div className="mobile-topbar">
          <Link to="/" className="mobile-brand">
            <img src={logo} alt="CotiStore" loading="eager" decoding="async" />
          </Link>

          <button className="icon-btn" aria-label="Buscar" onClick={() => setShowSearch(true)}>
            <FaSearch className="search-icon" />
          </button>

          <button className="icon-btn cart" aria-label="Abrir carrito" onClick={() => setShowCart(true)}>
            <FaShoppingBag />
            {cantidad > 0 && <span className="badge cart-badge">{cantidad}</span>}
          </button>
        </div>

        <div className="mobile-navrow">
          <button className="hamburger-btn" onClick={() => setShowMobileMenu(true)} aria-label="Abrir menú">
            <FaBars />
          </button>
        </div>
      </header>

      <Offcanvas show={showSearch} onHide={() => setShowSearch(false)} placement="top" scroll backdrop>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Buscar productos</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Form onSubmit={submitSearch}>
            <InputGroup>
              <Form.Control
                autoFocus
                type="search"
                placeholder="Buscar por nombre o categoría…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" className="btn-search-accent">Buscar</Button>
            </InputGroup>
          </Form>
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menú</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ListGroup variant="flush" as="nav">
            <ListGroup.Item className="mobile-contact-item" action onClick={() => { setShowMobileMenu(false); openContactModal(); }}>
              Contacto
            </ListGroup.Item>
            <ListGroup.Item action as={Link} to="/productos" onClick={() => setShowMobileMenu(false)}>
              Tienda
            </ListGroup.Item>

            {user?.role === 'admin' && (
              <ListGroup.Item action as={Link} to="/admin" onClick={() => setShowMobileMenu(false)}>
                Admin
              </ListGroup.Item>
            )}

            {user ? (
              <>
                <ListGroup.Item className="text-muted">
                  Sesión: <strong>{user.name}</strong>
                </ListGroup.Item>
                <ListGroup.Item action as={Link} to="/account" onClick={() => setShowMobileMenu(false)}>
                  Mi cuenta
                </ListGroup.Item>
                <ListGroup.Item action onClick={() => { logout(); setShowMobileMenu(false); }}>
                  Cerrar sesión
                </ListGroup.Item>
              </>
            ) : (
              <>
                <ListGroup.Item action as={Link} to="/login" onClick={() => setShowMobileMenu(false)}>
                  Iniciar sesión
                </ListGroup.Item>
                <ListGroup.Item action as={Link} to="/register" onClick={() => setShowMobileMenu(false)}>
                  Registrarse
                </ListGroup.Item>
              </>
            )}
          </ListGroup>
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={showContactModal} onHide={closeContactModal} centered dialogClassName="contact-modal">
        <Modal.Header closeButton className="contact-modal-header">
          <div>
            <div className="contact-kicker">Contacto para proveedores</div>
            <Modal.Title>¿Querés ser proveedor de CotiStore?</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className="contact-modal-body">
          <p className="contact-modal-copy">
            Si está interesado en trabajar con nosotros como proveedor, puede escribirnos para coordinar una reunión y así conocer mejor sus productos. También puede enviarnos su lista de precios.
          </p>
          <p className="contact-modal-copy contact-modal-copy-secondary">
            Es importante para nosotros contar con proveedores que cumplan con los plazos de entrega.
          </p>
          {contactSent ? (
            <div className="contact-success">
              Recibimos su mensaje. Nos pondremos en contacto para evaluar una posible reunión comercial.
            </div>
          ) : null}
          {contactError ? (
            <div className="contact-error">
              {contactError}
            </div>
          ) : null}
          <Form onSubmit={submitContactForm} className="contact-form-grid">
            <Form.Group>
              <Form.Label>Nombre</Form.Label>
              <Form.Control name="nombre" value={contactForm.nombre} onChange={handleContactChange} placeholder="Tu nombre" required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Apellido</Form.Label>
              <Form.Control name="apellido" value={contactForm.apellido} onChange={handleContactChange} placeholder="Tu apellido" required />
            </Form.Group>
            <Form.Group className="contact-form-full">
              <Form.Label>Número de teléfono</Form.Label>
              <Form.Control name="telefono" value={contactForm.telefono} onChange={handleContactChange} placeholder="11 2345 6789" required />
            </Form.Group>
            <Form.Group className="contact-form-full">
              <Form.Label>Mensaje</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                name="mensaje"
                value={contactForm.mensaje}
                onChange={handleContactChange}
                placeholder="Contanos sobre tu empresa, los productos que ofrecés, condiciones comerciales o cualquier dato relevante."
                required
              />
            </Form.Group>
            <Form.Group className="contact-form-full">
              <Form.Label>Adjuntar lista de precios o presentación</Form.Label>
              <Form.Control
                type="file"
                name="archivo"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleContactChange}
              />
              <Form.Text className="contact-file-help">
                Formatos admitidos: PDF, DOC y DOCX.
              </Form.Text>
            </Form.Group>
            {TURNSTILE_SITE_KEY ? (
              <div className="contact-form-full">
                <div className="contact-captcha-wrap">
                  <div ref={turnstileRef} />
                </div>
              </div>
            ) : null}
            <div className="contact-form-actions">
              <Button type="button" variant="outline-secondary" onClick={closeContactModal}>
                Cerrar
              </Button>
              <Button type="submit" className="contact-submit-btn" disabled={contactSubmitting}>
                {contactSubmitting ? 'Enviando...' : 'Enviar contacto'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <CarritoOffcanvas show={showCart} handleClose={() => setShowCart(false)} />
    </>
  );
};

export default Header;
