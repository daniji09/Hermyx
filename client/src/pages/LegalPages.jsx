import { Link, useLocation } from 'react-router-dom';
import { consts } from '@hermyx/shared';

const LAST_UPDATED = 'August 26, 2026';

const legalLinks = [
  { to: '/terms', label: 'Terms and conditions' },
  { to: '/legal', label: 'Legal notice' },
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/cookies', label: 'Cookie policy' },
  { to: '/community-guidelines', label: 'Community guidelines' },
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
              Academic prototype document
            </p>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              {title}
            </h1>
            <p className='max-w-3xl text-base leading-7 text-muted-foreground'>
              {description}
            </p>
            <p className='text-xs text-muted-foreground'>
              Version {consts.AUTH.LEGAL.TERMS_VERSION} · Last updated:{' '}
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
    title='Terms and conditions of use'
    description='Terms governing the use of Hermyx, an academic service platform prototype.'
  >
    <div className='rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 text-foreground'>
      Hermyx is an academic prototype developed as part of a final degree
      project. This version is not a commercial platform and uses Stripe only in
      test mode: it does not support real service contracts or payments.
    </div>

    <DocumentSection title='1. Identification and scope'>
      <p>
        These terms govern access to and use of the Hermyx application (the
        “Application”). This academic version does not identify a commercial
        operator for contracting services. Before a real version is published,
        the operator’s name or company name, tax identification number, address,
        contact email and, where applicable, registration details must be added.
      </p>
      <p>
        Accepting these terms only permits use of the prototype in the
        environment enabled for the project. It does not by itself create an
        employment, commercial or paid service relationship.
      </p>
    </DocumentSection>

    <DocumentSection title='2. Requirements and user account'>
      <p>
        Hermyx is restricted to people aged 18 or over. Users must provide
        truthful information, keep it up to date and create only one personal
        account. Credentials may not be transferred, sold or shared.
      </p>
      <p>
        Users are responsible for safeguarding their password and reporting any
        unauthorised access. Hermyx may suspend or restrict an account when
        there are indications of fraud, abuse, impersonation, illegal content or
        a breach of these terms.
      </p>
      <p>
        Users may request account deletion. Deletion may remain pending while
        active services, test payments, incidents or disputes need to be closed
        or retained due to a legal obligation.
      </p>
    </DocumentSection>

    <DocumentSection title='3. How services work'>
      <p>
        Hermyx allows users to publish services with a title, description,
        location, photographs, vacancies and a reward. The applicant must
        describe the service sufficiently, lawfully and without deception, and
        set conditions they can fulfil.
      </p>
      <ol className='list-decimal space-y-2 pl-6'>
        <li>
          Other users may request to join a vacancy or receive an invitation.
        </li>
        <li>
          Participation depends on acceptance and the service status shown by
          the Application.
        </li>
        <li>
          A service may be closed when its vacancies are filled and it enters
          the test funding flow.
        </li>
        <li>
          Work begins when the service status indicates it, and the collaborator
          may communicate with the team through the available tools.
        </li>
        <li>
          When the collaborator finishes their work, they may mark the
          participation as delivered through the Application. This records the
          status change and notifies the applicant. In this prototype version,
          Hermyx does not store a formal service file or result; additional
          details may be communicated through the available tools. The applicant
          may accept the participation, request a revision, reject it or open an
          incident according to the available flow.
        </li>
      </ol>
      <p>
        If the applicant does not review a delivery within the configured
        period, the current version may accept it automatically after one week.
        This mechanism does not prevent technical errors from being corrected or
        fraudulent conduct from being investigated.
      </p>
    </DocumentSection>

    <DocumentSection title='4. Hermyx’s role'>
      <p>
        Hermyx facilitates contact between users and provides tools to publish
        services, communicate, manage test payments, receive reports and resolve
        incidents. It does not guarantee the identity, availability, quality,
        legality or behaviour of any user, nor that a service will be completed
        successfully.
      </p>
      <p>
        Hermyx is not the collaborator’s employer and is not necessarily the
        provider of the underlying service. The legal classification of each
        relationship will depend on how a potential commercial version operates
        in practice and on applicable law; this clause does not exclude
        responsibilities that legally belong to the operator.
      </p>
      <p>
        Collaborators decide independently whether, when and how to perform an
        accepted service. Hermyx does not impose working schedules or
        exclusivity, provide work tools or set a salary. Service conditions and
        rewards are agreed between the users through the Application. Stripe
        Connect handles connected-account onboarding and the related payment
        transfers, while Hermyx may charge a platform service fee.
      </p>
    </DocumentSection>

    <DocumentSection title='5. Payments, fees and refunds'>
      <p>
        The prototype displays a reward calculation and a 10% service fee. For
        example, a €100 reward generates a €10 fee and a displayed total of
        €110. The reward intended for the collaborator would be €100.
      </p>
      <p>
        Stripe is integrated exclusively with test keys and test operations.
        Real cards must not be entered. Screens may simulate confirmations,
        refunds or transfers, but this version of Hermyx does not provide a real
        escrow, custodial or funds-holding service.
      </p>
      <p>
        Before accepting real money, the total price, taxes, Stripe fees, failed
        payments, chargebacks, fraud, full or partial refunds, delays and
        connected-account requirements for collaborators must be defined. The
        model must be reviewed from legal, tax and regulatory perspectives.
      </p>
      <p>
        If a future version operates with consumers and a business, it must
        provide the applicable pre-contract information, total price and rules
        on withdrawal and its exceptions.
      </p>
    </DocumentSection>

    <DocumentSection title='6. Content and intellectual property'>
      <p>
        Users retain their rights to text, photographs, messages and files. By
        uploading content, they declare that they have sufficient authorisation
        and grant Hermyx a non-exclusive, limited and free licence to host,
        display, process and make it available within the Application while
        necessary to provide its functions.
      </p>
      <p>Users may not publish or request:</p>
      <ul className='list-disc space-y-2 pl-6'>
        <li>Illegal, fraudulent, deceptive or plagiarised content.</li>
        <li>
          Photographs or personal data of third parties without authorisation.
        </li>
        <li>Harassment, threats, discrimination or impersonation.</li>
        <li>
          Dangerous or criminal tasks, or tasks requiring an unverified
          professional licence.
        </li>
        <li>
          Drugs, weapons, sexual exploitation or other unlawful activities.
        </li>
        <li>
          Payments or agreements outside Hermyx to bypass its controls or fees.
        </li>
      </ul>
    </DocumentSection>

    <DocumentSection title='7. Moderation, reports and disputes'>
      <p>
        Users may report a profile, service, message or participation through
        the available tools or the channel enabled for the project. The
        administrator team may request information, remove content, restrict
        features, suspend or remove accounts and close services when necessary
        to protect the community or comply with the law.
      </p>
      <p>
        Decisions will be notified where possible, including the reasons and, if
        supported by the prototype, the internal procedure for responding or
        requesting a review. Disputes about a delivery or reward will be handled
        through the internal incident flow. Moderation does not replace any
        administrative or judicial procedures that may apply.
      </p>
    </DocumentSection>

    <DocumentSection title='8. Privacy and third-party services'>
      <p>
        Operation may involve account and authentication data, Google and
        Firebase, profiles, location, photographs, messages, reports, reviews,
        Stripe identifiers and data required for test operations. Detailed
        information about the controller, purposes, legal bases, recipients,
        transfers, retention and rights is available in the{' '}
        <Link to='/privacy' className='text-foreground underline'>
          Privacy policy
        </Link>
        .
      </p>
      <p>
        Some features may use Azure storage in production and mapping services
        such as OpenStreetMap/Nominatim. These third parties may have their own
        terms and policies.
      </p>
    </DocumentSection>

    <DocumentSection title='9. Tax matters'>
      <p>
        Each user is responsible for their tax, employment and social security
        obligations where applicable. If a future version facilitates paid
        personal services through the platform, Hermyx may request, retain or
        communicate user data when required by regulations, including DAC7 and
        its applicable national implementing rules.
      </p>
    </DocumentSection>

    <DocumentSection title='10. Availability and changes'>
      <p>
        The prototype is provided for academic purposes, may contain errors and
        may change or become unavailable without a continuity guarantee. Users
        must keep their own files and must not use the demo for critical
        decisions or to provide real services.
      </p>
      <p>
        New versions of these terms will be published on this page with their
        version and date. If a commercial version is enabled, the operator must
        establish the legally required information and acceptance procedure.
      </p>
    </DocumentSection>

    <DocumentSection title='11. Applicable law and contact'>
      <p>
        No commercial operator or fictitious contractual address is designated
        for the academic version. A real version must define the applicable law,
        jurisdiction and valid contact channel before accepting contracts or
        payments.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const LegalNotice = () => (
  <LegalDocument
    title='Legal notice'
    description='Identification and liability information for Hermyx.'
  >
    <div className='rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 text-foreground'>
      This page expressly identifies the details that must still be completed
      before publishing Hermyx as a commercial service.
    </div>
    <DocumentSection title='Project operator'>
      <p>
        Hermyx is an academic prototype developed as part of a final degree
        project. This version is not presented as a company, commercial
        marketplace or payment service provider.
      </p>
      <p>
        Operator, tax identification number, address, email and registration
        details: not applicable to this academic demo. They must not be replaced
        with fictitious information and must be added before a commercial
        publication.
      </p>
    </DocumentSection>
    <DocumentSection title='Liability'>
      <p>
        The Application is provided to demonstrate a flow for services,
        profiles, communication and test payments. User-published content
        belongs to its authors and does not imply validation or recommendation
        by the project.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const PrivacyPolicy = () => (
  <LegalDocument
    title='Privacy policy'
    description='Information about data that the Hermyx prototype may process and the items that must be completed for a real version.'
  >
    <div className='rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 text-foreground'>
      This policy is an information basis for the final degree project. Before
      processing data in production, the controller’s real identity, legal
      bases, retention periods and specific providers must be added and reviewed
      professionally.
    </div>
    <DocumentSection title='Controller and processed data'>
      <p>
        Data controller: pending completion; this demo must not use fictitious
        identifying details. Depending on the features used, Hermyx may process
        account data (username, email and Firebase/Google authentication),
        profile data, location, photographs, messages, reports, reviews,
        participations and Stripe identifiers associated with test operations.
      </p>
    </DocumentSection>
    <DocumentSection title='Purposes and retention'>
      <p>
        Data may be used to create and protect accounts, display profiles and
        services, manage participations, maintain conversations, process reports
        and disputes, test payments and improve the prototype. Retention periods
        and deletion criteria must be set before production launch.
      </p>
    </DocumentSection>
    <DocumentSection title='Providers and recipients'>
      <p>
        The prototype may rely on Firebase/Google for authentication, Stripe for
        test operations, Azure Blob Storage for production files and
        OpenStreetMap/Nominatim for mapping features. Processing agreements,
        international transfers and applicable safeguards must be formalised and
        documented for each provider.
      </p>
    </DocumentSection>
    <DocumentSection title='Rights'>
      <p>
        Users should be able to exercise their rights of access, rectification,
        deletion, objection, restriction and portability, and withdraw consent
        where it is the legal basis. The exercise channel and competent
        supervisory authority must be added using the controller’s real details.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const CookiePolicy = () => (
  <LegalDocument
    title='Cookie policy'
    description='Information about cookies and similar technologies used by the Hermyx prototype.'
  >
    <DocumentSection title='Current prototype status'>
      <p>
        The current version has no advertising purpose or proprietary
        non-technical analytics system. It may use local storage and
        technologies needed to maintain interface preferences, authentication or
        security; the definitive inventory must be verified for each deployment.
      </p>
    </DocumentSection>
    <DocumentSection title='Before a commercial version'>
      <p>
        If analytics, personalisation, advertising or non-essential third-party
        services are added, clear information must be shown, the appropriate
        consent must be obtained and granular, revocable settings must be
        offered. Provider, duration and purpose details must be kept up to date.
      </p>
    </DocumentSection>
  </LegalDocument>
);

export const CommunityGuidelines = () => (
  <LegalDocument
    title='Community guidelines'
    description='Rules for respectful conduct and content on Hermyx.'
  >
    <DocumentSection title='Expected behaviour'>
      <p>
        Treat other people with respect, describe services honestly, honour the
        agreements you accept and use the reporting channels when there is a
        risk or breach. Do not request data, payments or external communication
        to bypass the prototype’s protections.
      </p>
    </DocumentSection>
    <DocumentSection title='Prohibited content'>
      <ul className='list-disc space-y-2 pl-6'>
        <li>Fraud, spam, impersonation, plagiarism or rights infringement.</li>
        <li>
          Third-party personal data without a lawful basis or authorisation.
        </li>
        <li>Threats, harassment, hate, discrimination or exploitation.</li>
        <li>
          Criminal or dangerous activities, or activities requiring unavailable
          permits.
        </li>
        <li>Deceptive offers, external payments or review manipulation.</li>
      </ul>
    </DocumentSection>
    <DocumentSection title='Enforcement'>
      <p>
        Depending on the severity, the project may hide content, request
        changes, restrict a service, suspend an account or refer the case to the
        competent authorities. Affected people may request a review through the
        channel enabled for the demo, without prejudice to their legal rights.
      </p>
    </DocumentSection>
  </LegalDocument>
);
