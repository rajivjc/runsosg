import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import archiver from 'archiver'
import { PassThrough } from 'stream'

export const runtime = 'nodejs'
export const maxDuration = 60 // allow up to 60s for large downloads

/**
 * POST /api/photos/download
 * Body: JSON { photoIds: string[], athleteName: string }
 *   or: form-encoded with a `payload` field containing the same JSON
 *
 * Streams a ZIP file containing the requested photos.
 * Auth-gated: user must be logged in.
 *
 * The form-encoded variant exists so the browser can submit a native <form>
 * and handle the Content-Disposition: attachment response natively — this
 * avoids the blob-URL approach that breaks on iOS Safari.
 */
export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body — supports both JSON and form-encoded payloads
  let photoIds: string[]
  let athleteName: string

  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await req.json()
    photoIds = body.photoIds
    athleteName = body.athleteName
  } else {
    // Form submission: JSON is packed into a hidden `payload` field
    const formData = await req.formData()
    const raw = formData.get('payload')
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }
    let parsed: { photoIds?: unknown; athleteName?: unknown }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    if (!Array.isArray(parsed.photoIds) || typeof parsed.athleteName !== 'string') {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 })
    }
    photoIds = parsed.photoIds
    athleteName = parsed.athleteName
  }

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'No photos specified' }, { status: 400 })
  }

  // Cap at 50 photos per ZIP to prevent abuse
  const ids = photoIds.slice(0, 50)

  // Fetch media records
  const { data: photos } = await adminClient
    .from('media')
    .select('id, url, storage_path, created_at, caption')
    .in('id', ids)

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'No photos found' }, { status: 404 })
  }

  // Generate signed URLs for storage-based photos
  const storagePaths = photos
    .filter(p => p.storage_path)
    .map(p => p.storage_path as string)

  let signedUrlMap: Record<string, string> = {}
  if (storagePaths.length > 0) {
    const { data: signedData } = await adminClient.storage
      .from('athlete-media')
      .createSignedUrls(storagePaths, 300) // 5min expiry for download

    if (signedData) {
      for (let i = 0; i < signedData.length; i++) {
        if (signedData[i]?.signedUrl) {
          signedUrlMap[storagePaths[i]] = signedData[i].signedUrl
        }
      }
    }
  }

  // Create ZIP archive
  const archive = archiver('zip', { zlib: { level: 1 } }) // fast compression
  const passthrough = new PassThrough()

  archive.pipe(passthrough)

  // Add each photo to the archive
  const safeName = athleteName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_')

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const url = photo.storage_path
      ? signedUrlMap[photo.storage_path] || photo.url
      : photo.url

    if (!url) continue

    try {
      const res = await fetch(url)
      if (!res.ok) continue

      const buffer = Buffer.from(await res.arrayBuffer())
      const dateStr = photo.created_at
        ? new Date(photo.created_at).toISOString().split('T')[0]
        : 'unknown'
      const ext = photo.storage_path?.split('.').pop() || 'jpg'
      const filename = `${safeName}_${dateStr}_${photo.id.slice(0, 8)}.${ext}`

      archive.append(buffer, { name: filename })
    } catch {
      // Skip failed photo downloads
    }
  }

  archive.finalize()

  // Convert Node stream to Web ReadableStream
  const readable = new ReadableStream({
    start(controller) {
      passthrough.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      passthrough.on('end', () => controller.close())
      passthrough.on('error', (err) => controller.error(err))
    },
  })

  const zipFilename = `${safeName}_photos_${new Date().toISOString().split('T')[0]}.zip`

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipFilename}"`,
    },
  })
}
