import { useEffect, useState } from 'react';
import { Button, Container, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../context/AuthContext';

const welcomeKeyFor = (user) => {
  const id = user?.id || user?._id || user?.username || user?.email;
  return id ? `welcome_shown_${id}` : '';
};

const Layout = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeKey, setWelcomeKey] = useState('');

  useEffect(() => {
    if (!user) {
      setShowWelcome(false);
      setWelcomeKey('');
      return;
    }
    const key = welcomeKeyFor(user);
    if (!key) return;
    setWelcomeKey(key);
    if (!localStorage.getItem(key)) {
      setShowWelcome(true);
    }
  }, [user]);

  const closeWelcome = () => {
    setShowWelcome(false);
    if (welcomeKey) localStorage.setItem(welcomeKey, '1');
  };
  const goToAccount = () => {
    closeWelcome();
    navigate('/account');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <Container as="main" className="my-4 flex-grow-1" role="main">
        {children}
      </Container>
      <Footer />

      <Modal show={showWelcome} onHide={closeWelcome} centered>
        <Modal.Header closeButton>
          <Modal.Title>Bienvenido</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Configura tus datos en "Mi cuenta" para completar tu perfil.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeWelcome}>Cerrar</Button>
          <Button variant="primary" onClick={goToAccount}>Ir a Mi cuenta</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Layout;
