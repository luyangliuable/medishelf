'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Logo from '@/components/Logo'
import CenteredFrame from '@/components/CenteredFrame'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'signin' | 'signup'
type Form = { name: string; email: string; phone: string; password: string }

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [form, setForm] = useState<Form>({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const update = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(form)
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error ?? 'Unable to create account')
      }
      const result = await signIn('credentials', {
        redirect: false,
        email: form.email,
        password: form.password
      })
      if (result?.error) throw new Error('Invalid email or password')
      router.replace('/dashboard')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CenteredFrame className="px-5 pt-8 pb-8">
      <div className="mx-auto mt-13 mb-6 flex justify-center md:mt-4">
        <Logo />
      </div>
      <h1 className="mb-7 text-center text-[25px] font-bold">Let&apos;s sign you in</h1>
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={update('name')} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Staff Email</Label>
              <Input id="email" type="email" value={form.email} onChange={update('email')} required />
            </div>
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={form.phone} onChange={update('phone')} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={update('password')} required />
            </div>
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="xl" className="mt-6 w-full" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Button
        type="button"
        variant="link"
        className="mt-4 w-full text-foreground font-extrabold"
        onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
      >
        {mode === 'signup' ? 'I already have an account' : 'Create an account'}
      </Button>
    </CenteredFrame>
  )
}
