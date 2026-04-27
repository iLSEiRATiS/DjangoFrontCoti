// src/App.js
import './App.css';
import AppRouter from './routes/Router';
import CartToast from './components/CartToast';

function App() {
  return (
    <>
      <AppRouter />
      <CartToast />
    </>
  );
}

export default App;
