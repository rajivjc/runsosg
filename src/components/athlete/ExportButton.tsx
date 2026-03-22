'use client'

import { useState, useEffect, useRef } from 'react'
import { Download } from 'lucide-react'
import { getExportData } from '@/lib/export'
import { formatSessionsAsCSV, triggerDownload } from '@/lib/csv'
import { generateProgressReport } from '@/lib/pdf-report'
import { guardIOSDownload } from '@/lib/utils/ios-download-fix'

export default function ExportButton({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'csv' | 'pdf' | false>(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleExport(type: 'csv' | 'pdf') {
    setLoading(type)
    try {
      const result = await getExportData(athleteId)
      if ('error' in result) {
        alert(result.error)
        return
      }
      if (type === 'csv') {
        const csv = formatSessionsAsCSV(result.data)
        const filename = result.athleteName
          .toLowerCase()
          .replace(/\s+/g, '-') + '-sessions.csv'
        guardIOSDownload()
        triggerDownload(csv, filename)
      } else {
        guardIOSDownload()
        generateProgressReport(result.data, result.athleteName)
      }
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-text-muted hover:text-teal-600 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/12 rounded-lg transition-all"
        style={{ minHeight: '44px' }}
        aria-label="Export data"
      >
        <Download size={16} />
        Export
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-lg shadow-lg z-20">
          <button
            onClick={() => handleExport('csv')}
            disabled={!!loading}
            className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-teal-50 dark:hover:bg-teal-900/12 hover:text-teal-700 dark:hover:text-teal-300 rounded-t-lg transition-colors"
            style={{ minHeight: '44px' }}
          >
            {loading === 'csv' ? 'Downloading...' : 'Download CSV'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!loading}
            className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-teal-50 dark:hover:bg-teal-900/12 hover:text-teal-700 dark:hover:text-teal-300 rounded-b-lg transition-colors"
            style={{ minHeight: '44px' }}
          >
            {loading === 'pdf' ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      )}
    </div>
  )
}
