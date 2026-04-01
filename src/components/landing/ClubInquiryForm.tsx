'use client'

import { useState } from 'react'
import { submitClubInquiry } from '@/app/actions/club-inquiry'
import styles from '@/app/landing.module.css'

export default function ClubInquiryForm() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [formData, setFormData] = useState({
    clubName: '',
    contactName: '',
    email: '',
    programmeInfo: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    const result = await submitClubInquiry(formData)

    if (result.success) {
      setState('success')
    } else {
      setState('error')
      setErrorMsg(result.error ?? 'Something went wrong.')
    }
  }

  if (state === 'success') {
    return (
      <div className={styles.ctaCard}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h2 className={styles.ctaTitle}>We&apos;ll be in touch</h2>
        <p className={styles.ctaDesc}>
          Thanks for your interest in Kita. We&apos;ll reach out within a few days to help you get set up.
        </p>
        <p className={styles.ctaFallback}>
          Questions in the meantime?{' '}
          <a href="mailto:hello@kitarun.com" className={styles.ctaFallbackLink}>
            hello@kitarun.com
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.ctaCard}>
      <h2 className={styles.ctaTitle}>Ready to start your club?</h2>
      <p className={styles.ctaDesc}>
        Kita is free and built for clubs like yours. Tell us about your programme and we&apos;ll help you get set up.
      </p>

      <form onSubmit={handleSubmit} className={styles.inquiryForm} noValidate>
        <div className={styles.inquiryRow}>
          <div className={styles.inquiryField}>
            <label htmlFor="clubName" className={styles.inquiryLabel}>Club or programme name</label>
            <input
              id="clubName"
              type="text"
              required
              value={formData.clubName}
              onChange={(e) => setFormData(prev => ({ ...prev, clubName: e.target.value }))}
              placeholder="e.g. Sunbeam Running Club"
              className={styles.inquiryInput}
            />
          </div>
          <div className={styles.inquiryField}>
            <label htmlFor="contactName" className={styles.inquiryLabel}>Your name</label>
            <input
              id="contactName"
              type="text"
              required
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              className={styles.inquiryInput}
            />
          </div>
        </div>

        <div className={styles.inquiryField}>
          <label htmlFor="email" className={styles.inquiryLabel}>Email address</label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="you@example.com"
            className={styles.inquiryInput}
          />
        </div>

        <div className={styles.inquiryField}>
          <label htmlFor="programmeInfo" className={styles.inquiryLabel}>
            Tell us about your programme <span className={styles.inquiryOptional}>(optional)</span>
          </label>
          <textarea
            id="programmeInfo"
            value={formData.programmeInfo}
            onChange={(e) => setFormData(prev => ({ ...prev, programmeInfo: e.target.value }))}
            placeholder="What sport, how many athletes, where you're based..."
            rows={3}
            className={styles.inquiryTextarea}
          />
        </div>

        {state === 'error' && (
          <p className={styles.inquiryError} role="alert">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={state === 'loading'}
          className={styles.ctaPrimary}
          style={{ width: '100%', marginTop: '8px' }}
        >
          {state === 'loading' ? 'Sending...' : 'Get started →'}
        </button>
      </form>

      <p className={styles.ctaFallback}>
        Prefer email?{' '}
        <a href="mailto:hello@kitarun.com" className={styles.ctaFallbackLink}>
          hello@kitarun.com
        </a>
      </p>
    </div>
  )
}
