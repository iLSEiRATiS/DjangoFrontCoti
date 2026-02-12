// src/components/Footer.jsx
import { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaInstagram, FaEnvelope, FaPhoneAlt, FaArrowUp } from 'react-icons/fa';

const Footer = () => {
  const year = new Date().getFullYear();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 200);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <>
      <footer className="footer-modern text-white mt-4 pt-4" role="contentinfo">
        <Container>
          <Row className="gy-4 align-items-start">
            <Col md={5}>
              <div className="footer-brand">
                <h5 className="mb-2">CotiStore</h5>
                <p className="mb-0 text-white-50 small">
                  Mayorista de artículos de cotillón, repostería, papelería y librería. Calidad y buen precio.
                </p>
              </div>
            </Col>

            <Col md={4}>
              <h6 className="text-uppercase fw-semibold small mb-3 text-white-50">Contacto</h6>
              <ul className="list-unstyled mb-0 small footer-contact">
                <li className="d-flex align-items-center">
                  <span className="footer-icon" aria-hidden>
                    <FaEnvelope />
                  </span>
                  <a
                    href="mailto:ventascotistore@gmail.com"
                    className="link-light text-decoration-none"
                  >
                    ventascotistore@gmail.com
                  </a>
                </li>
                <li className="d-flex align-items-center mt-2">
                  <span className="footer-icon" aria-hidden>
                    <FaPhoneAlt />
                  </span>
                  <a href="tel:+541139581816" className="link-light text-decoration-none">
                    11 3958-1816
                  </a>
                </li>
              </ul>
            </Col>

            <Col md={3}>
              <h6 className="text-uppercase fw-semibold small mb-3 text-white-50">Seguinos</h6>
              <div className="d-flex flex-column gap-2">
                <a
                  href="https://www.instagram.com/cotistore_mayorista"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social footer-social-icon"
                  aria-label="Instagram de CotiStore (se abre en una pestaña nueva)"
                >
                  <span className="footer-icon" aria-hidden>
                    <FaInstagram />
                  </span>
                </a>
              </div>
            </Col>
          </Row>

          <div className="footer-divider" />

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pb-2">
            <small className="text-white-50">
              © {year} CotiStore — Todos los derechos reservados.
            </small>
          </div>
        </Container>
      </footer>

      {showTop && (
        <button
          type="button"
          onClick={scrollTop}
          aria-label="Subir al inicio"
          className="btn btn-primary shadow position-fixed"
          style={{ right: 16, bottom: 16, borderRadius: '9999px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}
        >
          <FaArrowUp />
        </button>
      )}
    </>
  );
};

export default Footer;

