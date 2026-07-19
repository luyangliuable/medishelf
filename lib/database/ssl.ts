type DatabaseSsl = { ca?: string; rejectUnauthorized: boolean } | undefined

function stripSslMode(connectionString: string) {
  try {
    const url = new URL(connectionString)
    url.searchParams.delete('sslmode')
    return url.toString()
  } catch {
    return connectionString.replace(/[?&]sslmode=[^&]+/, '')
  }
}

export function databaseConnectionOptions(connectionString: string): { connectionString: string; ssl: DatabaseSsl } {
  if (!connectionString.includes('sslmode=require')) {
    return { connectionString, ssl: undefined }
  }

  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
  if (ca) {
    return { connectionString: stripSslMode(connectionString), ssl: { ca, rejectUnauthorized: true } }
  }

  return {
    connectionString: stripSslMode(connectionString),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' }
  }
}
