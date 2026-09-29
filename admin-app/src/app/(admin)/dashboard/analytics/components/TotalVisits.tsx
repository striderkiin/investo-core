import ComponentContainerCard from '@/components/ComponentContainerCard'
import type { DashboardData } from '../useDashboardData'
import MovementTable from './MovementTable'

const TotalVisits = ({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) => {
  return (
    <ComponentContainerCard title="Recent Withdrawals">
      <MovementTable rows={data.withdrawals.slice(0, 5)} data={data} emptyText="No withdrawals yet." viewAllHref="/withdrawals" onRefresh={onRefresh} />
    </ComponentContainerCard>
  )
}

export default TotalVisits
