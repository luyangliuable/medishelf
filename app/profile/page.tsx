import ProfilePage from '@/components/ProfilePage'
import { requireCurrentUser } from '@/lib/server/currentUser'

export default async function Profile() {
  const user = await requireCurrentUser()
  return <ProfilePage user={user} />
}
