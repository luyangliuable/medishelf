import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createNotification } from '@/lib/database/notifications'
import { authOptions } from '@/lib/server/auth'
import { retrySubmissionAnalysis } from '@/lib/server/submissionAnalysis'

type Ctx = { params: Promise<{ id: string }> }

function parseSubmissionId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

async function notifyRetryResult(userId: string, submissionId: number, complete: boolean) {
  try {
    await createNotification(userId, complete
      ? {
          type: 'analysis_complete',
          title: 'Product details saved',
          message: 'Your product details were identified and saved.',
          submissionId
        }
      : {
          type: 'analysis_pending',
          title: 'Product review pending',
          message: 'Your photos were saved and await product review.',
          submissionId
        })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    console.error('Notification persistence failed:', errorName)
  }
}

export async function POST(_request: Request, context: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const id = parseSubmissionId((await context.params).id)
  if (!id) return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  try {
    const completed = await retrySubmissionAnalysis(id, session.user.id)
    if (!completed) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    await notifyRetryResult(session.user.id, id, true)
    return NextResponse.json({ processing: 'complete' })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Product image retry failed:', errorName, message)
    await notifyRetryResult(session.user.id, id, false)
    return NextResponse.json(
      { error: 'Product analysis could not be completed. Please try again.' },
      { status: 502 }
    )
  }
}
