'use client'

import { useState } from 'react'
import { CircleCheck, UploadCloud } from 'lucide-react'
import AccountActions from '@/components/AccountActions'
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
import { uploadSubmission, type SubmissionProcessing } from '@/lib/submissions'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_PHOTO_BATCH_SIZE,
  PHOTO_BATCH_SIZE,
  type Photo
} from '@/lib/types'
import { useUser } from '@/lib/useUser'

type Step = 'intro' | 'camera' | 'confirm' | 'complete'

export default function UploadPage() {
  const { user, loading } = useUser()
  const [step, setStep] = useState<Step>('intro')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState<SubmissionProcessing>('in_review')

  const reset = () => {
    photos.forEach(p => URL.revokeObjectURL(p.url))
    setPhotos([])
    setError('')
    setProcessing('in_review')
    setStep('intro')
  }

  const done = () => {
    if (photos.length < PHOTO_BATCH_SIZE) setError(`Please take at least ${PHOTO_BATCH_SIZE} photos.`)
    else setStep('confirm')
  }

  const addDevicePhotos = (files: FileList | null) => {
    if (!files?.length) return
    const selected = Array.from(files)
    if (photos.length + selected.length > MAX_PHOTO_BATCH_SIZE) {
      setError(`You can add up to ${MAX_PHOTO_BATCH_SIZE} photos.`)
      return
    }
    if (selected.some(file => !ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number]))) {
      setError('Photos must be JPEG, PNG, or WebP images.')
      return
    }
    if (selected.some(file => file.size > MAX_IMAGE_BYTES)) {
      setError('Each photo must be 10 MB or smaller.')
      return
    }
    setError('')
    setPhotos(previous => [...previous, ...selected.map(file => ({ file, url: URL.createObjectURL(file) }))])
  }

  const upload = async () => {
    if (!user?.id) {
      setError('Please sign in before uploading.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await uploadSubmission(photos.map(p => p.file))
      setProcessing(result.processing)
      setStep('complete')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <CenteredFrame />
  if (step === 'camera')
    return <UploadCamera
      photos={photos}
      setPhotos={setPhotos}
      onClose={reset}
      onDone={done}
      error={error}
      onAddDevicePhotos={addDevicePhotos}
    />
  if (step === 'complete') return <Complete onReset={reset} processing={processing} />

  return (
    <Intro
      setStep={setStep}
      error={error}
      confirming={step === 'confirm'}
      busy={busy}
      onUpload={upload}
      onCancel={() => setStep('camera')}
      onFinish={done}
      hasPhotos={photos.length > 0}
    />
  )
}

type IntroProps = {
  setStep: (step: Step) => void
  error: string
  confirming: boolean
  busy: boolean
  onUpload: () => void
  onCancel: () => void
  onFinish: () => void
  hasPhotos: boolean
}

function Intro({
  setStep,
  error,
  confirming,
  busy,
  onUpload,
  onCancel,
  onFinish,
  hasPhotos
}: IntroProps) {
  return (
    <CenteredFrame wide>
      <div className="flex flex-1 flex-col px-6 pt-8 pb-6">
        <AccountActions />
        <PageHeader title="Upload Photos" />
        <p className="mt-7 text-center text-base leading-relaxed text-[#2d3458]">
          Submit at least four photos of the product, up to {MAX_PHOTO_BATCH_SIZE}. Capture the front, sides and
          back to collect all the product details.
        </p>
        <p className="my-5 text-center text-[17px] font-extrabold">Use one clear photo for each side.</p>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStep('camera')}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setStep('camera')}
          className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#cdd3e0] bg-secondary p-5 shadow-none"
        >
          <UploadCloud className="!size-8 text-foreground" />
          <strong className="text-base font-extrabold">Tap to start taking photos</strong>
          <span className="text-xs text-muted-foreground">Use your camera to photograph the product</span>
        </Card>
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-auto pt-6">
          <Button
            onClick={onFinish}
            disabled={!hasPhotos}
            className="h-13 w-full rounded-3xl text-base font-extrabold"
          >
            Finish
          </Button>
        </div>
      </div>
      <Dialog open={confirming} onOpenChange={open => (!open ? onCancel() : null)}>
        <DialogContent className="max-w-[85%] rounded-3xl text-center">
          <DialogHeader>
            <DialogTitle>Finish uploading?</DialogTitle>
            <DialogDescription>
              Please double check you have photos of all sides of the product before submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col sm:justify-center">
            <Button onClick={onUpload} disabled={busy} size="lg" className="rounded-2xl">
              {busy ? 'Uploading...' : 'Finish'}
            </Button>
            <Button onClick={onCancel} variant="outline" size="lg" className="rounded-2xl">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CenteredFrame>
  )
}

function Complete({
  onReset,
  processing
}: {
  onReset: () => void
  processing: SubmissionProcessing
}) {
  return (
    <CenteredFrame>
      <div className="px-6 pt-6 text-center md:pb-16">
        <AccountActions />
        <div className="pt-[150px] md:pt-10">
        <CircleCheck className="!size-14 mx-auto mb-4 text-accent" />
        <h1 className="mb-3 text-[28px] font-bold">Upload complete!</h1>
        <p className="mb-7 leading-relaxed text-muted-foreground">
          {processing === 'complete'
            ? 'The product details were identified and saved. You can edit this upload via Upload History.'
            : 'Your photos were saved, but product identification is still pending review.'}
        </p>
        <Button onClick={onReset} size="xl" className="mb-3 w-full rounded-2xl">
          Take photos of another product
        </Button>
        <Button asChild variant="outline" size="xl" className="w-full rounded-2xl">
          <a href="/dashboard">Go back to dashboard</a>
        </Button>
        </div>
      </div>
    </CenteredFrame>
  )
}
