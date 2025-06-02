import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // Delete all tweets (they'll be re-captured with proper encryption)
    const { error } = await supabaseAdmin
      .from('x_tweets')
      .delete()
      .neq('id', 0) // Delete all records

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to clear tweets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All tweets cleared. New replies will be captured with fixed encryption.'
    })

  } catch (error) {
    console.error('Error clearing tweets:', error)
    return NextResponse.json(
      { error: 'Failed to clear tweets' },
      { status: 500 }
    )
  }
} 