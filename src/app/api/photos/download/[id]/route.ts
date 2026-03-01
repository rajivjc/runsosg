import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * GET /api/photos/download/[id]?name=filename.jpg
 *
 * Serves a single photo with Content-Disposition: attachment header
 * so that browsers (especially iOS Safari) download the file natively
 * instead of navigating away from the page.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const filename = _req.nextUrl.searchParams.get('name') || `photo_${id.slice(0, 8)}.jpg`

  // Fetch media record
  const { data: photo } = await adminClient
    .from('media')
    .select('id, url, storage_path')
    .eq('id', id)
    .single()

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  // Get download URL
  let downloadUrl = photo.url
  if (photo.storage_path) {
    const { data: signedData } = await adminClient.storage
      .from('athlete-media')
      .createSignedUrl(photo.storage_path, 300)

    if (signedData?.signedUrl) {
      downloadUrl = signedData.signedUrl
    }
  }

  if (!downloadUrl) {
    return NextResponse.json({ error: 'No URL available' }, { status: 404 })
  }

  // Fetch the image and proxy it with download headers
  const imageRes = await fetch(downloadUrl)
  if (!imageRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 502 })
  }

  const imageBuffer = await imageRes.arrayBuffer()
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg'

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(imageBuffer.byteLength),
      'Cache-Control': 'private, no-cache',
    },
  })
}
