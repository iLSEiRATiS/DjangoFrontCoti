export const getGenericVariantPrice = (product, attrs = {}) => {
  const priceMap = product?.attributesPrice || product?.attributes_price || product?.atributos_precio;
  if (!priceMap || typeof priceMap !== 'object') return null;
  let resolved = null;
  Object.entries(attrs || {}).forEach(([attrName, selectedValue]) => {
    const byAttr = priceMap[attrName];
    if (!byAttr || typeof byAttr !== 'object') return;
    const candidate = Number(byAttr[selectedValue]);
    if (Number.isFinite(candidate)) resolved = candidate;
  });
  return resolved;
};
