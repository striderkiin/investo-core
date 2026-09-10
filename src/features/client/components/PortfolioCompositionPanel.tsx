import { useEffect, useState } from 'react';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useAuth } from '../../../hooks/useAuth';
import { createInvestmentService } from '../../../services/api/investmentService';
import type { InvestmentPlan } from '../../../types/database';

ChartJS.register(ArcElement, Tooltip);

const investmentService = createInvestmentService();

/* A small, fixed set of gold-family shades (not a rainbow palette — the
   default gold accent plus tonal variations of it) so a client with several
   active plans can still tell holdings apart in the legend/chart. */
const SLICE_COLORS = ['#c6a15b', '#8a6a34', '#e4c98a', '#5c4826', '#f0dfb8'];

interface Holding {
  planId: string;
  planName: string;
  amount: number;
}

/** Ported from Critso's account.html "Card Details" donut + legend pattern,
 * repurposed as real portfolio-composition-by-holding per the client dashboard
 * build brief (replacing Critso's own BTC/XRP/ETH/ZEC watchlist checkboxes,
 * which don't map to anything this platform has — this app has investment
 * plans, not tradable assets). */
export function PortfolioCompositionPanel() {
  const { profile } = useAuth();
  const [holdings, setHoldings] = useState<Holding[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    Promise.all([investmentService.listMyInvestments(profile.id), investmentService.listPlans()])
      .then(([investments, plans]) => {
        const planName = new Map<string, string>(plans.map((p: InvestmentPlan) => [p.id, p.name]));
        const byPlan = new Map<string, number>();
        for (const inv of investments) {
          if (inv.status !== 'active' && inv.status !== 'completed') continue;
          byPlan.set(inv.planId, (byPlan.get(inv.planId) ?? 0) + inv.amount);
        }
        const rows = Array.from(byPlan.entries())
          .map(([planId, amount]) => ({ planId, planName: planName.get(planId) ?? 'Plan', amount }))
          .sort((a, b) => b.amount - a.amount);
        setHoldings(rows);
      })
      .catch(() => setHoldings([]));
  }, [profile]);

  const total = holdings?.reduce((sum, h) => sum + h.amount, 0) ?? 0;

  return (
    <div className="wg-box h-100">
      <div className="title mb-3">
        <div className="label-01">Portfolio Composition</div>
      </div>
      {holdings === null ? (
        <p className="text-secondary small mb-0">Loading…</p>
      ) : holdings.length === 0 ? (
        <p className="text-secondary small mb-0">No active or completed investments yet — your allocation by plan will show up here once you invest.</p>
      ) : (
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <div style={{ width: 140, height: 140 }}>
            <Doughnut
              data={{
                labels: holdings.map((h) => h.planName),
                datasets: [
                  {
                    data: holdings.map((h) => h.amount),
                    backgroundColor: holdings.map((_, i) => SLICE_COLORS[i % SLICE_COLORS.length]),
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                cutout: '70%',
                plugins: {
                  tooltip: { callbacks: { label: (ctx) => `$${Number(ctx.parsed).toLocaleString(undefined, { minimumFractionDigits: 2 })}` } },
                },
              }}
            />
          </div>
          <ul className="list-unstyled flex-grow-1 mb-0" style={{ minWidth: 160 }}>
            {holdings.map((holding, index) => (
              <li key={holding.planId} className="d-flex justify-content-between align-items-center mb-2">
                <div className="block-legend">
                  <div className="dot" style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }} />
                  <div className="f14-regular text-secondary">{holding.planName}</div>
                </div>
                <div className="f14-bold">{total > 0 ? Math.round((holding.amount / total) * 100) : 0}%</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
