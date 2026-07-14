'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import PhoneFrame from '@/components/PhoneFrame'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Photo } from '@/lib/types'

type Props = {
  photos: Photo[]
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>
  onClose: () => void
  onDone: () => void
  error: string
}

export default function UploadCamera({ photos, setPhotos, onClose, onDone, error }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setCameraError('Camera unavailable. Use photo fallback.'))
    return () => streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const addFile = (file: File) => setPhotos(prev => [...prev, { file, url: URL.createObjectURL(file) }])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return fileRef.current?.click()
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (blob) addFile(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
  }

  const last = photos[photos.length - 1]

  return (
    <PhoneFrame>
      <div className="relative min-h-svh bg-[#080b16] text-white after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(180deg,rgba(0,0,0,.45),transparent_30%,rgba(0,0,0,.5))]">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full bg-neutral-900 object-cover" />
        <canvas ref={canvasRef} hidden />
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="image/*"
          capture="environment"
          onChange={e => e.target.files?.[0] && addFile(e.target.files[0])}
        />
        <div className="absolute inset-x-4 top-6 z-10 flex justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-black/25 text-white hover:bg-black/40"
          >
            <X className="size-5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDone}
            className="rounded-full bg-white text-foreground hover:bg-white/90"
          >
            <Check className="size-4" /> Done
          </Button>
        </div>
        {cameraError && (
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-x-6 top-20 z-10 rounded-2xl bg-white/95 p-3 text-center font-extrabold text-foreground"
          >
            {cameraError}
          </button>
        )}
        {error && (
          <p className="absolute inset-x-6 top-20 z-10 rounded-2xl bg-white/95 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        {last && (
          <div className="absolute bottom-11 left-5 z-10 h-15 w-15">
            <Badge className="absolute -top-2 -right-2 z-20 h-5 min-w-5 justify-center bg-destructive px-1 text-[11px]">
              {photos.length}
            </Badge>
            <div className="absolute top-1.5 left-1.5 size-15 rotate-3 rounded-xl border-2 border-white/90 bg-[#e6eaf2]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={last.url} alt="Latest photo" className="absolute inset-0 size-15 rounded-xl border-2 border-white/90 object-cover" />
          </div>
        )}
        <button
          onClick={capture}
          aria-label="Take photo"
          className="absolute bottom-9 left-1/2 z-10 size-[74px] -translate-x-1/2 rounded-full border-[6px] border-white bg-white/30"
        />
      </div>
    </PhoneFrame>
  )
}
