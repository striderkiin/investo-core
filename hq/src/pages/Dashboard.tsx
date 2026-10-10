import { Badge, Card, CardBody, CardHeader, CardTitle, Col, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { api, today } from '../api';
import PageTitle from '../PageTitle';
import { BILLING_LABEL, BILLING_VARIANT, formatDate, money } from '../types';
import { useLoad } from '../useLoad';

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Col md={6} xl={3}>
    <Card>
      <CardBody>
        <p className="text-muted text-uppercase fs-12 fw-medium mb-1">{label}</p>
        <h3 className="mb-0">{value}</h3>
        {hint && <p className="text-muted fs-12 mb-0 mt-1">{hint}</p>}
      </CardBody>
    </Card>
  </Col>
);

const Dashboard = () => {
  const { data, error } = useLoad(async () => {
    const [sites, buyers, payments, settings] = await Promise.all([api.sites(), api.buyers(), api.payments(), api.settings()]);
    return { sites, buyers, payments, settings };
  });

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="spinner-border text-primary" role="status" />;

  const { sites, buyers, payments, settings } = data;
  const active = sites.filter((s) => s.status !== 'cancelled');
  const live = sites.filter((s) => s.status === 'live');
  const monthStart = today().slice(0, 7);
  const thisMonth = payments.filter((p) => !p.voided_at && p.paid_at.startsWith(monthStart)).reduce((sum, p) => sum + Number(p.amount), 0);
  const expected = active.reduce((sum, s) => {
    if (s.status === 'parked') return sum + Number(settings.parking_fee);
    if (s.billing_cycle === 'yearly') return sum + Number(settings.yearly_fee) / 12;
    return sum + Number(s.monthly_fee);
  }, 0);
  const attention = active
    .filter((s) => s.billing_state !== 'paid' || (s.days_left !== null && s.days_left <= 7))
    .sort((a, b) => (a.days_left ?? -999) - (b.days_left ?? -999));

  return (
    <>
      <PageTitle title="Dashboard" />
      <Row>
        <Stat label="Buyers" value={String(buyers.length)} />
        <Stat label="Live sites" value={String(live.length)} hint={`${active.length - live.length} setting up or parked`} />
        <Stat label="Expected each month" value={money(Math.round(expected))} hint="Monthly fees, yearly plans divided by 12, and parking" />
        <Stat label="Received this month" value={money(thisMonth)} />
      </Row>
      <Card>
        <CardHeader>
          <CardTitle as="h4">Needs attention</CardTitle>
          <p className="text-muted mb-0 mt-1">Sites that are unpaid, in the {settings.grace_days}-day grace period, overdue, or due within 7 days.</p>
        </CardHeader>
        <CardBody className="pt-0">
          {attention.length === 0 ? (
            <p className="text-muted mb-0">Nothing needs attention right now.</p>
          ) : (
            <div className="table-responsive">
              <Table className="mb-0 table-centered">
                <thead className="table-light">
                  <tr>
                    <th>Site</th>
                    <th>Buyer</th>
                    <th>Paid until</th>
                    <th>Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/sites/${s.id}`}>{s.name}</Link>
                        {s.domain && <div className="text-muted fs-12">{s.domain}</div>}
                      </td>
                      <td>{s.buyer_name}</td>
                      <td>
                        {formatDate(s.paid_until)}
                        {s.days_left !== null && (
                          <div className="text-muted fs-12">
                            {s.days_left >= 0 ? `${s.days_left} days left` : `${Math.abs(s.days_left)} days ago`}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg={BILLING_VARIANT[s.billing_state]}>{BILLING_LABEL[s.billing_state]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default Dashboard;
