'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { verifyAthletePin } from '@/app/my/[athleteId]/actions'

interface Props {
  athleteId: string
  athleteName: string
}

export default function PinEntry({ athleteId, athleteName }: Props) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  const handleDigitChange = useCallback((index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits(prev => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    setError(null)

    // Auto-focus next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [digits])

  const handleSubmit = useCallback(async () => {
    const pin = digits.join('')
    if (pin.length !== 4) {
      setError('Please enter all 4 numbers.')
      return
    }

    setLoading(true)
    const result = await verifyAthletePin(athleteId, pin)
    setLoading(false)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
      setDigits(['', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }, [athleteId, digits, router])

  // Submit when all 4 digits are entered
  const allFilled = digits.every(d => d !== '')

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* Athlete name */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {athleteName}&apos;s Running Journey
        </h1>
        <p className="text-base text-gray-600 mb-8">
          Enter your 4-number PIN to see your page.
        </p>

        {/* PIN input boxes */}
        <div className="flex justify-center gap-4 mb-6" role="group" aria-label="PIN entry">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]"
              maxLength={1}
              value={digit}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              aria-label={`PIN digit ${i + 1}`}
              className="w-16 h-16 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl
                         focus:outline-none focus:ring-3 focus:ring-teal-500 focus:border-teal-500
                         bg-white text-gray-900 transition-colors"
              disabled={loading}
            />
          ))}
        </div>

        {/* Error message */}
        <div aria-live="polite" className="min-h-[2rem] mb-4">
          {error && (
            <p className="text-base text-red-600 font-medium">{error}</p>
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!allFilled || loading}
          className="w-full h-14 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600
                     text-white text-lg font-semibold rounded-xl transition-colors"
        >
          {loading ? 'Checking…' : 'Open my page'}
        </button>

        <p className="text-sm text-gray-400 mt-6">
          Ask your coach if you need help with your PIN.
        </p>
      </div>
    </div>
  )
}
