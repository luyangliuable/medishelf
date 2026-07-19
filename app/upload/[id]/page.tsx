'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import EditUpload from '@/components/EditUpload'
import CenteredFrame from '@/components/CenteredFrame'
import { getSubmission, type SubmissionImage } from '@/lib/submissions'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'

export default function EditUploadPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading } = useUser()
  const [images, setImages] = useState<SubmissionImage[] | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    getSubmission(supabase, user.id, params.id)
      .then(result => {
        if (!active) return
        if (!result) {
          toast.error('Submission not found')
          router.replace('/history')
          return
        }
        setImages(result.images)
        setReady(true)
      })
      .catch(() => {
        if (!active) return
        toast.error('Submission not found')
        router.replace('/history')
      })
    return () => { active = false }
  }, [loading, user, params.id, router])

  if (loading || !ready || !user || !images) return <CenteredFrame />

  return <EditUpload submissionId={params.id} initialImages={images} user={user} />
}
