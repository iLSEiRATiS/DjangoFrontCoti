import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { StoreConfigProvider } from "./context/StoreConfigContext.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./App.css";

const rootEl = document.getElementById("root");
const root = ReactDOM.createRoot(rootEl);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <StoreConfigProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </StoreConfigProvider>
    </AuthProvider>
  </React.StrictMode>
);
