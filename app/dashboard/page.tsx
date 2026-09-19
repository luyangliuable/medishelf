import DashboardPage from '@/components/DashboardPage'
import { countSubmissions } from '@/lib/database/submissions'
import { requireCurrentUser } from '@/lib/server/currentUser'

export default async function Dashboard() {
  const user = await requireCurrentUser()
  const count = await countSubmissions(user.id)
  return <DashboardPage user={user} count={count} />
}
