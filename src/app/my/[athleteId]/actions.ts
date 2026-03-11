'use server'

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { adminClient } from '@/lib/supabase/admin'

const PIN_COOKIE_PREFIX = 'athlete_session_'
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const SESSION_HOURS = 24

const ALLOWED_MESSAGES = [
  'Thank you!',
  'That was fun!',
  'I want to run more!',
  'See you next week!',
]
const MAX_MESSAGES_PER_DAY = 5

// ─── PIN Verification ───────────────────────────────────────────

export async function verifyAthletePin(
  athleteId: string,
  pin: string
): Promise<{ success?: boolean; error?: string; attemptsRemaining?: number }> {
  // Fetch athlete
  const { data: athlete, error: fetchError } = await adminClient
    .from('athletes')
    .select('athlete_pin, pin_attempts, pin_locked_until')
    .eq('id', athleteId)
    .single()

  if (fetchError || !athlete) {
    return { error: 'Could not find this page. Please check the link.' }
  }

  if (!athlete.athlete_pin) {
    return { error: 'Access has not been set up yet. Ask your coach for help.' }
  }

  // Check lockout
  if (athlete.pin_locked_until) {
    const lockUntil = new Date(athlete.pin_locked_until)
    if (lockUntil > new Date()) {
      return { error: 'Too many tries. Please wait 15 minutes and try again.' }
    }
    // Lockout expired, reset attempts
    await adminClient
      .from('athletes')
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq('id', athleteId)
  }

  // Verify PIN
  const match = await bcrypt.compare(pin, athlete.athlete_pin)

  if (!match) {
    const newAttempts = (athlete.pin_attempts ?? 0) + 1
    const updates: { pin_attempts: number; pin_locked_until?: string } = {
      pin_attempts: newAttempts,
    }

    if (newAttempts >= MAX_ATTEMPTS) {
      updates.pin_locked_until = new Date(
        Date.now() + LOCKOUT_MINUTES * 60 * 1000
      ).toISOString()
    }

    await adminClient
      .from('athletes')
      .update(updates)
      .eq('id', athleteId)

    const remaining = MAX_ATTEMPTS - newAttempts
    if (remaining <= 0) {
      return { error: 'Too many tries. Please wait 15 minutes and try again.' }
    }
    return {
      error: `That PIN didn't match. You have ${remaining} ${remaining === 1 ? 'try' : 'tries'} left.`,
      attemptsRemaining: remaining,
    }
  }

  // Success: reset attempts and set cookie
  await adminClient
    .from('athletes')
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq('id', athleteId)

  const cookieStore = await cookies()
  cookieStore.set(`${PIN_COOKIE_PREFIX}${athleteId}`, 'verified', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_HOURS * 60 * 60,
    path: `/my/${athleteId}`,
  })

  return { success: true }
}

// ─── PIN Setup (coach action) ───────────────────────────────────

export async function setAthletePin(
  athleteId: string,
  pin: string
): Promise<{ error?: string; success?: boolean }> {
  if (!/^\d{4}$/.test(pin)) {
    return { error: 'PIN must be exactly 4 digits.' }
  }

  const hash = await bcrypt.hash(pin, 10)

  const { error } = await adminClient
    .from('athletes')
    .update({
      athlete_pin: hash,
      pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq('id', athleteId)

  if (error) {
    return { error: 'Could not save PIN. Please try again.' }
  }

  return { success: true }
}

// ─── Athlete Messages ───────────────────────────────────────────

export async function sendAthleteMessage(
  athleteId: string,
  message: string
): Promise<{ error?: string; success?: boolean }> {
  // Validate against preset messages
  if (!ALLOWED_MESSAGES.includes(message)) {
    return { error: 'Please choose one of the message options.' }
  }

  // Rate limit: max messages per day
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await adminClient
    .from('athlete_messages')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', athleteId)
    .gte('created_at', dayAgo)

  if ((count ?? 0) >= MAX_MESSAGES_PER_DAY) {
    return { error: 'You have sent enough messages for today. Try again tomorrow!' }
  }

  const { error } = await adminClient
    .from('athlete_messages')
    .insert({ athlete_id: athleteId, message })

  if (error) {
    return { error: 'Could not send message. Please try again.' }
  }

  return { success: true }
}

// ─── Cookie Verification ────────────────────────────────────────

export async function verifyAthleteCookie(athleteId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(`${PIN_COOKIE_PREFIX}${athleteId}`)
  return cookie?.value === 'verified'
}
