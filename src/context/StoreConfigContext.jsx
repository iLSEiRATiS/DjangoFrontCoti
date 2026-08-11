import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const StoreConfigContext = createContext(null);

export const StoreConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    minOrderAmount: 100000,
    showPricesToGuests: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.products.storeConfig();
        setConfig({
          minOrderAmount: Number(data?.minOrderAmount || 100000),
          showPricesToGuests: data?.showPricesToGuests ?? true
        });
      } catch (err) {
        console.error('Error fetching store config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  return (
    <StoreConfigContext.Provider value={{ config, setConfig, loading }}>
      {children}
    </StoreConfigContext.Provider>
  );
};

export const useStoreConfig = () => useContext(StoreConfigContext);
