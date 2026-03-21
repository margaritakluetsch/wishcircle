'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Wishlist } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [guestLists, setGuestLists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newPin, setNewPin] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadData(data.user.id)
    })
  }, [])

  const loadData = async (userId: string) => {
    const [{ data: myLists }, { data: guestData }] = await Promise.all([
      supabase.from('wishlists').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('wishlist_guests').select('*, wishlists(*)').eq('user_id', userId).eq('status', 'approved')
    ])
    setWishlists(myLists || [])
    setGuestLists(guestData || [])
    setLoading(false)
  }

  const createList = async () => {
    if (!newTitle || !newPin || newPin.length < 4) return
    setCreating(true)
    const slug = newTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
    const { error } = await supabase.from('wishlists').insert({
      owner_id: user.id,
      title: newTitle,
      event_date: newDate || null,
      slug,
      coordinator_pin: newPin,
    })
    if (!error) {
      setShowCreate(false); setNewTitle(''); setNewDate(''); setNewPin('')
      loadData(user.id)
    }
    setCreating(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#FAF7F2'}}>
      <div className="spinner w-8 h-8 border-2 rounded-full" style={{borderColor:'#E8D08A',borderTopColor:'#C9A84C'}} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#FAF7F2'}}>
      {/* NAV */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <Link href="/" className="font-serif text-2xl font-bold" style={{color:'#1A1410',textDecoration:'none'}}>
          Wish<span style={{color:'#C9A84C'}}>Circle</span>
        </Link>
        <div className="flex items-center gap-4">
          <span style={{color:'#9A8878',fontSize:14}}>{user?.email}</span>
          <button onClick={signOut} className="btn-outline text-sm px-3 py-1.5 rounded-lg" style={{border:'1.5px solid #F0E8D8',color:'#5A4A3A',background:'transparent',cursor:'pointer'}}>
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* MEINE LISTEN */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-serif text-2xl font-bold" style={{color:'#1A1410'}}>Meine Wunschlisten</h1>
          <button onClick={() => setShowCreate(true)} className="btn-gold px-4 py-2 rounded-xl text-sm font-semibold"
            style={{background:'#C9A84C',color:'white',border:'none',cursor:'pointer'}}>
            + Neue Liste
          </button>
        </div>

        {wishlists.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm mb-8">
            <div style={{fontSize:48,marginBottom:12}}>🎀</div>
            <p className="font-serif text-xl mb-2" style={{color:'#1A1410'}}>Noch keine Wunschliste</p>
            <p style={{color:'#9A8878',marginBottom:20}}>Erstelle deine erste Liste und teile sie mit deinen Gästen.</p>
            <button onClick={() => setShowCreate(true)} className="btn-gold px-6 py-3 rounded-xl font-semibold"
              style={{background:'#C9A84C',color:'white',border:'none',cursor:'pointer'}}>
              Erste Liste erstellen
            </button>
          </div>
        )}

        <div className="grid gap-4 mb-10">
          {wishlists.map(list => (
            <Link key={list.id} href={`/list/${list.slug}`} style={{textDecoration:'none'}}>
              <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-serif text-xl font-bold mb-1" style={{color:'#1A1410'}}>{list.title}</h2>
                    {list.event_date && <p style={{color:'#9A8878',fontSize:13}}>📅 {new Date(list.event_date).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}</p>}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full" style={{background:'#eafaf1',color:'#2e7d4f',fontWeight:600}}>
                    Aktiv
                  </span>
                </div>
                <p style={{color:'#C9A84C',fontSize:13,marginTop:8}}>wishcircle.app/list/{list.slug} →</p>
              </div>
            </Link>
          ))}
        </div>

        {/* GAST-LISTEN */}
        {guestLists.length > 0 && (
          <>
            <h2 className="font-serif text-xl font-bold mb-4" style={{color:'#1A1410'}}>Listen auf denen du eingeladen bist</h2>
            <div className="grid gap-4">
              {guestLists.map((g: any) => (
                <Link key={g.id} href={`/list/${g.wishlists?.slug}`} style={{textDecoration:'none'}}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="font-serif text-lg font-bold" style={{color:'#1A1410'}}>{g.wishlists?.title}</h3>
                    <p style={{color:'#C9A84C',fontSize:13,marginTop:4}}>Als Gast eingeladen →</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setShowCreate(false) }}>
          <div className="modal-box">
            <h2 className="font-serif text-xl font-bold mb-5" style={{color:'#1A1410'}}>✨ Neue Wunschliste</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Titel *</label>
                <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                  className="input-base" placeholder="z.B. Margaritas 50. Geburtstag" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Datum (optional)</label>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>🔐 Koordinator-PIN *</label>
                <input type="password" value={newPin} onChange={e=>setNewPin(e.target.value)}
                  className="input-base" placeholder="Min. 4 Zeichen – NUR an Vertrauenspersonen weitergeben!" />
                <p style={{fontSize:11,color:'#9A8878',marginTop:3}}>Diesen PIN gibst du NUR an Vertrauenspersonen weiter. Das Geburtstagskind kennt ihn nicht.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{background:'#F0E8D8',color:'#5A4A3A',border:'none',cursor:'pointer'}}>
                Abbrechen
              </button>
              <button onClick={createList} disabled={creating || !newTitle || newPin.length < 4}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{background: (!newTitle || newPin.length < 4) ? '#E8D08A' : '#C9A84C',border:'none',cursor:'pointer'}}>
                {creating ? 'Erstelle...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
