import NotificationsPage from '@/components/NotificationsPage'
import { listNotifications } from '@/lib/database/notifications'
import { requireCurrentUser } from '@/lib/server/currentUser'

export default async function Notifications() {
  const user = await requireCurrentUser()
  const notifications = await listNotifications(user.id)
  return <NotificationsPage user={user} notifications={notifications} />
}
