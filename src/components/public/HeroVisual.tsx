/**
 * Abstract ascending node/line network for the hero — thin gold linework on
 * transparent background, matching the "isometric interconnected nodes and
 * ascending line-graph forms" brief. Built as inline SVG (not a raster
 * asset) so it's crisp at any size and trivially recolorable/swappable —
 * no file to manage, no binary asset to white-label. Nodes are denser and
 * lower on the left, sparser and higher on the right, tracing an upward
 * trend without spelling out an actual chart.
 */
const NODES: [number, number][] = [
  [20, 260], [70, 230], [110, 270], [140, 200], [180, 235],
  [210, 180], [250, 210], [270, 150], [310, 175], [330, 120],
  [370, 145], [400, 95], [430, 130], [460, 75], [495, 100],
  [520, 55], [555, 80], [580, 35],
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6],
  [5, 7], [6, 7], [7, 8], [7, 9], [8, 9], [9, 10], [9, 11], [10, 11],
  [11, 12], [11, 13], [12, 13], [13, 14], [13, 15], [14, 15], [15, 16],
  [15, 17], [16, 17],
];

export function HeroVisual() {
  return (
    <svg
      viewBox="0 0 600 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label=""
      style={{ width: '100%', height: 'auto', opacity: 0.85 }}
    >
      <g stroke="var(--pub-accent)" strokeWidth="0.75" strokeLinecap="round" opacity="0.55">
        {EDGES.map(([a, b], i) => {
          const [x1, y1] = NODES[a];
          const [x2, y2] = NODES[b];
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <g fill="var(--pub-accent)">
        {NODES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 1.8} opacity={i % 3 === 0 ? 0.9 : 0.6} />
        ))}
      </g>
    </svg>
  );
}
