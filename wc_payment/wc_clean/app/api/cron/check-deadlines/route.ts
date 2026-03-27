import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY!)

// This runs daily via Vercel Cron Jobs
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const twoWeeksFromNow = new Date(today)
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

  // Find all wishlists whose event_date is within 2 weeks
  const { data: wishlists } = await supabase
    .from('wishlists')
    .select('*')
    .lte('event_date', twoWeeksFromNow.toISOString().split('T')[0])
    .gte('event_date', today.toISOString().split('T')[0])

  if (!wishlists) return NextResponse.json({ processed: 0 })

  let refundCount = 0

  for (const wishlist of wishlists) {
    // Get all wishes for this wishlist
    const { data: wishes } = await supabase
      .from('wishes')
      .select('*')
      .eq('wishlist_id', wishlist.id)

    if (!wishes) continue

    for (const wish of wishes) {
      // Get contributions
      const { data: contribs } = await supabase
        .from('contributions')
        .select('*')
        .eq('wish_id', wish.id)
        .eq('status', 'confirmed')

      if (!contribs || contribs.length === 0) continue

      const collected = contribs.reduce((s, c) => s + c.amount, 0)
      const target = wish.target_price || 0
      const goalReached = collected >= target && target > 0

      // Check if deadline notification already sent
      const daysUntilBirthday = Math.ceil((new Date(wishlist.event_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (!goalReached) {
        // Send warning at 14 days, 7 days, 3 days
        if ([14, 7, 3].includes(daysUntilBirthday)) {
          // Notify all contributors
          for (const contrib of contribs) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', contrib.user_id)
              .single()

            if ((profile as any)?.email) {
              await resend.emails.send({
                from: 'WishCircle <noreply@wishcircle.app>',
                to: (profile as any).email,
                subject: `⏰ Noch ${daysUntilBirthday} Tage – "${wish.title}" braucht noch €${(target - collected).toFixed(2)}`,
                html: `
                  <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #faf7f2; padding: 32px; border-radius: 16px;">
                    <h1 style="color: #c0392b;">⏰ Nur noch ${daysUntilBirthday} Tage!</h1>
                    <p style="color: #5a4a3a;">Das Geschenk <strong>"${wish.title}"</strong> für <strong>${wishlist.title}</strong> ist noch nicht vollständig finanziert.</p>
                    
                    <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #f0e8d8;">
                      <p style="color: #5a4a3a;">Gesammelt: <strong style="color: #c9a84c;">€${collected.toFixed(2)}</strong> von €${target.toFixed(2)}</p>
                      <p style="color: #c0392b;">Noch fehlend: <strong>€${(target - collected).toFixed(2)}</strong></p>
                    </div>
                    
                    <p style="color: #5a4a3a;">Wenn das Ziel nicht bis ${new Date(new Date(wishlist.event_date).setDate(new Date(wishlist.event_date).getDate() - 14)).toLocaleDateString('de-DE')} erreicht wird, erhalten alle ihren Beitrag automatisch zurück.</p>
                    
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/list/${wishlist.slug}" style="display: inline-block; background: #c9a84c; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                      Jetzt beitragen →
                    </a>
                  </div>
                `
              })
            }
          }
        }

        // AUTO-REFUND: If birthday is today and goal not reached
        if (daysUntilBirthday === 14) {
          // Issue refunds for all contributions
          for (const contrib of contribs) {
            if (contrib.stripe_payment_id) {
              try {
                await stripe.refunds.create({
                  payment_intent: contrib.stripe_payment_id,
                  reason: 'requested_by_customer',
                })

                // Update contribution status
                await supabase
                  .from('contributions')
                  .update({ status: 'refunded' })
                  .eq('id', contrib.id)

                // Notify contributor
                const { data: profile } = await supabase
                  .from('profiles').select('*').eq('id', contrib.user_id).single()

                if ((profile as any)?.email) {
                  await resend.emails.send({
                    from: 'WishCircle <noreply@wishcircle.app>',
                    to: (profile as any).email,
                    subject: `💸 Rückerstattung: €${contrib.amount.toFixed(2)} für "${wish.title}"`,
                    html: `
                      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #faf7f2; padding: 32px; border-radius: 16px;">
                        <h1 style="color: #1a1410;">Rückerstattung veranlasst</h1>
                        <p style="color: #5a4a3a;">Das Ziel für <strong>"${wish.title}"</strong> wurde leider nicht erreicht. Dein Beitrag von <strong style="color: #c9a84c;">€${contrib.amount.toFixed(2)}</strong> wird automatisch erstattet.</p>
                        <p style="color: #9a8878; font-size: 14px;">Die Rückerstattung erscheint in 5-10 Werktagen auf deinem Konto.</p>
                        <p style="color: #5a4a3a; margin-top: 20px;">Schau dir die anderen Wünsche auf der Liste an – vielleicht findest du eine Alternative!</p>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/list/${wishlist.slug}" style="display: inline-block; background: #c9a84c; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 8px;">
                          Zur Wunschliste →
                        </a>
                      </div>
                    `
                  })
                }
                refundCount++
              } catch (err) {
                console.error('Refund failed:', err)
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ processed: wishlists.length, refunds: refundCount })
}
