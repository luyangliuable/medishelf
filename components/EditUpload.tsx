'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleCheck, UploadCloud, X } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import CenteredFrame from '@/components/CenteredFrame'
import UploadCamera from '@/components/UploadCamera'
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
import { updateSubmission, type SubmissionImage } from '@/lib/submissions'
import type { Photo, User } from '@/lib/types'

type ExistingImage = SubmissionImage & { pendingDelete: boolean }
type Step = 'review' | 'camera' | 'confirm' | 'saving' | 'done'

const MIN_PHOTOS = 4

type Props = {
  submissionId: string | number
  initialImages: SubmissionImage[]
  user: User
}

export default function EditUpload({ submissionId, initialImages, user }: Props) {
  const router = useRouter()
  const [existing, setExisting] = useState<ExistingImage[]>(() =>
    initialImages.map(img => ({ ...img, pendingDelete: false }))
  )
  const [newPhotos, setNewPhotos] = useState<Photo[]>([])
  const [step, setStep] = useState<Step>('review')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    return () => {
      newPhotos.forEach(p => URL.revokeObjectURL(p.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleExisting = (id: string) =>
    setExisting(prev => prev.map(img => (img.id === id ? { ...img, pendingDelete: !img.pendingDelete } : img)))

  const removeNew = (index: number) =>
    setNewPhotos(prev => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((_, i) => i !== index)
    })

  const remainingCount = existing.filter(e => !e.pendingDelete).length + newPhotos.length
  const hasChanges = newPhotos.length > 0 || existing.some(e => e.pendingDelete)
  const belowMinimum = remainingCount < MIN_PHOTOS
  const saveDisabled = !hasChanges || belowMinimum || busy

  const requestSave = () => {
    if (belowMinimum) {
      setError(`Please keep at least ${MIN_PHOTOS} photos.`)
      return
    }
    setError('')
    setStep('confirm')
  }

  const save = async () => {
    if (!user.id) {
      setError('Please sign in before saving.')
      setStep('review')
      return
    }
    setBusy(true)
    setError('')
    setStep('saving')
    try {
      await updateSubmission(submissionId, {
        addFiles: newPhotos.map(p => p.file),
        removeImageIds: existing.filter(e => e.pendingDelete).map(e => e.id)
      })
      setStep('done')
    } catch (err) {
      setError((err as Error).message)
      setStep('review')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'camera') {
    return (
      <UploadCamera
        photos={newPhotos}
        setPhotos={setNewPhotos}
        onClose={() => setStep('review')}
        onDone={() => setStep('review')}
        error=""
      />
    )
  }

  if (step === 'done') {
    return (
      <CenteredFrame>
        <div className="px-6 pt-[210px] text-center md:pt-16 md:pb-16">
          <CircleCheck className="!size-14 mx-auto mb-4 text-accent" />
          <h1 className="mb-3 text-[28px] font-bold">Changes saved!</h1>
          <p className="mb-7 leading-relaxed text-muted-foreground">
            Your upload has been updated. You can keep editing from the history page.
          </p>
          <Button asChild size="xl" className="mb-3 w-full rounded-2xl">
            <Link href="/history">Back to history</Link>
          </Button>
          <Button
            variant="outline"
            size="xl"
            className="w-full rounded-2xl"
            onClick={() => router.push('/history')}
          >
            View another upload
          </Button>
        </div>
      </CenteredFrame>
    )
  }

  return (
    <CenteredFrame wide>
      <div className="flex flex-1 flex-col px-6 pt-8 pb-6">
        <PageHeader title="Edit Upload" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remove photos you no longer want, or add more. Minimum {MIN_PHOTOS} photos.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {existing.map(img => (
            <Thumbnail
              key={`existing-${img.id}`}
              src={img.publicUrl}
              dimmed={img.pendingDelete}
              onRemove={() => toggleExisting(img.id)}
              removeLabel={img.pendingDelete ? 'Undo remove' : 'Remove photo'}
            />
          ))}
          {newPhotos.map((photo, index) => (
            <Thumbnail
              key={`new-${index}`}
              src={photo.url}
              dimmed={false}
              onRemove={() => removeNew(index)}
              removeLabel="Remove new photo"
            />
          ))}
        </div>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStep('camera')}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setStep('camera')}
          className="mt-5 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#cdd3e0] bg-secondary p-5 shadow-none"
        >
          <UploadCloud className="!size-8 text-foreground" />
          <strong className="text-base font-extrabold">Add more photos</strong>
          <span className="text-xs text-muted-foreground">PNG, JPEG, or HEIC</span>
        </Card>

        {belowMinimum && hasChanges && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-destructive">
            You need at least {MIN_PHOTOS} photos. Add more or undo a removal.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-auto pt-6">
          <Button
            onClick={requestSave}
            disabled={saveDisabled}
            className="h-13 w-full rounded-3xl text-base font-extrabold"
          >
            Save changes
          </Button>
        </div>
      </div>

      <Dialog open={step === 'confirm'} onOpenChange={open => (!open ? setStep('review') : null)}>
        <DialogContent className="max-w-[85%] rounded-3xl text-center">
          <DialogHeader>
            <DialogTitle>Save changes to this upload?</DialogTitle>
            <DialogDescription>
              We&apos;ll add new photos, remove the ones you deleted, and update this submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col sm:justify-center">
            <Button onClick={save} disabled={busy} size="lg" className="rounded-2xl">
              {busy ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={() => setStep('review')} variant="outline" size="lg" className="rounded-2xl">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CenteredFrame>
  )
}

type ThumbnailProps = {
  src: string
  dimmed: boolean
  onRemove: () => void
  removeLabel: string
}

function Thumbnail({ src, dimmed, onRemove, removeLabel }: ThumbnailProps) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#e6eaf2]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Submission photo"
        className={`h-full w-full object-cover transition-opacity ${dimmed ? 'opacity-40' : ''}`}
      />
      {dimmed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/30">
          <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-extrabold text-destructive uppercase tracking-wide">
            Removed
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
