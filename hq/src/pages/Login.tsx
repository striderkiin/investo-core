import { Icon } from '@iconify/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { errorText, supabase } from '../supabase';

type Enrollment = { factorId: string; qrCode: string; secret: string };

// Starts a fresh authenticator setup, clearing any unfinished earlier attempt
// so an abandoned QR code never becomes a valid second factor.
const startEnrollment = async (): Promise<Enrollment> => {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw listError;
  for (const factor of factors.all.filter((f) => f.status === 'unverified')) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `HQ authenticator ${Date.now()}` });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
};

const LoginPage = () => {
  const { access, refresh, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const enrollmentRequest = useRef<Promise<Enrollment> | null>(null);

  useEffect(() => {
    if (access !== 'needs_setup') return;
    let active = true;
    enrollmentRequest.current ??= startEnrollment();
    enrollmentRequest.current
      .then((result) => active && setEnrollment(result))
      .catch((err: unknown) => active && setError(errorText(err, 'Could not start authenticator setup.')));
    return () => {
      active = false;
    };
  }, [access]);

  useEffect(() => {
    if (access !== 'not_owner') return;
    setError('This account does not have access to HQ.');
    void signOut();
  }, [access, signOut]);

  if (access === 'ok') return <Navigate to="/" replace />;

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      setPassword('');
    } catch (err) {
      setError(errorText(err, 'Sign in failed. Check your email and password.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let factorId = enrollment?.factorId;
      if (!factorId) {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        factorId = factors.totp[0]?.id;
        if (!factorId) throw new Error('No authenticator is set up for this account.');
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
      if (verifyError) throw verifyError;
      setCode('');
      await refresh();
    } catch (err) {
      setError(errorText(err, 'That code did not work. Try the current code.'));
    } finally {
      setBusy(false);
    }
  };

  const step = access === 'needs_setup' ? 'setup' : access === 'needs_code' ? 'code' : 'password';
  const subtitle =
    step === 'setup' ? 'HQ requires two-factor authentication.' : step === 'code' ? 'Enter the code from your authenticator app.' : 'Sign in to continue to HQ.';

  return (
    <div className="container-xxl">
      <Row className="vh-100 d-flex justify-content-center">
        <Col xs={12} className="align-self-center">
          <CardBody>
            <Row>
              <Col lg={4} className="mx-auto">
                <Card>
                  <CardBody className="p-0 bg-black auth-header-box rounded-top">
                    <div className="text-center p-3">
                      <img src="/brand/investo-mark.png" height={50} alt="logo" className="auth-logo" />
                      <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Investo HQ</h4>
                      <p className="text-muted fw-medium mb-0">{subtitle}</p>
                    </div>
                  </CardBody>
                  <CardBody className="pt-0">
                    {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
                    {access === 'loading' && (
                      <div className="text-center my-5">
                        <div className="spinner-border text-primary" role="status" />
                      </div>
                    )}
                    {step === 'password' && access !== 'loading' && (
                      <form className="my-4" onSubmit={signIn}>
                        <div className="form-group mb-2">
                          <label className="form-label" htmlFor="email">
                            Email
                          </label>
                          <input id="email" type="email" className="form-control" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="password">
                            Password
                          </label>
                          <input
                            id="password"
                            type="password"
                            className="form-control"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="d-grid mt-3">
                          <button className="btn btn-primary flex-centered" type="submit" disabled={busy}>
                            Log In <Icon icon="fa6-solid:right-to-bracket" className="ms-1" />
                          </button>
                        </div>
                      </form>
                    )}
                    {(step === 'setup' || step === 'code') && (
                      <form className="my-4" onSubmit={verify}>
                        {step === 'setup' && (
                          <>
                            <p className="text-muted mb-3">
                              Scan this QR code with an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password, then enter
                              the 6-digit code it shows.
                            </p>
                            <div className="text-center mb-3">
                              {enrollment ? (
                                <img
                                  src={
                                    enrollment.qrCode.startsWith('data:')
                                      ? enrollment.qrCode
                                      : `data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`
                                  }
                                  alt="Authenticator QR code"
                                  width={180}
                                  height={180}
                                  className="border rounded p-2 bg-white"
                                />
                              ) : (
                                <div className="spinner-border text-primary my-5" role="status" />
                              )}
                            </div>
                            {enrollment && (
                              <p className="text-muted text-center fs-12 mb-3">
                                Can&apos;t scan it? Enter this key instead:
                                <br />
                                <code className="user-select-all">{enrollment.secret}</code>
                              </p>
                            )}
                          </>
                        )}
                        <div className="form-group mb-2">
                          <label className="form-label" htmlFor="code">
                            Authentication code
                          </label>
                          <input
                            id="code"
                            className="form-control"
                            placeholder="123456"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                        <div className="d-grid mt-3">
                          <button className="btn btn-primary flex-centered" type="submit" disabled={busy || (step === 'setup' && !enrollment)}>
                            {step === 'setup' ? 'Turn on two-factor authentication' : 'Verify'}
                            <Icon icon="fa6-solid:shield-halved" className="ms-1" />
                          </button>
                        </div>
                        <div className="text-center mt-3">
                          <button type="button" className="btn btn-link p-0" onClick={() => void signOut()}>
                            Use a different account
                          </button>
                        </div>
                      </form>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </CardBody>
        </Col>
      </Row>
    </div>
  );
};

export default LoginPage;
