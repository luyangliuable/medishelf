import HistoryPage from '@/components/HistoryPage'
import { listSubmissions } from '@/lib/database/submissions'
import { requireCurrentUser } from '@/lib/server/currentUser'

export default async function History() {
  const user = await requireCurrentUser()
  const initialItems = await listSubmissions(user.id)
  return <HistoryPage user={user} initialItems={initialItems} />
}
