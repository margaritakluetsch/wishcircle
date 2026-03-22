'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Wishlist, Wish, Contribution, Message, WishlistGuest } from '@/lib/supabase'

const CATEGORY_LABELS: Record<string, string> = {
  product:'🛍️ Produkt', event:'🎭 Veranstaltung', voucher:'🎫 Gutschein', local:'🏪 Lokales Geschenk', other:'🎁 Sonstiges'
}
const CATEGORY_CLASSES: Record<string, string> = {
  product:'tag-product', event:'tag-event', voucher:'tag-voucher', local:'tag-local', other:'tag-other'
}

export default function WishlistPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [wishes, setWishes] = useState<Wish[]>([])
  const [contributions, setContributions] = useState<Record<string, Contribution[]>>({})
  const [guestStatus, setGuestStatus] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isCoord, setIsCoord] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingGuests, setPendingGuests] = useState<WishlistGuest[]>([])
  const [activeWish, setActiveWish] = useState<Wish | null>(null)
  const [showContrib, setShowContrib] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showAddWish, setShowAddWish] = useState(false)
  const [showEditWish, setShowEditWish] = useState(false)
  const [showCoordLogin, setShowCoordLogin] = useState(false)
  const [showEditContrib, setShowEditContrib] = useState(false)
  const [editContrib, setEditContrib] = useState<Contribution | null>(null)
  const [contribName, setContribName] = useState('')
  const [contribAmt, setContribAmt] = useState('')
  const [coordPin, setCoordPin] = useState('')
  const [coordErr, setCoordErr] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [leaders, setLeaders] = useState<Record<string, string>>({})
  // Add wish
  const [wTitle, setWTitle] = useState('')
  const [wDesc, setWDesc] = useState('')
  const [wCat, setWCat] = useState('product')
  const [wPrice, setWPrice] = useState('')
  const [wUrl, setWUrl] = useState('')
  const [wSingle, setWSingle] = useState(false)
  // Edit wish
  const [ewId, setEwId] = useState('')
  const [ewTitle, setEwTitle] = useState('')
  const [ewDesc, setEwDesc] = useState('')
  const [ewCat, setEwCat] = useState('product')
  const [ewPrice, setEwPrice] = useState('')
  const [ewUrl, setEwUrl] = useState('')
  // Edit contrib
  const [ecName, setEcName] = useState('')
  const [ecAmt, setEcAmt] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user)
      loadPage(data.user)
    })
  }, [slug])

  const loadPage = async (currentUser: any) => {
    const { data: wl } = await supabase.from('wishlists').select('*').eq('slug', slug).single()
    if (!wl) { router.push('/'); return }
    setWishlist(wl)
    if (currentUser) {
      setIsOwner(wl.owner_id === currentUser.id)
      if (wl.owner_id !== currentUser.id) {
        const { data: guest } = await supabase.from('wishlist_guests')
          .select('*').eq('wishlist_id', wl.id).eq('user_id', currentUser.id).single()
        if (!guest) {
          await supabase.from('wishlist_guests').insert({ wishlist_id: wl.id, user_id: currentUser.id })
          setGuestStatus('pending')
        } else { setGuestStatus(guest.status) }
      }
    }
    const { data: ws } = await supabase.from('wishes').select('*').eq('wishlist_id', wl.id).order('created_at')
    setWishes(ws || [])
    if (ws) {
      const contribMap: Record<string, Contribution[]> = {}
      const voteMap: Record<string, string> = {}
      const leaderMap: Record<string, string> = {}
      for (const w of ws) {
        const { data: cs } = await supabase.from('contributions').select('*, profiles(name)').eq('wish_id', w.id).eq('status', 'confirmed')
        contribMap[w.id] = cs || []
        const { data: vs } = await supabase.from('votes').select('*').eq('wish_id', w.id)
        if (vs) {
          const count: Record<string, number> = {}
          vs.forEach(v => { count[v.candidate_id] = (count[v.candidate_id]||0)+1 })
          const top = Object.entries(count).sort((a,b)=>b[1]-a[1])[0]
          if (top) voteMap[w.id] = top[0]
        }
        const { data: ldr } = await supabase.from('wish_leaders').select('*, profiles(name)').eq('wish_id', w.id).single()
        if (ldr) leaderMap[w.id] = (ldr as any).profiles?.name || ''
      }
      setContributions(contribMap)
      setVotes(voteMap)
      setLeaders(leaderMap)
    }
    if (currentUser && wl.owner_id === currentUser.id) {
      const { data: pg } = await supabase.from('wishlist_guests').select('*, profiles(name,avatar_url)')
        .eq('wishlist_id', wl.id).eq('status', 'pending')
      setPendingGuests(pg || [])
    }
    setLoading(false)
  }

  const approveGuest = async (guestId: string, approved: boolean) => {
    await supabase.from('wishlist_guests').update({ status: approved ? 'approved' : 'rejected' }).eq('id', guestId)
    setPendingGuests(prev => prev.filter(g => g.id !== guestId))
  }

  const addWish = async () => {
    if (!wTitle) return
    await supabase.from('wishes').insert({
      wishlist_id: wishlist!.id, title: wTitle, description: wDesc,
      category: wCat, target_price: parseFloat(wPrice)||0,
      purchase_url: wUrl, is_single_buyer: wSingle
    })
    setShowAddWish(false); setWTitle(''); setWDesc(''); setWPrice(''); setWUrl('')
    loadPage(user)
  }

  const openEditWish = (w: Wish) => {
    setEwId(w.id); setEwTitle(w.title); setEwDesc(w.description||'')
    setEwCat(w.category); setEwPrice(w.target_price?.toString()||''); setEwUrl(w.purchase_url||'')
    setShowEditWish(true)
  }

  const saveEditWish = async () => {
    await supabase.from('wishes').update({
      title: ewTitle, description: ewDesc, category: ewCat,
      target_price: parseFloat(ewPrice)||0, purchase_url: ewUrl
    }).eq('id', ewId)
    setShowEditWish(false)
    loadPage(user)
  }

  const deleteWish = async (wishId: string) => {
    if (!confirm('Wunsch wirklich löschen?')) return
    await supabase.from('wishes').delete().eq('id', wishId)
    loadPage(user)
  }

  const submitContrib = async () => {
    if (!contribName || !contribAmt || !activeWish || !user) return
    await supabase.from('contributions').insert({
      wish_id: activeWish.id, user_id: user.id,
      display_name: contribName, amount: parseFloat(contribAmt), status: 'confirmed'
    })
    setShowContrib(false); setContribName(''); setContribAmt('')
    loadPage(user)
  }

  const openEditContrib = (c: Contribution) => {
    setEditContrib(c); setEcName(c.display_name); setEcAmt(c.amount.toString())
    setShowEditContrib(true)
  }

  const saveEditContrib = async () => {
    if (!editContrib) return
    await supabase.from('contributions').update({
      display_name: ecName, amount: parseFloat(ecAmt)
    }).eq('id', editContrib.id)
    setShowEditContrib(false); setEditContrib(null)
    loadPage(user)
  }

  const deleteContrib = async (contribId: string) => {
    if (!confirm('Beitrag wirklich löschen?')) return
    await supabase.from('contributions').delete().eq('id', contribId)
    loadPage(user)
  }

  const tryCoordLogin = () => {
    if (coordPin === (wishlist as any)?.coordinator_pin) {
      setIsCoord(true); setShowCoordLogin(false); setCoordErr('')
    } else setCoordErr('Falscher PIN.')
  }

  const loadChat = async (wish: Wish) => {
    setActiveWish(wish)
    const { data } = await supabase.from('messages').select('*, profiles(name)')
      .eq('wish_id', wish.id).order('created_at')
    setMessages(data || [])
    setShowChat(true)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    supabase.channel('chat-'+wish.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `wish_id=eq.${wish.id}` },
        payload => { setMessages(prev => [...prev, payload.new as Message]) })
      .subscribe()
  }

  const sendMsg = async () => {
    if (!newMsg.trim() || !activeWish || !user) return
    await supabase.from('messages').insert({ wish_id: activeWish.id, user_id: user.id, content: newMsg })
    setNewMsg('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const castVote = async (wishId: string, candidateId: string) => {
    if (!user) return
    await supabase.from('votes').insert({ wish_id: wishId, voter_id: user.id, candidate_id: candidateId })
    loadPage(user)
  }

  const setLeader = async (wish: Wish) => {
    const leaderId = votes[wish.id]
    if (!leaderId) return
    await supabase.from('wish_leaders').upsert({ wish_id: wish.id, leader_id: leaderId })
    const card = {
      gift: wish.title, price: wish.target_price,
      contributors: (contributions[wish.id]||[]).map(c=>c.display_name),
      date: new Date().toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})
    }
    await supabase.from('greeting_cards').upsert({ wish_id: wish.id, leader_id: leaderId, card_data: card })
    loadPage(user)
  }

  const shareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      alert('🎉 Link kopiert!\n\nSchicke diesen Link per WhatsApp, E-Mail oder SMS an deine Gäste:\n\n' + url)
    })
  }

  const collected = (wishId: string) => (contributions[wishId]||[]).reduce((s,c)=>s+c.amount,0)
  const pct = (w: Wish) => w.target_price > 0 ? Math.min(100, Math.round(collected(w.id)/w.target_price*100)) : 0
  const isFull = (w: Wish) => w.target_price > 0 && collected(w.id) >= w.target_price

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#FAF7F2'}}>
      <div className="spinner w-8 h-8 border-2 rounded-full" style={{borderColor:'#E8D08A',borderTopColor:'#C9A84C'}} />
    </div>
  )

  if (guestStatus === 'pending') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#FAF7F2'}}>
      <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-sm">
        <div style={{fontSize:48,marginBottom:12}}>⏳</div>
        <h2 className="font-serif text-2xl font-bold mb-3" style={{color:'#1A1410'}}>Freigabe ausstehend</h2>
        <p style={{color:'#9A8878',lineHeight:1.7}}>Deine Anfrage wurde gesendet. Du erhältst Zugang sobald du freigegeben wirst.</p>
      </div>
    </div>
  )

  if (guestStatus === 'rejected') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#FAF7F2'}}>
      <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-sm">
        <div style={{fontSize:48,marginBottom:12}}>❌</div>
        <h2 className="font-serif text-2xl font-bold mb-3" style={{color:'#1A1410'}}>Zugang verweigert</h2>
        <p style={{color:'#9A8878'}}>Du wurdest für diese Liste nicht freigegeben.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#FAF7F2'}}>
      {/* COORD BANNER */}
      {isCoord && (
        <div className="text-center py-2 text-sm font-medium" style={{background:'#fff8e1',color:'#b7770d',borderBottom:'2px solid #E8D08A'}}>
          🔐 Koordinator-Modus aktiv – Kauflinks sichtbar
          <button onClick={() => setIsCoord(false)} className="ml-3 text-xs px-2 py-0.5 rounded" style={{background:'rgba(0,0,0,0.1)',border:'none',cursor:'pointer'}}>Abmelden</button>
        </div>
      )}

      {/* TOP NAV */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
        <button onClick={() => router.push('/dashboard')}
          style={{background:'none',border:'none',cursor:'pointer',color:'#5A4A3A',fontSize:14,display:'flex',alignItems:'center',gap:6}}>
          ← Dashboard
        </button>
        <span className="font-serif font-bold" style={{color:'#1A1410',fontSize:16}}>
          Wish<span style={{color:'#C9A84C'}}>Circle</span>
        </span>
        <button onClick={shareLink}
          style={{background:'#C9A84C',color:'white',border:'none',borderRadius:8,padding:'6px 12px',fontSize:12,cursor:'pointer',fontWeight:600}}>
          🔗 Link teilen
        </button>
      </div>

      {/* HERO */}
      <div className="hero-gradient relative py-12 px-6 text-center overflow-hidden">
        <div className="hero-glow absolute inset-0" />
        <div className="relative">
          <p className="font-serif italic mb-2" style={{color:'#E8D08A',fontSize:13,letterSpacing:3}}>WUNSCHLISTE</p>
          <h1 className="font-serif text-white font-bold mb-2" style={{fontSize:'clamp(28px,5vw,48px)'}}>
            {wishlist?.title}
          </h1>
          {wishlist?.event_date && (
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>
              📅 {new Date(wishlist.event_date).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}
            </p>
          )}
          <div className="flex justify-center gap-6 mt-5">
            <div className="text-center">
              <div className="font-bold text-xl" style={{color:'#C9A84C'}}>{wishes.length}</div>
              <div style={{color:'rgba(255,255,255,0.5)',fontSize:11,letterSpacing:.5}}>WÜNSCHE</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-xl" style={{color:'#C9A84C'}}>
                {new Set(Object.values(contributions).flat().map(c=>c.display_name)).size}
              </div>
              <div style={{color:'rgba(255,255,255,0.5)',fontSize:11,letterSpacing:.5}}>SCHENKENDE</div>
            </div>
          </div>
        </div>
      </div>

      {/* OWNER ACTIONS */}
      {isOwner && (
        <div className="max-w-4xl mx-auto px-4 pt-4 flex gap-3 flex-wrap">
          <button onClick={() => setShowAddWish(true)} className="text-sm px-4 py-2 rounded-xl font-medium"
            style={{background:'#C9A84C',color:'white',border:'none',cursor:'pointer'}}>+ Wunsch hinzufügen</button>
          {pendingGuests.length > 0 && (
            <span className="text-sm px-4 py-2 rounded-xl font-medium"
              style={{background:'#fff8e1',color:'#b7770d'}}>
              ⏳ {pendingGuests.length} ausstehende Anfrage{pendingGuests.length > 1 ? 'n' : ''}
            </span>
          )}
        </div>
      )}

      {/* PENDING GUESTS */}
      {isOwner && pendingGuests.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold mb-3" style={{color:'#1A1410'}}>⏳ Ausstehende Gast-Anfragen</h3>
            {pendingGuests.map(g => (
              <div key={g.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{borderColor:'#F0E8D8'}}>
                <span style={{color:'#5A4A3A',fontSize:14}}>{(g as any).profiles?.name || 'Unbekannt'}</span>
                <div className="flex gap-2">
                  <button onClick={() => approveGuest(g.id, true)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{background:'#eafaf1',color:'#2e7d4f',border:'none',cursor:'pointer'}}>✓ Freigeben</button>
                  <button onClick={() => approveGuest(g.id, false)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{background:'#fef2f2',color:'#c0392b',border:'none',cursor:'pointer'}}>✗ Ablehnen</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COORD LOGIN STRIP */}
      {!isCoord && !isOwner && (
        <div className="text-center py-2 text-xs cursor-pointer" style={{background:'#1A1410',color:'rgba(255,255,255,0.4)'}}
          onClick={() => setShowCoordLogin(true)}>
          🔐 Koordinator-Bereich öffnen
        </div>
      )}

      {/* WISHES GRID */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {wishes.length === 0 && (
          <div className="text-center py-16" style={{color:'#9A8878'}}>
            <div style={{fontSize:48,marginBottom:12}}>🎀</div>
            <p>Noch keine Wünsche vorhanden.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {wishes.map(w => {
            const col = collected(w.id)
            const p = pct(w)
            const full = isFull(w)
            const leader = leaders[w.id]
            const contribs = contributions[w.id]||[]

            return (
              <div key={w.id} className="wish-card flex flex-col">
                <div className="p-4 pb-0 flex justify-between items-start">
                  <span className={`tag ${CATEGORY_CLASSES[w.category]}`}>{CATEGORY_LABELS[w.category]}</span>
                  {isOwner && (
                    <div className="flex gap-1">
                      <button onClick={() => openEditWish(w)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#C9A84C',fontSize:13}}>✏️</button>
                      <button onClick={() => deleteWish(w.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#9A8878',fontSize:13}}>✕</button>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="font-serif text-lg font-bold" style={{color:'#1A1410'}}>{w.title}</h3>
                    {w.description && <p style={{color:'#9A8878',fontSize:12,lineHeight:1.5,marginTop:3}}>{w.description}</p>}
                  </div>

                  {w.target_price > 0 && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-bold" style={{color:'#1A1410',fontSize:18}}>€{w.target_price.toFixed(2)}</span>
                        {!full
                          ? <span style={{color:'#9A8878',fontSize:12}}>Offen: <span style={{color:'#C9A84C',fontWeight:600}}>€{(w.target_price-col).toFixed(2)}</span></span>
                          : <span style={{color:'#3D7A55',fontWeight:600,fontSize:12}}>✅ Vollständig!</span>}
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width:`${p}%`}} />
                      </div>
                      <div className="flex justify-between mt-1" style={{fontSize:11,color:'#9A8878'}}>
                        <span>{p}%</span>
                        <span>€{col.toFixed(2)} / €{w.target_price.toFixed(2)} gesammelt</span>
                      </div>
                    </div>
                  )}

                  {/* CONTRIBUTORS with edit */}
                  {contribs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {contribs.map(c => (
                        <span key={c.id} className="chip" style={{cursor: c.user_id===user?.id ? 'pointer' : 'default',
                          background: leader && c.display_name===leader ? '#fff8e1' : '',
                          border: leader && c.display_name===leader ? '1px solid #E8D08A' : ''}}
                          onClick={() => c.user_id===user?.id && openEditContrib(c)}
                          title={c.user_id===user?.id ? 'Klicken zum Bearbeiten' : ''}>
                          {c.display_name === leader ? '👑 ' : '👤 '}{c.display_name}
                          <span style={{color:'#C9A84C',fontWeight:600}}> €{c.amount.toFixed(2)}</span>
                          {c.user_id===user?.id && <span style={{color:'#C9A84C',fontSize:10,marginLeft:2}}>✏️</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* VOTE SECTION */}
                  {full && contribs.length > 0 && !leader && (
                    <div style={{background:'#FAF7F2',borderRadius:9,padding:'10px 12px',border:'1px solid #F0E8D8'}}>
                      <p style={{fontSize:11,fontWeight:600,color:'#5A4A3A',letterSpacing:.5,marginBottom:8}}>🗳️ WER KAUFT DAS GESCHENK?</p>
                      {contribs.map(c => (
                        <div key={c.id} className="flex items-center justify-between py-1" style={{borderBottom:'1px solid #F0E8D8'}}>
                          <span style={{fontSize:12,color:'#1A1410'}}>{c.display_name}</span>
                          <button onClick={() => castVote(w.id, c.user_id)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{background:'#1A1410',color:'white',border:'none',cursor:'pointer'}}>
                            Stimmen
                          </button>
                        </div>
                      ))}
                      {isOwner && (
                        <button onClick={() => setLeader(w)} className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium"
                          style={{background:'#C9A84C',color:'white',border:'none',cursor:'pointer'}}>
                          🏆 Anführer jetzt festlegen
                        </button>
                      )}
                    </div>
                  )}

                  {leader && (
                    <div style={{background:'#eafaf1',borderRadius:9,padding:'8px 12px',fontSize:12,color:'#2e7d4f',fontWeight:600}}>
                      ✅ Vollständig gesammelt · Anführer: {leader}
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2 mt-auto">
                    {!full && user && (guestStatus === 'approved' || isOwner) && (
                      <button onClick={() => { setActiveWish(w); setContribAmt(((w.target_price||0)-col).toFixed(2)); setShowContrib(true) }}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{background:'#1A1410',color:'white',border:'none',cursor:'pointer'}}>
                        🎁 Beteiligen
                      </button>
                    )}
                    {user && (guestStatus === 'approved' || isOwner) && (
                      <button onClick={() => loadChat(w)}
                        className="py-2 px-3 rounded-xl text-sm"
                        style={{background:'#F0E8D8',color:'#5A4A3A',border:'none',cursor:'pointer'}}>
                        💬
                      </button>
                    )}
                    {(isCoord || isOwner) && w.purchase_url && (
                      <a href={w.purchase_url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-2 rounded-xl text-sm font-medium text-center"
                        style={{background:'#3D7A55',color:'white',textDecoration:'none'}}>
                        🛍️ Kauflink
                      </a>
                    )}
                    {!isCoord && !isOwner && w.purchase_url && (
                      <button onClick={() => setShowCoordLogin(true)}
                        className="flex-1 py-2 rounded-xl text-sm"
                        style={{background:'#F0E8D8',border:'1.5px dashed #E8D08A',color:'#9A8878',cursor:'pointer'}}>
                        🔒 Kauflink
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* CONTRIBUTE */}
      {showContrib && activeWish && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowContrib(false)}}>
          <div className="modal-box">
            <h2 className="font-serif text-xl font-bold mb-4" style={{color:'#1A1410'}}>💝 Beteiligen</h2>
            <div style={{background:'#F0E8D8',borderRadius:11,padding:14,marginBottom:16}}>
              <p className="font-semibold" style={{color:'#1A1410'}}>{activeWish.title}</p>
              <p style={{fontSize:12,color:'#5A4A3A',marginTop:4}}>
                Ziel: €{activeWish.target_price.toFixed(2)} · Gesammelt: €{collected(activeWish.id).toFixed(2)} ·
                Offen: <span style={{color:'#C9A84C',fontWeight:600}}>€{Math.max(0,activeWish.target_price-collected(activeWish.id)).toFixed(2)}</span>
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Dein Name *</label>
                <input type="text" value={contribName} onChange={e=>setContribName(e.target.value)}
                  className="input-base" placeholder="Wie soll dein Name erscheinen?" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Dein Beitrag (€) *</label>
                <input type="number" value={contribAmt} onChange={e=>setContribAmt(e.target.value)}
                  className="input-base" placeholder="0.00" min="0.01" step="0.01" />
              </div>
            </div>
            <div style={{background:'#fffbf0',borderLeft:'3px solid #C9A84C',padding:'10px 12px',borderRadius:'0 8px 8px 0',margin:'14px 0',fontSize:12,color:'#5A4A3A'}}>
              ✅ Bitte überweise den Betrag zuerst, dann hier bestätigen.
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setShowContrib(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{background:'#F0E8D8',color:'#5A4A3A',border:'none',cursor:'pointer'}}>Abbrechen</button>
              <button onClick={submitContrib} disabled={!contribName||!contribAmt} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{background:(!contribName||!contribAmt)?'#E8D08A':'#C9A84C',border:'none',cursor:'pointer'}}>
                ✓ Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CONTRIBUTION */}
      {showEditContrib && editContrib && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowEditContrib(false)}}>
          <div className="modal-box">
            <h2 className="font-serif text-xl font-bold mb-4" style={{color:'#1A1410'}}>✏️ Beitrag bearbeiten</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Dein Name</label>
                <input type="text" value={ecName} onChange={e=>setEcName(e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Betrag (€)</label>
                <input type="number" value={ecAmt} onChange={e=>setEcAmt(e.target.value)} className="input-base" step="0.01" min="0.01" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>deleteContrib(editContrib.id)} className="py-2.5 rounded-xl text-sm px-4"
                style={{background:'#fef2f2',color:'#c0392b',border:'none',cursor:'pointer'}}>🗑️ Löschen</button>
              <button onClick={()=>setShowEditContrib(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{background:'#F0E8D8',color:'#5A4A3A',border:'none',cursor:'pointer'}}>Abbrechen</button>
              <button onClick={saveEditContrib} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{background:'#C9A84C',border:'none',cursor:'pointer'}}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      {showChat && activeWish && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowChat(false)}}>
          <div className="modal-box flex flex-col" style={{height:'80vh',maxHeight:600}}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-xl font-bold" style={{color:'#1A1410'}}>💬 {activeWish.title}</h2>
              <button onClick={()=>setShowChat(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#9A8878',fontSize:20}}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.length === 0 && <p style={{color:'#9A8878',textAlign:'center',fontSize:13,marginTop:20}}>Noch keine Nachrichten.</p>}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div style={{maxWidth:'75%',padding:'8px 12px',borderRadius:12,fontSize:13,
                    background: m.user_id === user?.id ? '#C9A84C' : '#F0E8D8',
                    color: m.user_id === user?.id ? 'white' : '#1A1410'}}>
                    {m.user_id !== user?.id && <p style={{fontSize:10,fontWeight:600,marginBottom:2,opacity:.7}}>{(m as any).profiles?.name}</p>}
                    <p>{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <input type="text" value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')sendMsg()}}
                className="input-base flex-1" placeholder="Nachricht..." />
              <button onClick={sendMsg} style={{background:'#C9A84C',color:'white',border:'none',borderRadius:9,padding:'0 16px',cursor:'pointer'}}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD WISH */}
      {showAddWish && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowAddWish(false)}}>
          <div className="modal-box">
            <h2 className="font-serif text-xl font-bold mb-5" style={{color:'#1A1410'}}>✨ Neuer Wunsch</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Titel *</label>
                <input type="text" value={wTitle} onChange={e=>setWTitle(e.target.value)} className="input-base" placeholder="z.B. Kamera, Konzerttickets..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Beschreibung</label>
                <textarea value={wDesc} onChange={e=>setWDesc(e.target.value)} className="input-base" placeholder="Details..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Kategorie</label>
                  <select value={wCat} onChange={e=>setWCat(e.target.value)} className="input-base">
                    <option value="product">🛍️ Produkt</option>
                    <option value="event">🎭 Veranstaltung</option>
                    <option value="voucher">🎫 Gutschein</option>
                    <option value="local">🏪 Lokales Geschenk</option>
                    <option value="other">🎁 Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Zielpreis (€)</label>
                  <input type="number" value={wPrice} onChange={e=>setWPrice(e.target.value)} className="input-base" placeholder="0.00" step="0.01" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>🔒 Kauflink (nur für Koordinatoren)</label>
                <input type="url" value={wUrl} onChange={e=>setWUrl(e.target.value)} className="input-base" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowAddWish(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{background:'#F0E8D8',color:'#5A4A3A',border:'none',cursor:'pointer'}}>Abbrechen</button>
              <button onClick={addWish} disabled={!wTitle} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{background:!wTitle?'#E8D08A':'#C9A84C',border:'none',cursor:'pointer'}}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT WISH */}
      {showEditWish && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowEditWish(false)}}>
          <div className="modal-box">
            <h2 className="font-serif text-xl font-bold mb-5" style={{color:'#1A1410'}}>✏️ Wunsch bearbeiten</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Titel *</label>
                <input type="text" value={ewTitle} onChange={e=>setEwTitle(e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Beschreibung</label>
                <textarea value={ewDesc} onChange={e=>setEwDesc(e.target.value)} className="input-base" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Kategorie</label>
                  <select value={ewCat} onChange={e=>setEwCat(e.target.value)} className="input-base">
                    <option value="product">🛍️ Produkt</option>
                    <option value="event">🎭 Veranstaltung</option>
                    <option value="voucher">🎫 Gutschein</option>
                    <option value="local">🏪 Lokales Geschenk</option>
                    <option value="other">🎁 Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>Zielpreis (€)</label>
                  <input type="number" value={ewPrice} onChange={e=>setEwPrice(e.target.value)} className="input-base" step="0.01" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>🔒 Kauflink</label>
                <input type="url" value={ewUrl} onChange={e=>setEwUrl(e.target.value)} className="input-base" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowEditWish(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{background:'#F0E8D8',color:'#5A4A3A',border:'none',cursor:'pointer'}}>Abbrechen</button>
              <button onClick={saveEditWish} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{background:'#C9A84C',border:'none',cursor:'pointer'}}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* COORD LOGIN */}
      {showCoordLogin && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setShowCoordLogin(false);setCoordErr('')}}}>
          <div className="modal-box">
            <div style={{background:'linear-gradient(135deg,#1a1410,#2e1f14)',borderRadius:14,padding:20,textAlign:'center',marginBottom:16,color:'white'}}>
              <div style={{fontSize:36,marginBottom:8}}>🔐</div>
              <h3 className="font-serif text-lg font-bold mb-1">Koordinator-Zugang</h3>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.65)',lineHeight:1.5}}>Nur für Personen, die Geschenke kaufen.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'#5A4A3A'}}>PIN eingeben</label>
              <input type="password" value={coordPin} onChange={e=>setCoordPin(e.target.value)}
                className="input-base" placeholder="PIN..." onKeyDown={e=>{if(e.key==='Enter')tryCoordLogin()}} />
              {coordErr && <p style={{color:'#c0392b',fontSize:12,marginTop:4}}>{coordErr}</p>}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>{setShowCoordLogin(false);setCoordErr('')}} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{background:'#F0E8D8',color:'#5A4A3A',border:'none',cursor:'pointer'}}>Abbrechen</button>
              <button onClick={tryCoordLogin} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{background:'#3D7A55',border:'none',cursor:'pointer'}}>🔓 Einloggen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
