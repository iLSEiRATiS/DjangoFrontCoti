import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const StoreConfigContext = createContext(null);
const DEFAULT_CONFIG = {
  minOrderAmount: 100000,
  showPricesToGuests: true,
  maintenanceMode: false,
  maintenanceTitle: 'Estamos en mantenimiento',
  maintenanceMessage: 'Disculpa las molestias. Estamos realizando mejoras y volveremos pronto.'
};

export const StoreConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchConfig = async (isInitialLoad = false) => {
      try {
        const data = await api.products.storeConfig();
        if (!active) return;
        setConfig({
          minOrderAmount: Number(data?.minOrderAmount || 100000),
          showPricesToGuests: data?.showPricesToGuests ?? true,
          maintenanceMode: data?.maintenanceMode ?? false,
          maintenanceTitle: data?.maintenanceTitle || DEFAULT_CONFIG.maintenanceTitle,
          maintenanceMessage: data?.maintenanceMessage || DEFAULT_CONFIG.maintenanceMessage
        });
      } catch (err) {
        console.error('Error fetching store config:', err);
      } finally {
        if (active && isInitialLoad) setLoading(false);
      }
    };
    fetchConfig(true);
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') fetchConfig();
    };
    const interval = window.setInterval(() => fetchConfig(), 30000);
    window.addEventListener('focus', refreshOnVisible);
    document.addEventListener('visibilitychange', refreshOnVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnVisible);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, []);

  return (
    <StoreConfigContext.Provider value={{ config, setConfig, loading }}>
      {children}
    </StoreConfigContext.Provider>
  );
};

export const useStoreConfig = () => useContext(StoreConfigContext);
