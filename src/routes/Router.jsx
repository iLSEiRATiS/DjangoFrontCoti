// frontend/src/routes/Router.js
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from './ProtectedRoute';

const Home = lazy(() => import('../pages/Home'));
const Productos = lazy(() => import('../pages/Productos'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Carrito = lazy(() => import('../pages/Carrito'));
const Account = lazy(() => import('../pages/Account'));
const Panel = lazy(() => import('../pages/Panel'));
const Orders = lazy(() => import('../pages/Orders'));     // NUEVO
const Checkout = lazy(() => import('../pages/Checkout')); // NUEVO
const Terms = lazy(() => import('../pages/Terms'));
const Privacy = lazy(() => import('../pages/Privacy'));
const NotFound = lazy(() => import('../pages/NotFound'));

const AppRouter = () => (
  <BrowserRouter>
    <Layout>
      <Suspense fallback={<div className="text-center py-5">Cargando…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/productos/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/carrito" element={<Carrito />} />

          {/* Usuario logueado */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel"
            element={
              <ProtectedRoute>
                <Panel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route path="/terminos-y-condiciones" element={<Terms />} />
          <Route path="/privacidad" element={<Privacy />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute admin>
                <Navigate to="/panel?tab=dashboard" replace />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  </BrowserRouter>
);

export default AppRouter;



