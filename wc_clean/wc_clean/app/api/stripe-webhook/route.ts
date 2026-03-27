import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// Service role client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession
    const { wishId, wishTitle, contributorName, wishlistSlug } = session.metadata!
    const amount = (session.amount_total || 0) / 100

    // 1. Beitrag in Datenbank speichern
    await supabaseAdmin.from('contributions').insert({
      wish_id: wishId,
      user_id: session.metadata?.userId || '00000000-0000-0000-0000-000000000000',
      display_name: contributorName,
      amount,
      stripe_payment_id: session.payment_intent as string,
      status: 'confirmed'
    })

    // 2. Gesamtbetrag berechnen
    const { data: wish } = await supabaseAdmin.from('wishes').select('*, wishlists(title, event_date)').eq('id', wishId).single()
    const { data: allContribs } = await supabaseAdmin.from('contributions').select('amount').eq('wish_id', wishId).eq('status', 'confirmed')
    const totalCollected = (allContribs || []).reduce((s: number, c: any) => s + c.amount, 0)
    const targetPrice = wish?.target_price || 0
    const remaining = Math.max(0, targetPrice - totalCollected)
    const isComplete = totalCollected >= targetPrice

    // 3. Alle E-Mails der Schenkenden holen
    const { data: contribs } = await supabaseAdmin
      .from('contributions')
      .select('display_name, stripe_payment_id')
      .eq('wish_id', wishId)
      .eq('status', 'confirmed')
      .neq('stripe_payment_id', session.payment_intent as string) // Alle außer dem aktuellen

    // 4. E-Mail an aktuellen Schenkenden (Bestätigung)
    if (session.customer_email) {
      await sendEmail({
        to: session.customer_email,
        subject: `✅ Dein Beitrag für "${wishTitle}" wurde bestätigt!`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
            <h2 style="color:#C9A84C">🎁 WishCircle – Bestätigung</h2>
            <p>Hallo <strong>${contributorName}</strong>,</p>
            <p>dein Beitrag von <strong>€${amount.toFixed(2)}</strong> für <strong>"${wishTitle}"</strong> wurde erfolgreich verarbeitet!</p>
            <div style="background:#f9f5ee;border-radius:8px;padding:16px;margin:16px 0">
              <p>📊 <strong>Aktueller Stand:</strong></p>
              <p>✅ Gesammelt: €${totalCollected.toFixed(2)} von €${targetPrice.toFixed(2)}</p>
              ${isComplete 
                ? '<p>🎉 <strong>Ziel erreicht! Die Gruppe wählt jetzt den Anführer.</strong></p>'
                : `<p>💰 Noch offen: €${remaining.toFixed(2)}</p>`}
            </div>
            ${isComplete ? '<p>Wir benachrichtigen dich sobald das Geschenk gekauft wurde! 🎉</p>' : '<p>Wir benachrichtigen dich wenn weitere Beiträge eingehen.</p>'}
            <p style="color:#9A8878;font-size:12px">WishCircle – Making wishes come true, together.</p>
          </div>
        `
      })
    }

    // 5. Update an alle anderen Schenkenden
    // (In echter Implementierung würden wir E-Mails aus der DB holen)
    // Für jetzt loggen wir es
    console.log(`Wish ${wishId}: ${totalCollected}/${targetPrice} collected. Complete: ${isComplete}`)
  }

  return NextResponse.json({ received: true })
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) return
  
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'WishCircle <noreply@wishcircle.app>',
      to, subject, html
    })
  })
}
