# Resumen de Cambios (Cotistore Frontend y Backend)

> [!WARNING]
> **ESTADO PENDIENTE DE DESPLIEGUE:** Todo el trabajo listado en este documento (realizado hoy) se encuentra actualmente solo en tu entorno local. Debes hacer commit y push a GitHub para que el frontend se despliegue en Netlify, y hacer pull + migraciones en el VPS para el backend.


## 1. Botón Flotante de WhatsApp y Actualización de Número
* Se implementó un nuevo componente `FloatingWhatsApp.jsx` que muestra el icono de WhatsApp siempre visible en la esquina inferior derecha.
* Se agregó una animación de escala al interactuar (hover) y se integró globalmente a través del componente `Layout.jsx`.
* Se ajustó específicamente su margen inferior (`bottom: 80px`) para evitar cualquier tipo de superposición con el botón de "Volver arriba" de la tienda.
* Se reemplazó el número de teléfono anterior en toda la plataforma por el nuevo: **1150443472** (Términos y condiciones, Footer, Home y el propio botón flotante).

## 2. Corrección de Bug: Visibilidad de Precios a Invitados
* Se detectó y resolvió un fallo de desestructuración y sintaxis en la llamada a la API (`api.products.storeConfig`) dentro de `StoreConfigContext.jsx` que causaba que el estado visual cayera en error silencioso.
* Se aseguró que `ProductCard.jsx` consuma adecuadamente el contexto para decidir si oculta o muestra los precios al instante en base a la configuración.

## 3. Reubicación de Configuración en Django Admin
* Se extrajo la configuración general ("Mostrar precios a invitados", etc.) que antes estaba oculta en la App de Productos.
* Mediante un modelo "Proxy" (`GlobalStoreSettings`), se inyectó esta opción de configuración directamente dentro del módulo de **Usuarios** en el panel de administrador nativo de Django, haciendo mucho más intuitivo su acceso.

## 4. Nuevo Rol: Operador (Restricción de Precios e Importes)
* **Nuevo rol `operator`:** Pensado para personal de depósito/empaque.
* **Precios Ocultos:** No visualiza precios en el catálogo de productos ni en el formulario de edición.
* **Importes Ocultos:** No visualiza `total`, `envio`, `precio_unitario` ni `subtotal` en los pedidos.
* **Facturas Restringidas:** Bloqueado el acceso y descarga de PDFs de facturas/presupuestos (403 Forbidden).
* **Funciones Permitidas:** Mantiene acceso completo a generación de **Rótulos de envío** y **Pedidos de stock**.

---


Durante esta sesión de trabajo nos enfocamos en mejorar significativamente la experiencia de usuario (UX) en la versión móvil del catálogo y pulir detalles visuales en la vista de producto.

---

## 1. Refactorización del Scroll en la Paginación (Móvil)
* **El Problema Original:** Al cambiar de página en el catálogo desde un dispositivo móvil, el scroll se quedaba trabado en posiciones incorrectas (por debajo de la primera fila de productos o trabado con el header). Esto ocurría porque durante el milisegundo de carga, los productos desaparecían dejando solo un "spinner", lo que colapsaba la altura de la página y rompía cualquier intento de calcular coordenadas manuales (`window.scrollY`).
* **La Solución (Lógica Nativa):**
  * Se eliminó el enfoque de cálculo matemático que era propenso a fallar.
  * Se implementó el uso de la función nativa del navegador `.scrollIntoView()` dirigida específicamente al contenedor `.catalog-toolbar` (donde dice "Mostrando XX de XXX").
  * **Espaciado Inteligente:** Se agregó la regla CSS `scroll-margin-top: 90px` al `.catalog-toolbar` para garantizar que, al hacer el scroll automático, el navegador deje un margen exacto para que el "Sticky Header" (encabezado fijo) no tape el contenido.
  * **Sincronización:** Se forzó a la lógica de React a **esperar** a que el estado `loading` termine antes de ejecutar el scroll, garantizando que el DOM de la página haya recuperado su tamaño completo.

## 2. Mejora Visual: Botón de Cerrar ("X") en Detalle de Producto
* **El Problema:** La "X" nativa de Bootstrap para cerrar el modal de detalle del producto pasaba muy desapercibida y algunos usuarios no la veían.
* **La Solución:** 
  * Se inyectó una clase personalizada (`.product-detail-modal-header`) al modal en `Productos.jsx`.
  * Se crearon reglas CSS específicas en `App.css` para el `.btn-close`.
  * Ahora la "X" cuenta con un fondo rojo pastel, un borde rojo intenso, y un sutil sombreado.
  * Se aplicaron micro-animaciones: el botón se agrandó ligeramente (`scale(1.1)`) y al pasar el cursor (hover) se expande a `scale(1.2)` intensificando su sombra, haciéndolo extremadamente fácil de identificar y presionar.

## 3. Corrección de Bugs (CSS)
* Se restauró una llave de cierre (`}`) faltante en una media query de `App.css` que había quedado huérfana y rompía la lectura del archivo de estilos en ciertos navegadores.

---

## 4. Implementación del Calendario Diario de Ventas
* **Nuevo Panel de Ventas:** Se integró la nueva pestaña "Ventas" en el menú principal del panel de administración moderno (`Panel.jsx`).
* **Componente de Almanaque Interactivo (`SalesCalendar.jsx`):** Se desarrolló un calendario tipo almanaque con navegación por año y mes. Los días con ventas finalizadas se resaltan visualmente mostrando un resumen del monto recaudado y la cantidad de pedidos.
* **Modal de Detalle Diario (`DailySalesModal.jsx`):** Al hacer clic sobre un día resaltado, se abre un modal que desglosa los datos. A pedido del cliente, el modal separa la información por cada **Pedido Individual** (mostrando ID, hora, cliente y el listado de productos de esa orden específica) en lugar de una lista aglomerada.
* **Backend de Reportes y Generación PDF (`api_admin.py` y `api_pdf.py`):**
  * Se crearon 3 endpoints nuevos (`AdminSalesCalendarView`, `AdminDailySalesView`, `AdminDailySalesPdfView`) para manejar la lógica de fechas, cálculo de totales y descarga del reporte.
  * Se implementó la creación dinámica de un **Reporte en PDF** (usando `ReportLab`). Este documento replica el desglose detallado pedido por pedido y sus respectivos ítems, siendo ideal para balances contables.
* **Nuevo Estado de Pedidos ("Cerrado"):** 
  * Se agregó el estado "Cerrado" (`closed`) a la BD (`orders/models.py`). El calendario y los resúmenes financieros **sólo** toman en cuenta los pedidos que se encuentren en este estado.
  * Se agregó una **Acción Masiva (Admin Action)** en el panel de Django nativo (`admin.py`), permitiendo al usuario tildar múltiples pedidos a la vez y cerrarlos rápidamente con un clic.
  * También se agregó este estado al selector de estados de la interfaz React para ediciones manuales.

---

## 5. Resolución de Conexiones Fallidas en Inicio de Sesión (Problema de Red/Wi-Fi)
* **El Problema:** Algunos clientes no podían iniciar sesión desde ciertas redes Wi-Fi (la petición quedaba cargando indefinidamente o daba "Load failed"), pero funcionaba perfectamente con datos móviles.
* **Diagnóstico Profundo:**
  1. Se descartaron bloqueos de IPv6 forzando el apagado de la compatibilidad IPv6 en Cloudflare.
  2. Se revisaron los registros (logs) del Firewall del VPS (UFW) y del Nginx, descartando baneos de IP por parte de Fail2ban u otras herramientas de seguridad.
  3. Se descubrió que las peticiones `GET` (como cargar productos) sí llegaban a Nginx, pero la petición `POST` del inicio de sesión no, lo que descartaba errores de servidor.
  4. La URL del frontend apuntaba correctamente al backend (descartando errores de rutas en producción).
* **La Solución Definitiva:**
  * El problema de raíz era un fallo de enrutamiento o caída de conexión TCP de ciertos proveedores de internet al intentar contactar directamente a la IP del VPS (Hostinger).
  * Se resolvió **colocando la API (`api.cotistore.com.ar`) detrás del Proxy de Cloudflare (Nube Naranja)**.
  * Al hacer esto, el cliente se conecta a la red global de Cloudflare, la cual actúa como un túnel seguro y estable hacia el VPS, evadiendo cualquier problema de enrutamiento local del proveedor de internet.
* **Ajustes de Seguridad Derivados:**
  * Al pasar la API por Cloudflare, se configuró una Regla WAF Personalizada para Omitir (Skip) el "Bot Fight Mode" y los "Managed Rules" exclusivamente para la ruta `/api/*`. Esto evita que Cloudflare intente inyectar Captchas invisibles que rompían las llamadas Axios/Fetch del frontend.
  * La seguridad contra ataques de fuerza bruta se mantiene cubierta internamente por Django gracias al uso de `ScopedRateThrottle` en las vistas de autenticación, el cual captura correctamente la IP real del cliente a través del proxy.

---

## 6. Corrección de Enlaces al Panel de Administración Dinámicos
* **El Problema:** Todos los botones del frontend que redirigían al panel de administración nativo de Django estaban programados apuntando fijo a la ruta por defecto (`/admin/`). Sin embargo, en producción la ruta del administrador había sido cambiada por seguridad a `/panel-seguro-2026-Coti-Store/`.
* **La Solución:**
  * Se modificó el cliente de API (`api.js`) para usar una detección nativa de producción con Vite (`import.meta.env.PROD`), definiendo una constante dinámica `ADMIN_PATH`.
  * Se actualizaron todos los botones (tanto en `Panel.jsx` como en `Admin.jsx`) para utilizar esta constante: si estás corriendo en tu entorno local el botón redirige a `/admin/`, y si es producción, redirige a la URL segura.

---

## 7. Orden Alfabético por Defecto en Catálogo Visual
* **El Problema:** Se había intentado forzar el orden alfabético en el backend, pero el estado local del frontend estaba sobrescribiendo la configuración inicializando siempre en "Relevancia".
* **La Solución:**
  * Se deshizo el cambio forzado en la base de datos (Backend) para mantener su comportamiento natural intacto.
  * Se actualizó la lógica del catálogo en React (`Productos.jsx`) para que el filtro "Nombre: A-Z" sea la opción por defecto en la interfaz al ingresar a la tienda.
  * El usuario aún mantiene la libertad de desplegar la lista y elegir "Relevancia" o cualquier otro orden.

## 8. Soporte de Videos Integrado (YouTube, Vimeo e ImageKit)
* **El Problema:** Los productos que contaban con enlaces de video en su descripción (`videoUrl`) no aprovechaban dicho recurso y requerían clicks adicionales para visualizarse fuera de la tienda.
* **La Solución (Miniatura en Tarjeta):** 
  * Ahora, si un producto tiene video, la tarjeta del catálogo prioriza el video en lugar de la imagen principal. 
  * Se creó un reproductor en miniatura directo en la tarjeta, permitiendo al cliente darle Play sin tener que entrar al detalle.
  * Soporte nativo para enlaces de plataformas de streaming (YouTube/Vimeo vía `iframe`) y videos puros subidos a nubes privadas como **ImageKit** (vía `<video controls>`).
* **La Solución (Detalle del Producto):**
  * Al abrir el producto, el reproductor de video toma el protagonismo cargándose automáticamente en el visor central grande.
  * Se incorporó un icono distintivo ("Play") en la tira de imágenes inferior para poder alternar rápidamente entre la galería de fotos y el video del producto.

---

## Guía Oficial de Despliegue en VPS (Producción)

Si alojas todo el código en el mismo VPS y necesitas bajar los últimos cambios de GitHub para que queden reflejados en internet, aquí tienes los bloques de código exactos que debes copiar y pegar en tu terminal (`root@srv1552159`).

### 1. Actualizar el Backend (Django)
```bash
cd /root/CotiDjangoFinal/backend
git pull origin main
source .venv/bin/activate
python manage.py migrate
sudo systemctl restart gunicorn
```

### 2. Actualizar el Frontend (React)
*(Nota: Si usas un servicio en la nube como Netlify o Vercel conectado a GitHub, **el frontend se actualiza solo** y no necesitas hacer este paso).*
```bash
cd /root/DjangoFrontCoti
git pull origin main
npm install
npm run build
```
