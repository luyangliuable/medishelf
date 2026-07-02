'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { supabase, hasSupabaseConfig } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const router = useRouter()

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!hasSupabaseConfig) {
      setError('Supabase is not configured. Copy .env.local.example to .env.local.')
      return
    }
    const auth = mode === 'signup'
      ? await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name, staffEmail: form.email, phone: form.phone } }
        })
      : await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (auth.error) setError(auth.error.message)
    else router.replace('/dashboard')
  }

  return (
    <main className="phone page">
      <div className="login-logo"><Logo /></div>
      <h1 className="login-title">Let&apos;s sign you in</h1>
      <form onSubmit={submit}>
        {mode === 'signup' && <><label className="label">Name</label><input className="input" value={form.name} onChange={update('name')} required /></>}
        <label className="label">Staff Email</label>
        <input className="input" type="email" value={form.email} onChange={update('email')} required />
        {mode === 'signup' && <><label className="label">Phone Number</label><input className="input" value={form.phone} onChange={update('phone')} /></>}
        <label className="label">Password</label>
        <input className="input" type="password" value={form.password} onChange={update('password')} required />
        {error && <p className="error">{error}</p>}
        <button className="btn" style={{ marginTop: 22 }}>{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      </form>
      <button className="login-toggle" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        {mode === 'signup' ? 'I already have an account' : 'Create an account'}
      </button>
    </main>
  )
}
