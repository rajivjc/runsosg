'use client'

import { generateCertificatePdf, type CertificateData } from '@/lib/certificate'

interface CertificateButtonProps {
  data: CertificateData
  variant?: 'primary' | 'ghost' | 'overlay'
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v8m0 0L5 7m3 3 3-3" />
      <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
    </svg>
  )
}

export default function CertificateButton({ data, variant = 'primary' }: CertificateButtonProps) {
  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await generateCertificatePdf(data)
    } catch {
      // User cancelled the share sheet — this is fine, not an error
    }
  }

  if (variant === 'ghost') {
    return (
      <button
        onClick={handleClick}
        aria-label="Download certificate"
        className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-200 font-medium transition-colors min-h-[44px] px-2"
      >
        <DownloadIcon />
        Certificate
      </button>
    )
  }

  if (variant === 'overlay') {
    return (
      <button
        onClick={handleClick}
        aria-label="Download certificate"
        className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors min-h-[44px]"
      >
        <DownloadIcon />
        Print Certificate
      </button>
    )
  }

  // primary variant
  return (
    <button
      onClick={handleClick}
      aria-label="Download certificate"
      className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-sm font-semibold rounded-full px-6 py-3 transition-colors min-h-[44px]"
    >
      <DownloadIcon />
      Download Certificate
    </button>
  )
}
