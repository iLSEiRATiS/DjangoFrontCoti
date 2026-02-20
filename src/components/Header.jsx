// frontend/src/components/Header.jsx
import { useEffect, useState } from 'react';
import {
  Navbar,
  Nav,
  Container,
  Form,
  InputGroup,
  Button,
  Offcanvas,
  ListGroup
} from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaShoppingBag, FaBars } from 'react-icons/fa';

import { useCart } from '../context/CartContext';
import CarritoOffcanvas from './CarritoOffcanvas';
import logo from '../assets/logo-coti.png';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/api';

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
              <img src={logo} alt="CotiStore" className="brand-logo" />
            </Navbar.Brand>
            <Nav className="align-items-center gap-3 desktop-main-nav">
              <Nav.Link as={Link} to="/" className="nav-link-plain">Inicio</Nav.Link>
              <Nav.Link as={Link} to="/productos" className="nav-link-plain">Productos</Nav.Link>
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
            <img src={logo} alt="CotiStore" />
          </Link>

          <button className="icon-btn" aria-label="Buscar" onClick={() => setShowSearch(true)}>
            <FaSearch className="search-icon" />
          </button>

          {user && (
            <button className="icon-btn cart" aria-label="Abrir carrito" onClick={() => setShowCart(true)}>
              <FaShoppingBag />
              {cantidad > 0 && <span className="badge cart-badge">{cantidad}</span>}
            </button>
          )}
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

      {user && <CarritoOffcanvas show={showCart} handleClose={() => setShowCart(false)} />}
    </>
  );
};

export default Header;


