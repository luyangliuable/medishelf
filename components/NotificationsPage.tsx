import AppShell from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import type { Notification, User } from '@/lib/types'

/** Renders persisted notifications for the authenticated user. */
export default function NotificationsPage({
  user,
  notifications
}: {
  user: User
  notifications: Notification[]
}) {
  return (
    <AppShell active="/notifications" user={user}>
      <div className="px-6 pt-8 pb-28 md:pb-10">
        <PageHeader title="Notifications" />
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-secondary p-8 text-center">
            <h2 className="text-base font-bold">No notifications yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a product to receive status updates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <Card key={notification.id} className="rounded-2xl border-none bg-secondary p-4">
                <strong className="block text-[15px]">{notification.title}</strong>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat('en-AU', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }).format(new Date(notification.created_at))}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
