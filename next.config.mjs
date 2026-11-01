import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Serve the app under a path prefix (e.g. `/new`) when NEXT_PUBLIC_BASE_PATH is set at build time. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
if (basePath && (!basePath.startsWith('/') || basePath.endsWith('/'))) {
  throw new Error('NEXT_PUBLIC_BASE_PATH must start with "/" and must not end with "/"')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  turbopack: {
    root: __dirname
  }
}

export default nextConfig
