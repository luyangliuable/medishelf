'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, RefreshCw, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { formatDate, statusLabel } from '@/lib/filePaths'
import { deleteSubmission, getHistory, retrySubmissionAnalysis } from '@/lib/submissions'
import type { Submission, User } from '@/lib/types'

const detailColumns = [
  ['name', 'Product name'],
  ['manufacturer', 'Manufacturer'],
  ['barcode', 'Barcode number / GTIN'],
  ['size', 'Size'],
  ['manufactured_on', 'Manufacturer date'],
  ['expires_on', 'Expiration'],
  ['lot', 'Lot'],
  ['reference', 'Reference'],
  ['manufacturer_address', 'Manufacturer address'],
  ['manufacturer_site', 'Manufacturer site']
] as const

function displayValue(value: string | null, isDate = false) {
  if (!value) return 'Not detected'
  if (!isDate) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`))
}

/** Renders real uploads and allows an owner to delete an upload. */
export default function HistoryPage({ user, initialItems }: { user: User; initialItems: Submission[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Submission[]>(initialItems)
  const [selected, setSelected] = useState<Submission | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [retryingId, setRetryingId] = useState<Submission['id'] | null>(null)

  /** Deletes the submission selected in the confirmation dialog. */
  const confirmDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteSubmission(selected.id)
      setItems(previous => previous.filter(item => item.id !== selected.id))
      setSelected(null)
      toast.success('Upload deleted')
    } catch {
      toast.error('Unable to delete upload. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const retryAnalysis = async (submissionId: Submission['id']) => {
    setRetryingId(submissionId)
    try {
      await retrySubmissionAnalysis(submissionId)
      setItems(await getHistory())
      toast.success('Product analysis completed')
    } catch {
      toast.error('Product analysis could not be completed. Please try again.')
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <AppShell active="/history" user={user}>
      <div className="px-6 pt-8 pb-28 md:pb-10">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[23px] font-extrabold">Upload History</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={() => toast.info('Search is coming soon')}
            >
              <Search className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Filter"
              onClick={() => toast.info('Filters are coming soon')}
            >
              <SlidersHorizontal className="size-5" />
            </Button>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-secondary p-8 text-center">
            <h2 className="text-base font-bold">No uploads yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Upload a product to see it here.</p>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-2xl border-none shadow-[0_10px_22px_rgba(18,26,74,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] border-collapse text-left text-sm">
                <thead className="bg-secondary text-xs font-semibold text-muted-foreground">
                  <tr>
                    {detailColumns.map(([, heading]) => (
                      <th key={heading} scope="col" className="whitespace-nowrap px-4 py-3">{heading}</th>
                    ))}
                    <th scope="col" className="whitespace-nowrap px-4 py-3">Uploaded</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">Status</th>
                    <th scope="col" className="sticky right-0 bg-secondary px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(item => {
                    const label = statusLabel(item.status)
                    return (
                      <tr key={item.id} className="bg-background">
                        {detailColumns.map(([key]) => (
                          <td key={key} className="max-w-64 px-4 py-3 align-top">
                            <span className="break-words">
                              {displayValue(item[key], key === 'manufactured_on' || key === 'expires_on')}
                            </span>
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3 align-top text-muted-foreground">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge variant={label === 'Reviewed' ? 'reviewed' : 'pending'}>{label}</Badge>
                        </td>
                        <td className="sticky right-0 bg-background px-4 py-3 text-right align-top">
                          <div className="flex justify-end gap-1">
                            {item.status === 'in_review' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground"
                                aria-label={`Retry analysis for ${item.name || 'upload'}`}
                                onClick={() => retryAnalysis(item.id)}
                                disabled={retryingId === item.id}
                              >
                                <RefreshCw className={`size-4 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground"
                              aria-label={`Edit ${item.name || 'upload'}`}
                              onClick={() => router.push(`/upload/${item.id}`)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Delete ${item.name || 'upload'}`}
                              onClick={() => setSelected(item)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={open => (!open && !deleting ? setSelected(null) : null)}>
        <DialogContent className="max-w-[85%] rounded-3xl text-center">
          <DialogHeader>
            <DialogTitle>Delete this upload?</DialogTitle>
            <DialogDescription>
              This permanently removes the upload and its photos from your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col sm:justify-center">
            <Button variant="destructive" size="lg" className="rounded-2xl" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete upload'}
            </Button>
            <Button variant="outline" size="lg" className="rounded-2xl" onClick={() => setSelected(null)} disabled={deleting}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
