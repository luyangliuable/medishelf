'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import PhoneFrame from '@/components/PhoneFrame'
import { uploadSubmission } from '@/lib/submissions'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'

const UploadCloudIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V5"/><path d="m7 10 5-5 5 5"/><path d="M20 17a4 4 0 0 0-3-6.9A6 6 0 0 0 5 11a4 4 0 0 0-1 7.9"/></svg>
)

export default function UploadPage() {
  const { user, loading } = useUser()
  const [step, setStep] = useState('intro')
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const reset = () => { photos.forEach(p => URL.revokeObjectURL(p.url)); setPhotos([]); setError(''); setStep('intro') }
  const done = () => photos.length < 4 ? setError('Please take at least 4 photos.') : setStep('confirm')
  const upload = async () => {
    if (!supabase || !user?.id) {
      setError('Please sign in before uploading.')
      return
    }
    setBusy(true); setError('')
    try { await uploadSubmission(supabase, user.id, photos.map(p => p.file)); setStep('complete') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  if (loading) return <PhoneFrame />
  if (step === 'camera') return <Camera photos={photos} setPhotos={setPhotos} onClose={reset} onDone={done} error={error} />
  if (step === 'complete') return <Complete onReset={reset} />
  return <Intro setStep={setStep} error={error} confirming={step === 'confirm'} busy={busy} onUpload={upload} onCancel={() => setStep('camera')} onFinish={done} hasPhotos={photos.length > 0} />
}

function Intro({ setStep, error, confirming, busy, onUpload, onCancel, onFinish, hasPhotos }) {
  return <PhoneFrame><div className="page">
    <PageHeader title="Upload Photos" />
    <div className="upload-text">Submit a minimum of four photos of the product. Capture the front, sides and back to collect all the product details.</div>
    <div className="upload-note">The more photos the better.</div>
    <button className="upload-dashed" onClick={() => setStep('camera')}>
      <UploadCloudIcon />
      <strong>Tap to upload photos</strong>
      <span>PNG, JPEG, or HEIC</span>
    </button>
    {error && <p className="error">{error}</p>}
    <button className="upload-finish" disabled={!hasPhotos} onClick={onFinish}>Finish</button>
    {confirming && <Confirm busy={busy} onCancel={onCancel} onUpload={onUpload} />}
  </div></PhoneFrame>
}

function Camera({ photos, setPhotos, onClose, onDone, error }) {
  const videoRef = useRef(null), canvasRef = useRef(null), fileRef = useRef(null), streamRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream })
      .catch(() => setCameraError('Camera unavailable. Use photo fallback.'))
    return () => streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])
  const addFile = file => setPhotos(prev => [...prev, { file, url: URL.createObjectURL(file) }])
  const capture = () => {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return fileRef.current?.click()
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => addFile(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.9)
  }
  const last = photos[photos.length - 1]
  return <PhoneFrame><div className="camera-page">
    <video className="video" ref={videoRef} autoPlay playsInline muted />
    <canvas ref={canvasRef} hidden /><input ref={fileRef} hidden type="file" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && addFile(e.target.files[0])} />
    <div className="camera-top"><button onClick={onClose} aria-label="Close">X</button><button className="done-btn" onClick={onDone}>Done</button></div>
    {cameraError && <button className="camera-error" onClick={() => fileRef.current?.click()}>{cameraError}</button>}
    {error && <p className="camera-message">{error}</p>}
    {last && (
      <div className="photo-stack">
        <span className="badge">{photos.length}</span>
        <div className="card back" />
        <img className="card front" src={last.url} alt="Latest photo" />
      </div>
    )}
    <button className="capture" onClick={capture} aria-label="Take photo" />
  </div></PhoneFrame>
}

function Confirm({ busy, onCancel, onUpload }) {
  return <div className="modal-shade"><div className="modal">
    <h2>Finish uploading?</h2>
    <p>Please double check you have photos of all sides of the product before submitting.</p>
    <button className="ghost" onClick={onCancel}>Cancel</button>
    <button disabled={busy} onClick={onUpload}>{busy ? 'Uploading...' : 'Finish'}</button>
  </div></div>
}

function Complete({ onReset }) {
  return <PhoneFrame><div className="complete"><h1>Upload complete!</h1><p>Thanks for being a Medi Mate. You can edit this upload via the Upload History page.</p><button className="btn" onClick={onReset}>Take photos of another product</button><Link className="btn ghost" href="/dashboard">Go back to dashboard</Link></div></PhoneFrame>
}
