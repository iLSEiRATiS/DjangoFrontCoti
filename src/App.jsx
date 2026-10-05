// src/App.js
import './App.css';
import AppRouter from './routes/Router';
import CartToast from './components/CartToast';
import MaintenanceGate from './components/MaintenanceGate';

function App() {
  return (
    <MaintenanceGate>
      <AppRouter />
      <CartToast />
    </MaintenanceGate>
  );
}

export default App;
