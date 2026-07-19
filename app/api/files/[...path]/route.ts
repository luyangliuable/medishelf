import { NextResponse } from 'next/server'
import { readUpload } from '@/lib/server/files'

type Ctx = { params: Promise<{ path: string[] }> }

const mime = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'heic') return 'image/heic'
  return 'image/jpeg'
}

export async function GET(_request: Request, context: Ctx) {
  const { path } = await context.params
  try {
    const filePath = path.join('/')
    const body = await readUpload(filePath)
    return new NextResponse(body, { headers: { 'content-type': mime(filePath) } })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
