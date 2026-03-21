'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    })
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
          <p className="mt-2" style={{color:'#9A8878'}}>Kostenlos starten</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-bold mb-6" style={{color:'#1A1410'}}>Konto erstellen</h1>
          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{background:'#fef2f2',color:'#c0392b'}}>{error}</div>}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Dein Name</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)}
                className="input-base" placeholder="Margarita" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>E-Mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                className="input-base" placeholder="deine@email.de" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Passwort</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                className="input-base" placeholder="Mindestens 6 Zeichen" minLength={6} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{background: loading ? '#E8D08A' : '#C9A84C'}}>
              {loading ? 'Wird erstellt...' : 'Konto erstellen'}
            </button>
          </form>
          <p className="text-center mt-4 text-sm" style={{color:'#9A8878'}}>
            Bereits registriert?{' '}
            <Link href="/login" style={{color:'#C9A84C',fontWeight:500}}>Anmelden</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
