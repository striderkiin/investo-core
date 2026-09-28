import type ReactApexChartComponent from 'react-apexcharts'
import * as chartModule from 'react-apexcharts/dist/react-apexcharts.min.js'

// react-apexcharts 1.4 ships only a CommonJS build (`exports.default =
// Charts`). Next unwraps that default; Vite's dependency pre-bundling hands
// it back one level deeper, so the component is unwrapped here.
type Chart = typeof ReactApexChartComponent
const loaded = chartModule as unknown as { default: Chart | { default: Chart } }
const ReactApexChart = ('default' in loaded.default ? loaded.default.default : loaded.default) as Chart

export default ReactApexChart
