'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#FAF7F2'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-3xl font-bold" style={{color:'#1A1410',textDecoration:'none'}}>
            Wish<span style={{color:'#C9A84C'}}>Circle</span>
          </Link>
          <p className="mt-2" style={{color:'#9A8878'}}>Willkommen zurück</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-bold mb-6" style={{color:'#1A1410'}}>Anmelden</h1>
          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{background:'#fef2f2',color:'#c0392b'}}>{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>E-Mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                className="input-base" placeholder="deine@email.de" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Passwort</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                className="input-base" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all"
              style={{background: loading ? '#E8D08A' : '#C9A84C'}}>
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
          <p className="text-center mt-4 text-sm" style={{color:'#9A8878'}}>
            Noch kein Konto?{' '}
            <Link href="/register" style={{color:'#C9A84C',fontWeight:500}}>Jetzt registrieren</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
