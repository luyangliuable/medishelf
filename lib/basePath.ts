/**
 * Path prefix the app is served under, e.g. `/new` behind the medishelf.net router.
 * Empty when the app is served from the root. Set at build time via NEXT_PUBLIC_BASE_PATH.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/**
 * Prefixes an app-absolute path with the base path. Next.js already does this for
 * `<Link>`, `redirect()` and the router; use this for `fetch`, plain anchors,
 * `next/image` sources and next-auth URLs.
 */
export const withBasePath = (path: string) => `${BASE_PATH}${path}`
