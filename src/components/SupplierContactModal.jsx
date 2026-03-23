import { useEffect, useRef, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

import api from '../lib/api';

const TURNSTILE_SITE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TURNSTILE_SITE_KEY) ||
  ((typeof process !== 'undefined' && process.env && process.env.REACT_APP_TURNSTILE_SITE_KEY) || '') ||
  '';

const EMPTY_CONTACT_FORM = {
  nombre: '',
  apellido: '',
  telefono: '',
  mensaje: '',
  archivo: null,
};

const SupplierContactModal = ({ show, onHide }) => {
  const [contactSent, setContactSent] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactCaptchaToken, setContactCaptchaToken] = useState('');
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

  useEffect(() => {
    if (!show || !TURNSTILE_SITE_KEY) return undefined;
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
  }, [show]);

  useEffect(() => {
    if (!show) return;
    setContactSent(false);
    setContactError('');
    setContactCaptchaToken('');
  }, [show]);

  const closeModal = () => {
    setContactCaptchaToken('');
    if (window.turnstile && turnstileWidgetIdRef.current !== null) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
    onHide();
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
      setContactError('Completa el captcha antes de enviar el contacto.');
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

    api.contact.createSupplierContact(formData)
      .then(() => {
        setContactSent(true);
        setContactCaptchaToken('');
        setContactForm(EMPTY_CONTACT_FORM);
        if (window.turnstile && turnstileWidgetIdRef.current !== null) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
      })
      .catch((err) => {
        setContactError(err?.message || 'No se pudo enviar el contacto.');
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
    <Modal show={show} onHide={closeModal} centered dialogClassName="contact-modal">
      <Modal.Header closeButton className="contact-modal-header">
        <div>
          <div className="contact-kicker">Contacto para proveedores</div>
          <Modal.Title>{'\u00bfQuer\u00e9s ser proveedor de CotiStore?'}</Modal.Title>
        </div>
      </Modal.Header>
      <Modal.Body className="contact-modal-body">
        <p className="contact-modal-copy">
          Si est{'\u00e1'} interesado en trabajar con nosotros como proveedor, puede escribirnos para coordinar una reuni{'\u00f3'}n y as{'\u00ed'} conocer mejor sus productos. Tambi{'\u00e9'}n puede enviarnos su lista de precios.
        </p>
        <p className="contact-modal-copy contact-modal-copy-secondary">
          Es importante para nosotros contar con proveedores que cumplan con los plazos de entrega.
        </p>
        {contactSent ? (
          <div className="contact-success">
            Recibimos su mensaje. Nos pondremos en contacto para evaluar una posible reuni{'\u00f3'}n comercial.
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
            <Form.Label>N{'\u00fa'}mero de tel{'\u00e9'}fono</Form.Label>
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
              placeholder={'Contanos sobre tu empresa, los productos que ofrec\u00e9s, condiciones comerciales o cualquier dato relevante.'}
              required
            />
          </Form.Group>
          <Form.Group className="contact-form-full">
            <Form.Label>Adjuntar lista de precios o presentaci{'\u00f3'}n</Form.Label>
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
            <Button type="button" variant="outline-secondary" onClick={closeModal}>
              Cerrar
            </Button>
            <Button type="submit" className="contact-submit-btn" disabled={contactSubmitting}>
              {contactSubmitting ? 'Enviando...' : 'Enviar contacto'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default SupplierContactModal;
