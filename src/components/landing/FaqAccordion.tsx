'use client'

import { useState, type ReactNode } from 'react'
import styles from '@/app/landing.module.css'

type FaqItem = {
  question: string
  answer: ReactNode
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className={styles.faqList}>
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const panelId = `faq-panel-${index}`
        const buttonId = `faq-button-${index}`
        return (
          <div key={item.question} className={styles.faqItem}>
            <button
              type="button"
              id={buttonId}
              className={styles.faqQuestionButton}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span className={styles.faqQuestion}>{item.question}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ''}`}
              >
                <polyline
                  points="6 9 12 15 18 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`${styles.faqPanel} ${isOpen ? styles.faqPanelOpen : ''}`}
            >
              <div className={styles.faqPanelInner}>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
