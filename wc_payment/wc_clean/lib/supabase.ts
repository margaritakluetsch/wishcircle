import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  name: string
  avatar_url?: string
  created_at: string
}

export type Wishlist = {
  id: string
  owner_id: string
  title: string
  event_date?: string
  slug: string
  coordinator_pin: string
  is_open: boolean
  created_at: string
  profiles?: Profile
}

export type Wish = {
  id: string
  wishlist_id: string
  title: string
  description?: string
  category: 'product' | 'event' | 'voucher' | 'local' | 'other'
  target_price: number
  purchase_url?: string
  image_url?: string
  is_single_buyer: boolean
  created_at: string
}

export type Contribution = {
  id: string
  wish_id: string
  user_id: string
  display_name: string
  amount: number
  stripe_payment_id?: string
  status: 'pending' | 'confirmed' | 'refunded'
  created_at: string
  profiles?: Profile
}

export type Vote = {
  id: string
  wish_id: string
  voter_id: string
  candidate_id: string
  created_at: string
}

export type Message = {
  id: string
  wish_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export type WishlistGuest = {
  id: string
  wishlist_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  joined_at: string
  profiles?: Profile
}

// Server-side client with service key (for API routes only)
export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}
