import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { dirname, join, normalize, resolve } from 'path'

const root = resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'))

export function publicFileUrl(path: string) {
  return `/api/files/${path.split('/').map(encodeURIComponent).join('/')}`
}

export function resolveUploadPath(path: string) {
  const normalized = normalize(path).replace(/^([.][.][\/])+/, '')
  const target = resolve(root, normalized)
  if (!target.startsWith(root)) throw new Error('Invalid file path')
  return target
}

export async function saveUpload(path: string, file: File) {
  const target = resolveUploadPath(path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, Buffer.from(await file.arrayBuffer()))
}

export async function readUpload(path: string) {
  return readFile(resolveUploadPath(path))
}

export async function removeUploads(paths: string[]) {
  await Promise.all(paths.map(path => unlink(resolveUploadPath(path)).catch(() => undefined)))
}
