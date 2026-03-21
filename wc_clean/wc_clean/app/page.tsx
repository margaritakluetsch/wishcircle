'use client'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{background:'#FAF7F2'}}>
      {/* NAV */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <div className="font-serif text-2xl font-bold" style={{color:'#1A1410'}}>
          Wish<span style={{color:'#C9A84C'}}>Circle</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-outline text-sm px-4 py-2 rounded-lg border" style={{border:'1.5px solid #F0E8D8',color:'#5A4A3A'}}>
            Anmelden
          </Link>
          <Link href="/register" className="btn-gold text-sm px-4 py-2 rounded-lg" style={{background:'#C9A84C',color:'white'}}>
            Kostenlos starten
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero-gradient relative text-center py-24 px-6 overflow-hidden">
        <div className="hero-glow absolute inset-0" />
        <div className="relative max-w-3xl mx-auto">
          <p className="font-serif italic mb-3" style={{color:'#E8D08A',fontSize:13,letterSpacing:3}}>
            DIE NEUE ART ZU SCHENKEN
          </p>
          <h1 className="font-serif text-white mb-4" style={{fontSize:'clamp(36px,6vw,64px)',fontWeight:700,lineHeight:1.1}}>
            Gemeinsam schenken.<br/>
            <span style={{color:'#C9A84C'}}>Wirklich überraschen.</span>
          </h1>
          <p className="mb-8 mx-auto" style={{color:'rgba(255,255,255,0.65)',fontSize:16,maxWidth:520,lineHeight:1.7}}>
            60 Gäste aus 8 Ländern, die sich nicht kennen – WishCircle macht es möglich, 
            gemeinsam bedeutungsvolle Geschenke zu finanzieren. Sicher, transparent, überraschend.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" style={{background:'#C9A84C',color:'white',padding:'14px 32px',borderRadius:12,fontWeight:600,fontSize:16,textDecoration:'none'}}>
              Wunschliste erstellen →
            </Link>
            <Link href="/demo" style={{background:'rgba(255,255,255,0.1)',color:'white',padding:'14px 32px',borderRadius:12,fontWeight:500,fontSize:16,textDecoration:'none',border:'1px solid rgba(255,255,255,0.2)'}}>
              Demo ansehen
            </Link>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-3" style={{color:'#1A1410'}}>So funktioniert WishCircle</h2>
          <p className="mb-12" style={{color:'#9A8878'}}>In 4 Schritten zum perfekten Gruppengeschenk</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { n:'1', icon:'🎁', title:'Liste erstellen', text:'Erstelle deine Wunschliste mit Produkten, Gutscheinen, Erlebnissen und lokalen Geschenken.' },
              { n:'2', icon:'👥', title:'Gäste einladen', text:'Teile den Link. Gäste melden sich an und du gibst sie frei. Koordinatoren erhalten den PIN.' },
              { n:'3', icon:'💰', title:'Gemeinsam finanzieren', text:'Jeder zahlt sicher per Kreditkarte, SEPA oder Apple Pay seinen Wunschbetrag.' },
              { n:'4', icon:'🎉', title:'Überraschung!', text:'Die Gruppe wählt den Anführer, er kauft das Geschenk. Du wirst überrascht!' },
            ].map(step => (
              <div key={step.n} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-white" style={{background:'#C9A84C',fontSize:18}}>
                  {step.n}
                </div>
                <div style={{fontSize:32,marginBottom:8}}>{step.icon}</div>
                <h3 className="font-semibold mb-2" style={{color:'#1A1410'}}>{step.title}</h3>
                <p style={{color:'#9A8878',fontSize:13,lineHeight:1.6}}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="py-20 px-6" style={{background:'#FAF7F2'}}>
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-center mb-12" style={{color:'#1A1410'}}>Alles was du brauchst</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon:'🔐', title:'Überraschungsschutz', text:'Das Geburtstagskind sieht keine Kauflinks, keine Beträge, keine Anführernamen.' },
              { icon:'💳', title:'Sichere Zahlung', text:'Stripe-Treuhandkonto: Geld wird erst freigegeben wenn der Anführer gewählt ist.' },
              { icon:'🗳️', title:'Demokratische Wahl', text:'Die Gruppe stimmt ab, wer das Geschenk kauft. Jeder Beitragende hat eine Stimme.' },
              { icon:'💬', title:'Gruppen-Chat', text:'Jedes Geschenk hat seinen eigenen Chat – nur für Beitragende sichtbar.' },
              { icon:'🎉', title:'Automatische Karte', text:'Eine digitale Glückwunschkarte mit allen Namen wird automatisch generiert.' },
              { icon:'🌍', title:'International', text:'Mehrsprachig, mehrere Währungen. Perfekt für Gäste aus aller Welt.' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <div style={{fontSize:32,marginBottom:12}}>{f.icon}</div>
                <h3 className="font-semibold mb-2" style={{color:'#1A1410',fontSize:16}}>{f.title}</h3>
                <p style={{color:'#9A8878',fontSize:13,lineHeight:1.6}}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="hero-gradient py-20 px-6 text-center relative overflow-hidden">
        <div className="hero-glow absolute inset-0" />
        <div className="relative">
          <h2 className="font-serif text-white text-3xl font-bold mb-4">Bereit loszulegen?</h2>
          <p className="mb-8" style={{color:'rgba(255,255,255,0.65)',fontSize:16}}>Kostenlos starten – keine Kreditkarte nötig</p>
          <Link href="/register" style={{background:'#C9A84C',color:'white',padding:'14px 32px',borderRadius:12,fontWeight:600,fontSize:16,textDecoration:'none'}}>
            Jetzt Wunschliste erstellen →
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{background:'#1A1410',color:'rgba(255,255,255,0.4)',fontSize:12}}>
        <p>© 2025 WishCircle · Making wishes come true, together.</p>
      </footer>
    </div>
  )
}
