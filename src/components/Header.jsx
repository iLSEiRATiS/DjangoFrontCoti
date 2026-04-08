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
} from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaShoppingBag, FaBars } from 'react-icons/fa';

import { useCart } from '../context/CartContext';
import CarritoOffcanvas from './CarritoOffcanvas';
import SupplierContactModal from './SupplierContactModal';
import logo from '../assets/logo-coti-optimized.webp';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE } from '../lib/api';

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
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const current = qs.get('search') || '';
    setSearchTerm(current);
  }, [location.search]);

  useEffect(() => {
    const term = searchTerm.trim();
    const requestId = ++searchRequestRef.current;

    if (term.length < 2) {
      setSearchSuggestions([]);
      setSearchingSuggestions(false);
      setSuggestionsOpen(false);
      return;
    }

    setSearchingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.products.list({ q: term, page: 1, limit: 6 });
        if (requestId !== searchRequestRef.current) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setSearchSuggestions(items);
        setSuggestionsOpen(items.length > 0);
      } catch {
        if (requestId !== searchRequestRef.current) return;
        setSearchSuggestions([]);
        setSuggestionsOpen(false);
      } finally {
        if (requestId === searchRequestRef.current) setSearchingSuggestions(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const onPointerDown = (event) => {
      const desktopNode = desktopSearchRef.current;
      const mobileNode = mobileSearchRef.current;
      if (desktopNode?.contains(event.target) || mobileNode?.contains(event.target)) return;
      setSuggestionsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

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
    setSuggestionsOpen(false);
  };

  const goToProductsTop = (event) => {
    event?.preventDefault();
    setShowMobileMenu(false);
    navigate('/productos');
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const openProductFromSuggestion = (product) => {
    const productId = product?.id || product?._id || product?.slug;
    if (!productId) {
      submitSearch();
      return;
    }
    setSuggestionsOpen(false);
    setShowSearch(false);
    navigate(`/productos/${encodeURIComponent(productId)}`);
  };

  const renderSearchSuggestions = () => {
    if (!suggestionsOpen || searchTerm.trim().length < 2) return null;

    return (
      <div className="header-search-suggestions" role="listbox" aria-label="Sugerencias de búsqueda">
        <div className="header-search-suggestions-head">
          <span>Sugerencias</span>
          {searchingSuggestions ? <span className="header-search-suggestions-status">Buscando...</span> : null}
        </div>
        {searchSuggestions.map((item) => {
          let image = item?.imageUrl || item?.image_url || item?.imagen || (Array.isArray(item?.images) ? item.images[0] : '');
          if (typeof image === 'string' && image.startsWith('/')) image = `${API_BASE}${image}`;
          const category = item?.category?.name || item?.categoria || '';
          const productId = item?.id || item?._id || item?.slug || item?.name;
          return (
            <button
              key={`search-suggestion-${productId}`}
              type="button"
              className="header-search-suggestion-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => openProductFromSuggestion(item)}
            >
              <div className="header-search-suggestion-thumb">
                {image ? <img src={image} alt={item?.name || 'Producto'} /> : <span>•</span>}
              </div>
              <div className="header-search-suggestion-copy">
                <strong>{item?.name || item?.nombre || 'Producto'}</strong>
                {category ? <span>{category}</span> : null}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          className="header-search-suggestion-item header-search-suggestion-more"
          onMouseDown={(e) => e.preventDefault()}
          onClick={submitSearch}
        >
          Ver todos los resultados para "{searchTerm.trim()}"
        </button>
      </div>
    );
  };

  return (
    <>
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
              <Nav.Link as={Link} to="/productos" onClick={goToProductsTop} className="nav-link-plain">Productos</Nav.Link>
              <Button type="button" className="header-contact-btn" onClick={() => setShowContactModal(true)}>Contacto</Button>
              {user?.role === 'admin' && (
                <Nav.Link as={Link} to="/admin" className="nav-link-plain">Admin</Nav.Link>
              )}
            </Nav>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="header-search-shell" ref={desktopSearchRef}>
            <Form className="header-search-form" onSubmit={submitSearch} role="search" aria-label="Buscar productos">
              <InputGroup className="header-search">
                <Form.Control
                  type="search"
                  placeholder="Buscar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (searchSuggestions.length) setSuggestionsOpen(true);
                  }}
                />
                <Button type="submit" className="btn-search-accent" aria-label="Buscar">
                  <FaSearch className="search-icon" />
                </Button>
              </InputGroup>
            </Form>
            {renderSearchSuggestions()}
            </div>

            <Nav className="align-items-center gap-3">
              {user ? (
                <>
                  <span className="header-user-name d-flex align-items-center gap-2">
                    {(() => {
                      let avatar = user?.profile?.avatar || '';
                      if (avatar && avatar.startsWith('/')) avatar = `${API_BASE}${avatar}`;
                      return avatar ? (
                        <img src={avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : null;
                    })()}
                    <strong>{user.name}</strong>
                  </span>
                  <Nav.Link as={Link} to="/account" className="nav-link-plain">Mi cuenta</Nav.Link>
                  <Button className="header-logout-btn" size="sm" onClick={logout}>Salir</Button>
                </>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login" className="nav-link-plain">Iniciar sesion</Nav.Link>
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
          <button className="hamburger-btn" onClick={() => setShowMobileMenu(true)} aria-label="Abrir menu">
            <FaBars />
          </button>
        </div>
      </header>

      <Offcanvas show={showSearch} onHide={() => setShowSearch(false)} placement="top" scroll backdrop>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Buscar productos</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div ref={mobileSearchRef}>
          <Form onSubmit={submitSearch}>
            <InputGroup>
              <Form.Control
                autoFocus
                type="search"
                placeholder="Buscar por nombre o categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchSuggestions.length) setSuggestionsOpen(true);
                }}
              />
              <Button type="submit" className="btn-search-accent">Buscar</Button>
            </InputGroup>
          </Form>
          {renderSearchSuggestions()}
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ListGroup variant="flush" as="nav">
            <ListGroup.Item action as={Link} to="/" onClick={() => setShowMobileMenu(false)}>
              Inicio
            </ListGroup.Item>
            <ListGroup.Item
              className="mobile-contact-item"
              action
              onClick={() => {
                setShowMobileMenu(false);
                setShowContactModal(true);
              }}
            >
              Contacto
            </ListGroup.Item>
            <ListGroup.Item action as={Link} to="/productos" onClick={goToProductsTop}>
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
                  Sesion: <strong>{user.name}</strong>
                </ListGroup.Item>
                <ListGroup.Item action as={Link} to="/account" onClick={() => setShowMobileMenu(false)}>
                  Mi cuenta
                </ListGroup.Item>
                <ListGroup.Item action onClick={() => { logout(); setShowMobileMenu(false); }}>
                  Cerrar sesion
                </ListGroup.Item>
              </>
            ) : (
              <>
                <ListGroup.Item action as={Link} to="/login" onClick={() => setShowMobileMenu(false)}>
                  Iniciar sesion
                </ListGroup.Item>
                <ListGroup.Item action as={Link} to="/register" onClick={() => setShowMobileMenu(false)}>
                  Registrarse
                </ListGroup.Item>
              </>
            )}
          </ListGroup>
        </Offcanvas.Body>
      </Offcanvas>

      <SupplierContactModal show={showContactModal} onHide={() => setShowContactModal(false)} />
      <CarritoOffcanvas show={showCart} handleClose={() => setShowCart(false)} />
    </>
  );
};

export default Header;
