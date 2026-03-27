import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY!)

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
    const meta = session.metadata!

    // 1. Save contribution to database
    await supabase.from('contributions').insert({
      wish_id: meta.wishId,
      user_id: meta.userId,
      display_name: meta.contributorName,
      amount: session.amount_total! / 100,
      stripe_payment_id: session.payment_intent as string,
      status: 'confirmed',
    })

    // 2. Get updated wish + all contributions
    const { data: wish } = await supabase
      .from('wishes')
      .select('*, wishlists(title, event_date, slug, owner_id)')
      .eq('id', meta.wishId)
      .single()

    const { data: allContribs } = await supabase
      .from('contributions')
      .select('*, profiles(name)')
      .eq('wish_id', meta.wishId)
      .eq('status', 'confirmed')

    const collected = (allContribs || []).reduce((s: number, c: any) => s + c.amount, 0)
    const target = wish?.target_price || 0
    const remaining = Math.max(0, target - collected)
    const isGoalReached = collected >= target && target > 0
    const wishlist = (wish as any)?.wishlists
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // 3. Send confirmation email to contributor
    await resend.emails.send({
      from: 'WishCircle <noreply@wishcircle.app>',
      to: meta.contributorEmail,
      subject: `🎉 Dein Beitrag für "${meta.wishTitle}" ist bestätigt!`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #faf7f2; padding: 32px; border-radius: 16px;">
          <h1 style="color: #1a1410; font-size: 28px; margin-bottom: 8px;">Vielen Dank, ${meta.contributorName}! 🎁</h1>
          <p style="color: #5a4a3a; font-size: 16px; line-height: 1.6;">Dein Beitrag von <strong style="color: #c9a84c;">€${(session.amount_total! / 100).toFixed(2)}</strong> für <strong>${meta.wishTitle}</strong> wurde erfolgreich verarbeitet.</p>
          
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #f0e8d8;">
            <h3 style="color: #1a1410; margin: 0 0 12px;">📊 Aktueller Stand</h3>
            <p style="color: #5a4a3a; margin: 4px 0;">Gesammelt: <strong style="color: #c9a84c;">€${collected.toFixed(2)}</strong> von €${target.toFixed(2)}</p>
            ${isGoalReached 
              ? `<p style="color: #3d7a55; font-weight: bold; margin: 8px 0;">✅ Ziel erreicht! Die Abstimmung beginnt.</p>`
              : `<p style="color: #5a4a3a; margin: 4px 0;">Noch fehlend: <strong>€${remaining.toFixed(2)}</strong></p>`
            }
          </div>

          ${isGoalReached ? `
          <div style="background: #eafaf1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #2e7d4f; margin: 0 0 8px;">🎉 Ziel erreicht!</h3>
            <p style="color: #5a4a3a;">Jetzt stimmt die Gruppe ab, wer das Geschenk kauft. Schau in der App nach!</p>
          </div>
          ` : ''}

          <a href="${appUrl}/list/${wishlist?.slug}" style="display: inline-block; background: #c9a84c; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 8px;">
            Zur Wunschliste →
          </a>
          
          <p style="color: #9a8878; font-size: 12px; margin-top: 24px;">WishCircle · Making wishes come true, together.</p>
        </div>
      `
    })

    // 4. Notify all other contributors about the update
    if (allContribs && allContribs.length > 1) {
      const otherContribs = allContribs.filter((c: any) => c.display_name !== meta.contributorName)
      const uniqueEmails = [...new Set(otherContribs.map((c: any) => (c as any).profiles?.email).filter(Boolean))]
      
      for (const email of uniqueEmails) {
        await resend.emails.send({
          from: 'WishCircle <noreply@wishcircle.app>',
          to: email as string,
          subject: `💰 ${meta.contributorName} hat sich beteiligt – noch €${remaining.toFixed(2)} offen`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #faf7f2; padding: 32px; border-radius: 16px;">
              <h1 style="color: #1a1410; font-size: 24px;">Neuer Beitrag für "${meta.wishTitle}"!</h1>
              <p style="color: #5a4a3a;"><strong>${meta.contributorName}</strong> hat €${(session.amount_total!/100).toFixed(2)} beigetragen.</p>
              <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #f0e8d8;">
                <p style="color: #5a4a3a; margin: 4px 0;">Gesammelt: <strong style="color: #c9a84c;">€${collected.toFixed(2)}</strong> von €${target.toFixed(2)}</p>
                ${isGoalReached 
                  ? `<p style="color: #3d7a55; font-weight: bold;">✅ Ziel erreicht! Abstimmung beginnt.</p>`
                  : `<p style="color: #5a4a3a;">Noch fehlend: <strong>€${remaining.toFixed(2)}</strong></p>`
                }
              </div>
              <a href="${appUrl}/list/${wishlist?.slug}" style="display: inline-block; background: #c9a84c; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                Zur Wunschliste →
              </a>
            </div>
          `
        })
      }
    }

    // 5. If goal reached, notify everyone including owner
    if (isGoalReached) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', wishlist?.owner_id)
        .single()
      
      if ((ownerProfile as any)?.email) {
        await resend.emails.send({
          from: 'WishCircle <noreply@wishcircle.app>',
          to: (ownerProfile as any).email,
          subject: `🎉 "${meta.wishTitle}" ist vollständig finanziert!`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #faf7f2; padding: 32px; border-radius: 16px;">
              <h1 style="color: #c9a84c;">🎉 Dein Wunsch ist erfüllt!</h1>
              <p style="color: #5a4a3a;">Alle ${allContribs?.length} Schenkenden haben zusammen <strong>€${collected.toFixed(2)}</strong> für <strong>${meta.wishTitle}</strong> gesammelt!</p>
              <p style="color: #5a4a3a;">Die Gruppe stimmt jetzt ab, wer das Geschenk kauft. Sei gespannt! 🎁</p>
            </div>
          `
        })
      }
    }
  }

  // Handle refunds when deadline is missed
  if (event.type === 'payment_intent.canceled') {
    // Handled by the deadline cron job
  }

  return NextResponse.json({ received: true })
}
