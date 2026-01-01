'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth'

export async function updateUserName(newName: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validate name
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: 'Name cannot be empty' }
  }

  if (newName.trim().length > 50) {
    return { success: false, error: 'Name cannot exceed 50 characters' }
  }

  const supabase = createClient()

  const { error } = await supabase
    .from('users')
    .update({
      name: newName.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', session.user.id)

  if (error) {
    console.error('Error updating user name:', error)
    return { success: false, error: 'Failed to update name' }
  }

  revalidatePath('/profile')
  return { success: true }
}
