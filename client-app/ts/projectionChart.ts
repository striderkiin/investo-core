import { createProjectionService } from '../../src/services/api/projectionService';
import { buildProjectionSeries, PROJECTION_LABEL, type CustomerProjection, type ProjectionChart } from '../../src/shared/projection';

const projectionService = createProjectionService();

export interface ChartPoint {
  value: number;
  recordedAt: string;
}

/** The customer's live projection for a chart, or null. Never throws: a failed lookup just shows the normal chart. */
export async function loadProjection(userId: string, chart: ProjectionChart): Promise<CustomerProjection | null> {
  try {
    return await projectionService.getMine(userId, chart);
  } catch {
    return null;
  }
}

/** The asset a market projection was prepared for ('platform' unless the admin picked a market). */
export const projectionAsset = (projection: CustomerProjection) => projection.params.asset || 'platform';

export interface ProjectedSeries {
  series: { name: string; data: (number | null)[] }[];
  dates: Date[];
  /** Per-series dash length: the projection is dashed when drawn over real data. */
  dashArray: number[];
  end: number;
}

/**
 * Chart data with the projection applied. Replace draws only the projection;
 * overlay keeps the real history and continues it as a dashed line.
 */
export function withProjection(real: ChartPoint[], projection: CustomerProjection): ProjectedSeries {
  const lastReal = real.at(-1)?.value;
  if (projection.mode === 'overlay' && lastReal !== undefined) {
    const path = buildProjectionSeries(projection.params, lastReal, new Date(real.at(-1)!.recordedAt));
    const future = path.slice(1);
    return {
      series: [
        { name: '$', data: [...real.map((p) => Number(p.value.toFixed(2))), ...future.map(() => null)] },
        { name: PROJECTION_LABEL, data: [...real.slice(0, -1).map(() => null), lastReal, ...future.map((p) => p.value)] },
      ],
      dates: [...real.map((p) => new Date(p.recordedAt)), ...future.map((p) => p.date)],
      dashArray: [0, 5],
      end: path.at(-1)!.value,
    };
  }
  const start = projection.params.amount && projection.params.amount > 0 ? projection.params.amount : (lastReal ?? 100);
  const path = buildProjectionSeries(projection.params, start);
  return {
    series: [{ name: PROJECTION_LABEL, data: path.map((p) => p.value) }],
    dates: path.map((p) => p.date),
    dashArray: [0],
    end: path.at(-1)!.value,
  };
}

const describe = (projection: CustomerProjection) => {
  const { targetReturnPct, periodDays } = projection.params;
  const sign = targetReturnPct >= 0 ? '+' : '';
  return `${sign}${targetReturnPct}% over ${periodDays} day${periodDays === 1 ? '' : 's'}`;
};

/**
 * Adds the small "Projection" pill beside a card's title, and a caption under
 * the chart with the scenario and the admin's note. Calling it again with
 * null removes both (e.g. when the customer picks another asset).
 */
export function markProjection(key: string, titleEl: Element | null, chartEl: Element | null, projection: CustomerProjection | null, onDark = false): void {
  document.getElementById(`projection-pill-${key}`)?.remove();
  document.getElementById(`projection-note-${key}`)?.remove();
  if (!projection) return;

  if (titleEl) {
    const pill = document.createElement('span');
    pill.id = `projection-pill-${key}`;
    pill.className = 'f12-medium';
    pill.textContent = PROJECTION_LABEL;
    pill.title = 'Prepared for you by our team. Not your account balance.';
    Object.assign(pill.style, {
      display: 'inline-block',
      marginLeft: '8px',
      padding: '1px 8px',
      borderRadius: '999px',
      verticalAlign: 'middle',
      border: `1px solid ${onDark ? 'rgba(255,255,255,.7)' : '#a8442e'}`,
      color: onDark ? '#fff' : '#a8442e',
    });
    titleEl.appendChild(pill);
  }

  if (chartEl) {
    const note = document.createElement('p');
    note.id = `projection-note-${key}`;
    note.className = `f12-regular ${onDark ? 'text-White' : 'text-Gray'}`;
    note.style.marginTop = '6px';
    note.textContent = [`Projection: ${describe(projection)}. Not your account balance.`, projection.params.note?.trim()].filter(Boolean).join(' ');
    chartEl.insertAdjacentElement('afterend', note);
  }
}
