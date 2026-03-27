import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const { wishId, wishTitle, amount, contributorName, contributorEmail, wishlistSlug } = await req.json()

    if (!wishId || !amount || !contributorName) {
      return NextResponse.json({ error: 'Fehlende Pflichtfelder' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'payment',
      customer_email: contributorEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `🎁 Beitrag für: ${wishTitle}`,
            description: `Von: ${contributorName} · WishCircle Gruppengeschenk`,
          },
          unit_amount: Math.round(amount * 100), // Stripe erwartet Cent
        },
        quantity: 1,
      }],
      metadata: {
        wishId,
        wishTitle,
        contributorName,
        wishlistSlug,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/list/${wishlistSlug}?payment=success&wish=${wishId}&name=${encodeURIComponent(contributorName)}&amount=${amount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/list/${wishlistSlug}?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
