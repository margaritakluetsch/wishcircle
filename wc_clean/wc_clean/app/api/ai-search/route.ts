import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { product, budget, deliveryDate } = await req.json()
    if (!product) return NextResponse.json({ error: 'Kein Produkt angegeben' }, { status: 400 })

    const prompt = `Du bist ein Einkaufsassistent. Suche nach dem besten Angebot für folgendes Produkt:

Produkt: "${product}"
Budget: ${budget ? `ca. €${budget}` : 'kein festes Budget'}
Lieferung benötigt bis: ${deliveryDate || 'so schnell wie möglich'}
Lieferland: Deutschland

Bitte suche im Web nach aktuellen Preisen und gib mir die 3 besten Optionen zurück.
Antworte NUR mit einem JSON-Array in diesem Format, ohne weitere Erklärungen:
[
  {
    "shop": "Shop-Name",
    "price": 99.99,
    "url": "https://...",
    "delivery": "2-3 Werktage",
    "rating": "4.5/5",
    "note": "Kurze Begründung warum dieser Shop gut ist"
  }
]

Sortiere nach bestem Preis-Leistungs-Verhältnis. Falls du keine echten Preise findest, gib bekannte deutsche Shops an wo man suchen sollte.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()

    // Extract text from response
    const textBlock = data.content?.find((b: any) => b.type === 'text')
    const raw = textBlock?.text || '[]'

    // Parse JSON from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    const results = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return NextResponse.json({ results })
  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json({ error: 'KI-Suche fehlgeschlagen' }, { status: 500 })
  }
}
