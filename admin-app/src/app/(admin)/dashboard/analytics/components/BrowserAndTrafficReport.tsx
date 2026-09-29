import ComponentContainerCard from '@/components/ComponentContainerCard'
import type { DashboardData } from '../useDashboardData'
import MovementTable from './MovementTable'

const BrowserAndTrafficReport = ({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) => {
  return (
    <ComponentContainerCard title="Recent Deposits">
      <MovementTable rows={data.deposits.slice(0, 5)} data={data} emptyText="No deposits yet." viewAllHref="/deposits" onRefresh={onRefresh} />
    </ComponentContainerCard>
  )
}

export default BrowserAndTrafficReport
