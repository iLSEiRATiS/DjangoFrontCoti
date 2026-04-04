import { Container } from 'react-bootstrap';
import Seo from '../components/Seo';

const Section = ({ title, children }) => (
  <section className="legal-section">
    <h2>{title}</h2>
    {children}
  </section>
);

const Terms = () => {
  const updatedAt = '4 de abril de 2026';

  return (
    <>
      <Seo
        title="Términos y condiciones"
        description="Condiciones de uso, registro, compra mayorista, precios, stock, pagos, envíos y responsabilidades aplicables a CotiStore."
        path="/terminos-y-condiciones"
      />

      <Container className="legal-page">
        <div className="legal-card">
          <span className="legal-kicker">Información legal</span>
          <h1>Términos y condiciones</h1>
          <p className="legal-lead">
            Estos términos regulan el acceso, navegación, registro y uso del sitio web de CotiStore, así como
            las solicitudes de compra, pedidos y comunicaciones realizadas a través de la plataforma.
          </p>
          <p className="legal-meta">Última actualización: {updatedAt}</p>

          <Section title="1. Identificación del sitio">
            <p>
              CotiStore es una tienda online orientada a la comercialización mayorista de artículos de cotillón,
              repostería, papelería, librería y rubros relacionados. Para consultas comerciales o administrativas,
              podés comunicarte a <a href="mailto:ventascotistore@gmail.com">ventascotistore@gmail.com</a> o al
              teléfono <a href="tel:+541139581816">11 3958-1816</a>.
            </p>
          </Section>

          <Section title="2. Aceptación de los términos">
            <p>
              Al ingresar, registrarte, navegar, solicitar acceso o realizar una compra a través de CotiStore,
              aceptás estos términos y condiciones junto con la política de privacidad publicada en este sitio.
            </p>
            <p>Si no estás de acuerdo con alguno de estos puntos, debés abstenerte de utilizar la plataforma.</p>
          </Section>

          <Section title="3. Registro de usuarios y aprobación de cuentas">
            <p>
              Para acceder a precios, funcionalidades de cuenta, carrito, pedidos y otras herramientas del sitio,
              puede requerirse la creación de una cuenta.
            </p>
            <ul className="legal-list">
              <li>El usuario debe proporcionar datos verdaderos, actualizados y completos.</li>
              <li>El registro no garantiza aprobación automática de acceso comercial.</li>
              <li>CotiStore puede aprobar, rechazar o suspender cuentas cuando detecte datos inconsistentes, uso indebido o incumplimiento de estas condiciones.</li>
              <li>El titular de la cuenta es responsable por la confidencialidad de su contraseña y por toda actividad realizada con su acceso.</li>
            </ul>
          </Section>

          <Section title="4. Uso permitido del sitio">
            <p>El sitio debe utilizarse únicamente con fines lícitos y comerciales compatibles con la actividad de CotiStore.</p>
            <ul className="legal-list">
              <li>No está permitido intentar acceder a cuentas ajenas, áreas restringidas o sistemas internos sin autorización.</li>
              <li>No está permitido alterar, copiar masivamente, extraer o reutilizar contenidos del catálogo con fines no autorizados.</li>
              <li>No está permitido usar el sitio para enviar contenido fraudulento, dañino o que afecte la operación normal de la plataforma.</li>
            </ul>
          </Section>

          <Section title="5. Información de productos, imágenes y categorías">
            <p>
              CotiStore procura mantener actualizada la información de productos, categorías, imágenes, descripciones y precios.
              Sin embargo, pueden existir errores materiales, demoras de actualización o diferencias originadas en cambios de proveedores,
              disponibilidad o ajustes internos.
            </p>
            <ul className="legal-list">
              <li>Las imágenes son ilustrativas y pueden variar levemente respecto del producto entregado.</li>
              <li>Los colores, presentaciones, surtidos, medidas o empaques pueden cambiar según proveedor o lote.</li>
              <li>La publicación de un producto en el sitio no implica obligación de disponibilidad inmediata.</li>
            </ul>
          </Section>

          <Section title="6. Precios, stock y condiciones comerciales">
            <p>Los precios exhibidos en el sitio son de referencia comercial para usuarios habilitados y pueden ser actualizados sin previo aviso.</p>
            <ul className="legal-list">
              <li>El stock está sujeto a disponibilidad real al momento de preparación o confirmación del pedido.</li>
              <li>La carga de un producto al carrito no reserva stock por sí sola.</li>
              <li>Los pedidos pueden quedar sujetos a revisión, validación comercial o confirmación manual.</li>
              <li>CotiStore puede corregir errores evidentes de precio, stock o descripción antes de confirmar una operación.</li>
            </ul>
          </Section>

          <Section title="7. Pedidos, pagos y confirmación">
            <p>El envío de un pedido a través del sitio constituye una solicitud de compra y no una aceptación automática de la operación.</p>
            <ul className="legal-list">
              <li>El pedido puede requerir validación administrativa, comercial o de pago.</li>
              <li>La aceptación final se considera perfeccionada cuando CotiStore confirma el pedido o avanza con su preparación según su operatoria interna.</li>
              <li>Los medios de pago, promociones y condiciones particulares pueden variar según canal, cliente o tipo de operación.</li>
            </ul>
          </Section>

          <Section title="8. Envíos, entregas y retiros">
            <p>
              Los plazos de preparación, despacho, retiro o entrega pueden variar según volumen, disponibilidad de productos, zona, transportista
              y validaciones internas.
            </p>
            <ul className="legal-list">
              <li>Los datos de envío informados por el cliente deben ser correctos y completos.</li>
              <li>CotiStore no será responsable por demoras atribuibles a terceros, datos mal cargados por el cliente o contingencias ajenas a su control razonable.</li>
              <li>El costo y modalidad de envío pueden depender del volumen, destino y acuerdo comercial aplicable.</li>
            </ul>
          </Section>

          <Section title="9. Cambios, reclamos y devoluciones">
            <p>
              Los reclamos por faltantes, roturas, errores de preparación o inconvenientes con la mercadería deberán informarse dentro de un plazo
              razonable desde la recepción del pedido, por los canales oficiales de contacto.
            </p>
            <p>
              Cada situación será evaluada según el tipo de producto, estado del pedido, evidencia disponible y condiciones comerciales aplicables.
            </p>
          </Section>

          <Section title="10. Propiedad intelectual">
            <p>
              Los contenidos del sitio, incluyendo diseño, textos, marcas, logotipos, imágenes, catálogos, estructura y desarrollos, pertenecen a
              CotiStore o a sus respectivos titulares y no pueden ser utilizados sin autorización previa, salvo uso personal y legítimo vinculado
              a la navegación o compra dentro del sitio.
            </p>
          </Section>

          <Section title="11. Limitación de responsabilidad">
            <p>
              CotiStore no garantiza disponibilidad ininterrumpida del sitio ni ausencia total de errores técnicos. En la máxima medida permitida
              por la normativa aplicable, no será responsable por daños indirectos, pérdida de datos, lucro cesante o interrupciones originadas en
              fallas de terceros, caídas de servicios, problemas de conectividad o eventos fuera de su control razonable.
            </p>
          </Section>

          <Section title="12. Modificaciones">
            <p>
              CotiStore puede actualizar estos términos y condiciones para reflejar cambios operativos, técnicos, comerciales o normativos.
              La versión vigente será la publicada en esta página.
            </p>
          </Section>

          <Section title="13. Contacto">
            <p>
              Si tenés dudas sobre estos términos o sobre una compra realizada a través del sitio, podés escribir a{' '}
              <a href="mailto:ventascotistore@gmail.com">ventascotistore@gmail.com</a>.
            </p>
          </Section>
        </div>
      </Container>
    </>
  );
};

export default Terms;
