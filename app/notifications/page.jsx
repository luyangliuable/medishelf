import BottomMenu from '@/components/BottomMenu'
import PageHeader from '@/components/PageHeader'
import PhoneFrame from '@/components/PhoneFrame'

const notifications = [
  ['Notification Title', '46 seconds ago', 'Update'],
  ['Notification Title', '2 minutes ago', 'Weekly Recap'],
  ['Notification Title', '1 day ago', 'Update'],
  ['Notification Title', '14 April', 'Weekly Recap'],
  ['Notification Title', '7 April', 'Weekly Recap']
]

const FilterIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></svg>
)

export default function NotificationsPage() {
  return (
    <PhoneFrame><div className="page">
      <div className="notice-header">
        <PageHeader title="Notifications" />
        <button className="filter-btn" aria-label="Filter"><FilterIcon /></button>
      </div>
      {notifications.map(([title, time, type], i) => (
        <div className="notice-card" key={`${type}-${time}-${i}`}>
          <div className="thumb" />
          <div><strong>{title}</strong><p>{time}</p></div>
          <span className={`pill ${type === 'Update' ? 'update' : 'recap'}`}>{type}</span>
        </div>
      ))}
    </div>
    <BottomMenu active="/notifications" />
    </PhoneFrame>
  )
}
