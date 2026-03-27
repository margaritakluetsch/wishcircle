import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { wishId, amount, contributorName, contributorEmail, userId } = await req.json()

    // Get wish details
    const { data: wish } = await supabase
      .from('wishes')
      .select('*, wishlists(title, event_date, slug)')
      .eq('id', wishId)
      .single()

    if (!wish) return NextResponse.json({ error: 'Wish not found' }, { status: 404 })

    const wishlist = (wish as any).wishlists

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `🎁 ${wish.title}`,
            description: `Beitrag zur Wunschliste: ${wishlist.title}`,
          },
          unit_amount: Math.round(amount * 100), // cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/list/${wishlist.slug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/list/${wishlist.slug}?payment=cancelled`,
      customer_email: contributorEmail,
      metadata: {
        wishId,
        userId,
        contributorName,
        contributorEmail,
        wishlistSlug: wishlist.slug,
        wishTitle: wish.title,
        wishlistTitle: wishlist.title,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
