import { Container } from 'react-bootstrap';
import Seo from '../components/Seo';

const Section = ({ title, children }) => (
  <section className="legal-section">
    <h2>{title}</h2>
    {children}
  </section>
);

const Privacy = () => {
  const updatedAt = '4 de abril de 2026';

  return (
    <>
      <Seo
        title="Política de privacidad"
        description="Cómo CotiStore recopila, utiliza, resguarda y trata los datos personales de usuarios, clientes y contactos del sitio."
        path="/privacidad"
      />

      <Container className="legal-page">
        <div className="legal-card">
          <span className="legal-kicker">Datos personales</span>
          <h1>Política de privacidad</h1>
          <p className="legal-lead">
            En CotiStore tratamos los datos personales con criterio de confidencialidad y los utilizamos únicamente para operar el sitio,
            gestionar cuentas, atender consultas, procesar pedidos y mejorar la experiencia comercial.
          </p>
          <p className="legal-meta">Última actualización: {updatedAt}</p>

          <Section title="1. Qué datos recopilamos">
            <p>Podemos recopilar los datos que el usuario proporciona al registrarse, consultar, comprar o interactuar con la plataforma.</p>
            <ul className="legal-list">
              <li>Nombre, apellido o denominación identificatoria.</li>
              <li>Correo electrónico y teléfono de contacto.</li>
              <li>Datos de acceso y credenciales de cuenta.</li>
              <li>Dirección de entrega, ciudad, código postal y demás información logística.</li>
              <li>Historial de pedidos, productos consultados y acciones realizadas dentro de la cuenta.</li>
              <li>Imagen de perfil u otros archivos que el usuario decida cargar.</li>
            </ul>
          </Section>

          <Section title="2. Para qué usamos la información">
            <ul className="legal-list">
              <li>Crear, validar, aprobar o administrar cuentas de usuario.</li>
              <li>Procesar pedidos, preparar entregas y brindar soporte postventa.</li>
              <li>Enviar correos operativos, avisos de seguridad, recuperación de contraseña y comunicaciones vinculadas al servicio.</li>
              <li>Prevenir fraude, accesos no autorizados y abusos de la plataforma.</li>
              <li>Mejorar la experiencia del sitio, su rendimiento y la calidad de la atención comercial.</li>
            </ul>
          </Section>

          <Section title="3. Base de tratamiento y conservación">
            <p>
              Los datos se tratan en la medida necesaria para gestionar la relación comercial, responder solicitudes, operar la cuenta del usuario
              y cumplir finalidades legítimas vinculadas al funcionamiento de CotiStore.
            </p>
            <p>
              Conservaremos la información mientras resulte necesaria para la operatoria comercial, la atención de reclamos, el cumplimiento de
              obligaciones legales o la defensa de derechos de la empresa.
            </p>
          </Section>

          <Section title="4. Compartición de datos">
            <p>
              No vendemos datos personales. Podemos compartir información únicamente con proveedores o servicios que resulten necesarios para
              operar CotiStore, siempre dentro de finalidades razonables y vinculadas al servicio.
            </p>
            <ul className="legal-list">
              <li>Servicios de hosting, correo electrónico, almacenamiento y seguridad.</li>
              <li>Pasarelas o herramientas vinculadas a pagos, validaciones o gestión de pedidos.</li>
              <li>Servicios logísticos, transportistas o terceros intervinientes en la entrega cuando sea necesario.</li>
            </ul>
          </Section>

          <Section title="5. Seguridad">
            <p>
              CotiStore adopta medidas técnicas y organizativas razonables para proteger los datos personales contra accesos no autorizados,
              alteraciones, pérdidas o usos indebidos. Aun así, ningún sistema conectado a internet puede garantizar seguridad absoluta.
            </p>
          </Section>

          <Section title="6. Cookies y datos técnicos">
            <p>
              El sitio puede utilizar almacenamiento local, cookies u otras tecnologías técnicas para mantener sesiones, recordar preferencias,
              mejorar navegación y medir funcionamiento general de la plataforma.
            </p>
          </Section>

          <Section title="7. Correos y comunicaciones">
            <p>
              Podremos enviarte comunicaciones operativas relacionadas con tu cuenta, seguridad, pedidos, recuperación de acceso o funcionamiento
              del sitio. Estas comunicaciones forman parte del servicio y no siempre requieren una suscripción promocional específica.
            </p>
          </Section>

          <Section title="8. Archivos e imágenes subidas por usuarios">
            <p>
              Si el usuario carga una foto de perfil u otros archivos permitidos por la plataforma, dichos contenidos se almacenarán en la
              infraestructura técnica utilizada por CotiStore o sus proveedores tecnológicos para cumplir esa funcionalidad.
            </p>
          </Section>

          <Section title="9. Derechos del usuario">
            <p>
              Podés solicitar actualización o corrección de tus datos de cuenta y realizar consultas sobre el tratamiento de tu información a
              través de los canales oficiales de contacto.
            </p>
          </Section>

          <Section title="10. Cambios a esta política">
            <p>
              Esta política puede actualizarse por cambios técnicos, comerciales, operativos o legales. La versión vigente será siempre la
              publicada en esta página.
            </p>
          </Section>

          <Section title="11. Contacto">
            <p>
              Para consultas vinculadas a privacidad, datos personales o seguridad de cuenta, escribinos a{' '}
              <a href="mailto:ventascotistore@gmail.com">ventascotistore@gmail.com</a>.
            </p>
          </Section>
        </div>
      </Container>
    </>
  );
};

export default Privacy;
