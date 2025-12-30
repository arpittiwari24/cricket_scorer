import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if user exists in Supabase
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single()

          if (!existingUser) {
            // Create new user in Supabase
            await supabase.from('users').insert({
              email: user.email,
              name: user.name || 'Anonymous',
              avatar_url: user.image,
              google_id: account.providerAccountId,
            })

            // Initialize career stats for new user
            const { data: newUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', user.email)
              .single()

            if (newUser) {
              await supabase.from('career_stats').insert({
                user_id: newUser.id,
              })
            }
          } else {
            // Update existing user's info
            await supabase
              .from('users')
              .update({
                name: user.name || 'Anonymous',
                avatar_url: user.image,
                google_id: account.providerAccountId,
              })
              .eq('email', user.email)
          }
        } catch (error) {
          console.error('Error syncing user to Supabase:', error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Get user ID from Supabase
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single()

        if (user) {
          session.user.id = user.id
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
