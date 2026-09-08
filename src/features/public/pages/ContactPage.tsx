import { LegalPage } from './LegalPage';

export function ContactPage() {
  return (
    <LegalPage title="Contact Us">
      <p>Have a question about your account, a deposit, or a withdrawal? Our support team is here to help.</p>
      <ul className="list-unstyled">
        <li className="mb-2">
          <i className="bi bi-envelope me-2" aria-hidden="true" />
          support@investo.example
        </li>
        <li className="mb-2">
          <i className="bi bi-chat-dots me-2" aria-hidden="true" />
          Open a ticket from your dashboard&apos;s Support Center once logged in for the fastest response.
        </li>
      </ul>
    </LegalPage>
  );
}
