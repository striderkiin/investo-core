import { useState } from 'react';
import type { FormEvent } from 'react';
import { createContactService } from '../../../services/api/contactService';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import { PublicPageHero } from '../../../components/public/PublicPageHero';
import { PublicSection } from '../../../components/public/PublicSection';

const contactService = createContactService();

export function ContactPage() {
  const { profile } = useAuth();
  const { branding } = useBranding();
  const [name, setName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) return;

    setStatus('submitting');
    setError(null);
    try {
      await contactService.submit({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setStatus('sent');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong sending your message. Please try again.');
    }
  }

  return (
    <>
      <PublicPageHero
        eyebrow="Contact"
        title="Get in touch"
        subtitle={`Have a question about ${branding.siteName}, a deposit, or a withdrawal? Send us a message and our team will get back to you. Already have an account? You can also open a ticket from your dashboard's Support Center for the fastest response.`}
      />
      <PublicSection className="container py-5" style={{ maxWidth: 640 }}>
      {status === 'sent' ? (
        <div className="alert alert-success d-flex align-items-center gap-2" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          <span>Thanks — your message has been sent. We&apos;ll reply to {email} as soon as we can.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {status === 'error' && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label htmlFor="contactName" className="form-label small">
                Name
              </label>
              <input
                id="contactName"
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={status === 'submitting'}
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="contactEmail" className="form-label small">
                Email
              </label>
              <input
                id="contactEmail"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'submitting'}
              />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="contactSubject" className="form-label small">
              Subject
            </label>
            <input
              id="contactSubject"
              type="text"
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={status === 'submitting'}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="contactMessage" className="form-label small">
              Message
            </label>
            <textarea
              id="contactMessage"
              className="form-control"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={status === 'submitting'}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
            {status === 'submitting' ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Sending...
              </>
            ) : (
              'Send Message'
            )}
          </button>
        </form>
      )}

      <ul className="list-unstyled mt-5 text-secondary small">
        <li className="mb-2">
          <i className="bi bi-envelope me-2" aria-hidden="true" />
          support@investo.example
        </li>
      </ul>
      </PublicSection>
    </>
  );
}
