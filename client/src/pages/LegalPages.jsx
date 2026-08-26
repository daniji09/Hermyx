import { Link, useLocation } from 'react-router-dom';
import { consts } from '@hermyx/shared';

const LAST_UPDATED = '26 de agosto de 2026';

const legalLinks = [
  { to: '/terms', label: 'Términos y condiciones' },
  { to: '/legal', label: 'Aviso legal' },
  { to: '/privacy', label: 'Política de privacidad' },
  { to: '/cookies', label: 'Política de cookies' },
  { to: '/community-guidelines', label: 'Normas de comunidad' },
];

const DocumentSection = ({ title, children }) => (
  <section className='space-y-3'>
    <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
    <div className='space-y-3 text-sm leading-7 text-muted-foreground'>
      {children}
    </div>
  </section>
);

const LegalDocument = ({ title, description, children }) => (
  <LegalDocumentContent title={title} description={description}>
    {children}
  </LegalDocumentContent>
);

const LegalDocumentContent = ({ title, description, children }) => {
  const { pathname } = useLocation();

  return (
    <>
      <title>{`${title} | Hermyx`}</title>
      <meta name='description' content={description} />
      <main className='container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12'>
        <nav
          aria-label='Legal documents'
          className='mb-8 flex flex-wrap gap-x-4 gap-y-2 text-sm'
        >
          {legalLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`underline-offset-4 hover:underline ${link.to === pathname ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <article className='rounded-2xl border bg-card p-6 shadow-sm sm:p-10'>
          <header className='mb-10 space-y-4 border-b pb-8'>
            <p className='text-sm font-semibold uppercase tracking-[0.18em] text-primary'>
              Documento del prototipo académico
            </p>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              {title}
            </h1>
            <p className='max-w-3xl text-base leading-7 text-muted-foreground'>
              {description}
            </p>
            <p className='text-xs text-muted-foreground'>
              Versión {consts.AUTH.LEGAL.TERMS_VERSION} · Última actualización:{' '}
              {LAST_UPDATED}
            </p>
          </header>
          <div className='space-y-10'>{children}</div>
        </article>
      </main>
    </>
  );
};

export const Terms = () => (
  <LegalDocument
    title='Términos y condiciones de uso'
    description='Condiciones de uso de Hermyx, un prototipo académico de plataforma de misiones.'
  >
    <div className='rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 text-foreground'>
      Hermyx es un prototipo académico desarrollado en el contexto de un Trabajo
      de Fin de Grado. Esta versión no constituye una plataforma comercial y
      utiliza Stripe únicamente en modo prueba: no permite contratar servicios
      ni realizar pagos reales.
    </div>

    <DocumentSection title='1. Identificación y alcance'>
      <p>
        Estos términos regulan el acceso y uso de la aplicación Hermyx (la
        “Aplicación”). En esta versión académica no existe un operador comercial
        identificado para contratar servicios. Antes de publicar una versión
        real deberán completarse el nombre o razón social, NIF, domicilio,
        correo de contacto y, cuando proceda, los datos registrales del
        operador.
      </p>
      <p>
        La aceptación de estos términos solo permite utilizar el prototipo en el
        entorno habilitado para el proyecto. No crea por sí misma una relación
        laboral, mercantil o de prestación de servicios remunerados.
      </p>
    </DocumentSection>

    <DocumentSection title='2. Requisitos y cuenta de usuario'>
      <p>
        El uso de Hermyx está reservado a personas mayores de 18 años. El
        usuario debe aportar datos veraces, mantenerlos actualizados y crear una
        sola cuenta personal. No está permitido ceder, vender ni compartir las
        credenciales.
      </p>
      <p>
        El usuario es responsable de custodiar su contraseña y de avisar si
        detecta un acceso no autorizado. Hermyx podrá suspender o limitar una
        cuenta cuando existan indicios de fraude, abuso, suplantación, contenido
        ilegal o incumplimiento de estos términos.
      </p>
      <p>
        El usuario puede solicitar la eliminación de su cuenta. La eliminación
        podrá quedar pendiente mientras existan misiones activas, pagos de
        prueba, incidencias o disputas que deban cerrarse o conservarse por
        obligación legal.
      </p>
    </DocumentSection>

    <DocumentSection title='3. Funcionamiento de las misiones'>
      <p>
        Hermyx permite publicar misiones con título, descripción, ubicación,
        fotografías, vacantes y recompensa. El propietario debe describir la
        misión de forma suficiente, lícita y no engañosa, y fijar condiciones
        que pueda cumplir.
      </p>
      <ol className='list-decimal space-y-2 pl-6'>
        <li>
          Otros usuarios pueden solicitar unirse a una vacante o recibir una
          invitación.
        </li>
        <li>
          La participación queda sujeta a la aceptación y al estado de la misión
          que muestre la Aplicación.
        </li>
        <li>
          Una misión puede cerrarse cuando se cubren sus vacantes y pasa al
          flujo de financiación de prueba.
        </li>
        <li>
          El trabajo comienza cuando el estado de la misión lo indique y el
          aventurero puede comunicarse con el equipo mediante las herramientas
          disponibles.
        </li>
        <li>
          Cuando el aventurero termina su trabajo, puede marcar la
          participación como entregada mediante la Aplicación. Esta acción
          registra el cambio de estado y notifica al propietario. En esta
          versión del prototipo, Hermyx no almacena un archivo o resultado
          formal de la misión; los detalles adicionales pueden comunicarse
          mediante las herramientas disponibles. El propietario puede aceptar
          la participación, solicitar una revisión, rechazarla o abrir una
          incidencia según el flujo disponible.
        </li>
      </ol>
      <p>
        Si el propietario no revisa una entrega dentro del plazo configurado, la
        versión actual puede aceptarla automáticamente después de una semana.
        Este mecanismo no impide que se corrijan errores técnicos o se
        investiguen conductas fraudulentas.
      </p>
    </DocumentSection>

    <DocumentSection title='4. Papel de Hermyx'>
      <p>
        Hermyx facilita el contacto entre usuarios y ofrece herramientas para
        publicar misiones, comunicarse, gestionar pagos de prueba, recibir
        reportes y resolver incidencias. No garantiza la identidad,
        disponibilidad, calidad, legalidad o comportamiento de cada usuario ni
        que una misión se complete correctamente.
      </p>
      <p>
        Hermyx no es el empleador del aventurero ni, necesariamente, quien
        presta el servicio subyacente. La calificación jurídica de cada relación
        dependerá de cómo funcione una eventual versión comercial en la práctica
        y de la legislación aplicable; esta cláusula no excluye
        responsabilidades que legalmente correspondan al operador.
      </p>
    </DocumentSection>

    <DocumentSection title='5. Pagos, comisión y reembolsos'>
      <p>
        El prototipo muestra un cálculo de recompensa y una comisión de servicio
        del 10 %. Como ejemplo, una recompensa de 100 € genera una comisión de
        10 € y un total mostrado de 110 €. La recompensa prevista para el
        aventurero sería de 100 €.
      </p>
      <p>
        Stripe está integrado exclusivamente con claves y operaciones de prueba.
        No deben introducirse tarjetas reales. Las pantallas pueden simular
        confirmaciones, reembolsos o transferencias, pero Hermyx no ofrece en
        esta versión un servicio real de escrow, depósito en garantía o custodia
        de fondos.
      </p>
      <p>
        Antes de aceptar dinero real deberán definirse el precio total, los
        impuestos, las comisiones de Stripe, los pagos fallidos, los
        contracargos, el fraude, los reembolsos totales o parciales, los
        retrasos y los requisitos de la cuenta conectada del aventurero. El
        modelo deberá revisarse legal, fiscal y regulatoriamente.
      </p>
      <p>
        Si una futura versión opera con consumidores y una empresa, deberá
        facilitar la información precontractual, el precio total y las reglas
        sobre desistimiento y sus excepciones que resulten aplicables.
      </p>
    </DocumentSection>

    <DocumentSection title='6. Contenido y propiedad intelectual'>
      <p>
        El usuario conserva sus derechos sobre textos, fotografías, mensajes y
        archivos. Al subir contenido declara que tiene autorización suficiente y
        concede a Hermyx una licencia no exclusiva, limitada y gratuita para
        alojarlo, mostrarlo, procesarlo y ponerlo a disposición dentro de la
        Aplicación mientras sea necesario para prestar sus funciones.
      </p>
      <p>No se permite publicar o solicitar:</p>
      <ul className='list-disc space-y-2 pl-6'>
        <li>Contenido ilegal, fraudulento, engañoso o plagiado.</li>
        <li>Fotografías o datos personales de terceros sin autorización.</li>
        <li>Acoso, amenazas, discriminación o suplantación.</li>
        <li>
          Tareas peligrosas, delictivas o que requieran una licencia profesional
          no acreditada.
        </li>
        <li>Drogas, armas, explotación sexual u otras actividades ilícitas.</li>
        <li>
          Pagos o acuerdos fuera de Hermyx para eludir sus controles o
          comisiones.
        </li>
      </ul>
    </DocumentSection>

    <DocumentSection title='7. Moderación, reportes y disputas'>
      <p>
        Se puede reportar un perfil, misión, mensaje o participación desde las
        herramientas disponibles o mediante el canal habilitado para el
        proyecto. El equipo administrador podrá solicitar información, retirar
        contenido, limitar funciones, suspender o expulsar cuentas y cerrar
        misiones cuando sea necesario para proteger a la comunidad o cumplir la
        ley.
      </p>
      <p>
        Las decisiones se notificarán cuando sea posible, indicando los motivos
        y, si el prototipo lo permite, el procedimiento interno para responder o
        solicitar una revisión. Las disputas sobre una entrega o recompensa se
        tramitarán mediante el flujo interno de incidencias. La moderación no
        sustituye a los procedimientos administrativos o judiciales que puedan
        corresponder.
      </p>
    </DocumentSection>

    <DocumentSection title='8. Privacidad y servicios de terceros'>
      <p>
        El funcionamiento puede implicar datos de cuenta y autenticación, Google
        y Firebase, perfiles, ubicación, fotografías, mensajes, reportes,
        reseñas, identificadores de Stripe y datos necesarios para las
        operaciones de prueba. La información detallada sobre responsable,
        finalidades, bases jurídicas, destinatarios, transferencias,
        conservación y derechos se encuentra en la{' '}
        <Link to='/privacy' className='text-foreground underline'>
          Política de privacidad
        </Link>
        .
      </p>
      <p>
        Algunas funciones pueden utilizar almacenamiento de Azure en producción
        y servicios cartográficos como OpenStreetMap/Nominatim. Estos terceros
        pueden tener sus propias condiciones y políticas.
      </p>
    </DocumentSection>

    <DocumentSection title='9. Fiscalidad'>
      <p>
        Cada usuario es responsable de sus obligaciones fiscales, laborales y de
        Seguridad Social cuando resulten aplicables. Si una futura versión
        facilita servicios personales remunerados mediante la plataforma, Hermyx
        podrá solicitar, conservar o comunicar datos de usuarios cuando la
        normativa, incluida DAC7 y su normativa española de desarrollo, cuando
        resulte aplicable, lo exija.
      </p>
    </DocumentSection>

    <DocumentSection title='10. Disponibilidad y cambios'>
      <p>
        El prototipo se ofrece con fines académicos, puede contener errores y
        puede cambiar o dejar de estar disponible sin garantía de continuidad.
        El usuario debe conservar sus propios archivos y no utilizar la demo
        para decisiones críticas o para prestar servicios reales.
      </p>
      <p>
        Las nuevas versiones de estos términos se publicarán en esta página con
        su versión y fecha. Si se habilitara una versión comercial, el operador
        deberá establecer el procedimiento legal de información y aceptación que
        corresponda.
      </p>
    </DocumentSection>

    <DocumentSection title='11. Ley aplicable y contacto'>
      <p>
        Para la versión académica no se designa un operador comercial ni se fija
        un domicilio contractual ficticio. En una versión real deberán
        completarse la ley aplicable, la jurisdicción y un canal de contacto
        válidos antes de aceptar contrataciones o pagos.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const LegalNotice = () => (
  <LegalDocument
    title='Aviso legal'
    description='Información identificativa y de responsabilidad de Hermyx.'
  >
    <div className='rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 text-foreground'>
      Esta página identifica expresamente las partes que todavía deben
      completarse antes de publicar Hermyx como servicio comercial.
    </div>
    <DocumentSection title='Titular del proyecto'>
      <p>
        Hermyx es un prototipo académico desarrollado en el contexto de un
        Trabajo de Fin de Grado. En esta versión no se presenta como empresa,
        marketplace comercial ni proveedor de servicios de pago.
      </p>
      <p>
        Titular, NIF, domicilio, correo electrónico y datos registrales: no
        aplicables a esta demo académica. No deben sustituirse por datos
        ficticios. Estos datos deberán incorporarse antes de una publicación
        comercial.
      </p>
    </DocumentSection>
    <DocumentSection title='Responsabilidad'>
      <p>
        La Aplicación se facilita para demostrar un flujo de misiones, perfiles,
        comunicación y pagos de prueba. El contenido publicado por los usuarios
        pertenece a sus autores y no implica validación o recomendación por
        parte del proyecto.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const PrivacyPolicy = () => (
  <LegalDocument
    title='Política de privacidad'
    description='Información sobre los datos que puede tratar el prototipo Hermyx y los aspectos que deben completarse para una versión real.'
  >
    <div className='rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 text-foreground'>
      Esta política es una base informativa para el TFG. Antes de tratar datos
      en producción debe completarse con la identidad real del responsable, las
      bases jurídicas, los plazos y los proveedores concretos, y revisarse
      profesionalmente.
    </div>
    <DocumentSection title='Responsable y datos tratados'>
      <p>
        Responsable del tratamiento: pendiente de completar; esta demo no debe
        utilizar datos identificativos ficticios. Según las funciones usadas,
        Hermyx puede tratar datos de cuenta (nombre de usuario, correo,
        autenticación de Firebase/Google), perfil, ubicación, fotografías,
        mensajes, reportes, reseñas, participaciones e identificadores de Stripe
        asociados a operaciones de prueba.
      </p>
    </DocumentSection>
    <DocumentSection title='Finalidades y conservación'>
      <p>
        Los datos pueden utilizarse para crear y proteger cuentas, mostrar
        perfiles y misiones, gestionar participaciones, mantener conversaciones,
        tramitar reportes y disputas, probar pagos y mejorar el prototipo. Los
        plazos de conservación y los criterios de supresión deben fijarse antes
        de la puesta en producción.
      </p>
    </DocumentSection>
    <DocumentSection title='Proveedores y destinatarios'>
      <p>
        El prototipo puede apoyarse en Firebase/Google para autenticación,
        Stripe para operaciones de prueba, Azure Blob Storage para archivos en
        producción y OpenStreetMap/Nominatim para funciones cartográficas. Deben
        formalizarse y documentarse los encargos, transferencias internacionales
        y garantías aplicables a cada proveedor.
      </p>
    </DocumentSection>
    <DocumentSection title='Derechos'>
      <p>
        La persona usuaria deberá poder ejercer sus derechos de acceso,
        rectificación, supresión, oposición, limitación y portabilidad, además
        de retirar consentimientos cuando esa sea la base jurídica. El canal de
        ejercicio y la autoridad de control competente deben añadirse con los
        datos reales del responsable.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const CookiePolicy = () => (
  <LegalDocument
    title='Política de cookies'
    description='Información sobre cookies y tecnologías similares utilizadas por el prototipo Hermyx.'
  >
    <DocumentSection title='Estado actual del prototipo'>
      <p>
        La versión actual no incorpora una finalidad publicitaria ni un sistema
        propio de analítica no técnica. Puede utilizar almacenamiento local y
        tecnologías necesarias para mantener preferencias de interfaz,
        autenticación o seguridad; su inventario definitivo debe verificarse en
        cada despliegue.
      </p>
    </DocumentSection>
    <DocumentSection title='Antes de una versión comercial'>
      <p>
        Si se incorporan cookies de analítica, personalización, publicidad o
        servicios de terceros no estrictamente necesarios, deberá mostrarse
        información clara, obtenerse el consentimiento correspondiente y
        ofrecerse una configuración granular y revocable. Los detalles de
        proveedor, duración y finalidad deberán mantenerse actualizados.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const CommunityGuidelines = () => (
  <LegalDocument
    title='Normas de comunidad'
    description='Reglas de convivencia y contenidos para usar Hermyx.'
  >
    <DocumentSection title='Comportamiento esperado'>
      <p>
        Trate a las demás personas con respeto, describa las misiones con
        honestidad, cumpla los acuerdos que acepte y utilice los canales de
        reporte cuando exista un riesgo o incumplimiento. No solicite datos,
        pagos o comunicaciones externas para esquivar las protecciones del
        prototipo.
      </p>
    </DocumentSection>
    <DocumentSection title='Contenido no permitido'>
      <ul className='list-disc space-y-2 pl-6'>
        <li>Fraude, spam, suplantación, plagio o infracción de derechos.</li>
        <li>Datos personales de terceros sin base o autorización.</li>
        <li>Amenazas, acoso, odio, discriminación o explotación.</li>
        <li>
          Actividades delictivas, peligrosas o que requieran permisos no
          disponibles.
        </li>
        <li>Ofertas engañosas, pagos externos o manipulación de reseñas.</li>
      </ul>
    </DocumentSection>
    <DocumentSection title='Aplicación de las normas'>
      <p>
        Según la gravedad, el proyecto podrá ocultar contenido, solicitar
        cambios, limitar una misión, suspender una cuenta o remitir el caso a
        las autoridades competentes. Las personas afectadas podrán solicitar una
        revisión mediante el canal habilitado para la demo, sin perjuicio de sus
        derechos legales.
      </p>
    </DocumentSection>
  </LegalDocument>
);
