import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createUploadPath } from '@/lib/filePaths'
import { createSubmission, listSubmissions } from '@/lib/database/submissions'
import { saveUpload } from '@/lib/server/files'
import { authOptions } from '@/lib/server/auth'

function unauthorized() {
  return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return unauthorized()
  return NextResponse.json({ submissions: await listSubmissions(session.user.id) })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return unauthorized()
  const files = (await request.formData()).getAll('files').filter((file): file is File => file instanceof File)
  if (!files.length) return NextResponse.json({ error: 'Please add photos' }, { status: 400 })
  const uploaded = await Promise.all(files.map(async file => {
    const path = createUploadPath(file)
    await saveUpload(path, file)
    return { path, size: file.size, mime: file.type }
  }))
  const data = await createSubmission(session.user.id, uploaded)
  return NextResponse.json({ data })
}
