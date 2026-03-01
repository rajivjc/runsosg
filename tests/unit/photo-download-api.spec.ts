/**
 * Unit tests for photo download API endpoints.
 *
 * Validates:
 * 1. Single photo download — auth, lookup, Content-Disposition header
 * 2. ZIP download — JSON parsing, form-encoded parsing, error cases
 */

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockPhotoGetUser = jest.fn()
const mockPhotoFrom = jest.fn()
const mockPhotoStorage = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockPhotoGetUser() },
  }),
}))

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockPhotoFrom(...args),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => mockPhotoStorage(...args),
        createSignedUrls: (...args: unknown[]) => mockPhotoStorage(...args),
      }),
    },
  },
}))

// Mock archiver for ZIP tests — we don't need real ZIP creation
jest.mock('archiver', () => {
  return jest.fn().mockReturnValue({
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn(),
  })
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function chainable(data: unknown, error: unknown = null) {
  const obj: Record<string, unknown> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve({ data, error })
      }
      return () => new Proxy(obj, handler)
    },
  }
  return new Proxy(obj, handler)
}

function authed() {
  mockPhotoGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
}

function notAuthed() {
  mockPhotoGetUser.mockResolvedValue({ data: { user: null } })
}

// ── Reset ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  // Mock global fetch (used by route to proxy images)
  global.fetch = jest.fn()
})

// ── Single photo download endpoint ─────────────────────────────────────────

describe('GET /api/photos/download/[id]', () => {
  let handler: (
    req: { nextUrl: { searchParams: URLSearchParams } },
    ctx: { params: Promise<{ id: string }> }
  ) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('@/app/api/photos/download/[id]/route')
    handler = mod.GET as typeof handler
  })

  function makeRequest(photoId: string, name?: string) {
    const params = new URLSearchParams()
    if (name) params.set('name', name)
    return {
      req: { nextUrl: { searchParams: params } } as unknown as Parameters<typeof handler>[0],
      ctx: { params: Promise.resolve({ id: photoId }) },
    }
  }

  it('returns 401 when not authenticated', async () => {
    notAuthed()
    const { req, ctx } = makeRequest('photo-1')
    const res = await handler(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns 404 when photo does not exist', async () => {
    authed()
    mockPhotoFrom.mockReturnValue(chainable(null))

    const { req, ctx } = makeRequest('nonexistent')
    const res = await handler(req, ctx)
    expect(res.status).toBe(404)
  })

  it('returns photo with Content-Disposition: attachment header', async () => {
    authed()

    // Media record lookup
    mockPhotoFrom.mockReturnValue(
      chainable({ id: 'photo-1', url: 'https://cdn.example.com/photo.jpg', storage_path: null })
    )

    // Image fetch
    const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) // JPEG magic bytes
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: () => Promise.resolve(imageData.buffer),
    })

    mockPhotoStorage.mockResolvedValue({ data: null })

    const { req, ctx } = makeRequest('photo-1', 'Ali_Hassan_photo.jpg')
    const res = await handler(req, ctx)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="Ali_Hassan_photo.jpg"')
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Content-Length')).toBe(String(imageData.byteLength))
  })

  it('generates signed URL for storage-based photos', async () => {
    authed()

    mockPhotoFrom.mockReturnValue(
      chainable({
        id: 'photo-1',
        url: 'https://cdn.example.com/fallback.jpg',
        storage_path: 'uploads/photo-1.webp',
      })
    )

    mockPhotoStorage.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed-url?token=abc' },
    })

    const imageData = new Uint8Array([0x00])
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/webp' }),
      arrayBuffer: () => Promise.resolve(imageData.buffer),
    })

    const { req, ctx } = makeRequest('photo-1', 'photo.webp')
    const res = await handler(req, ctx)

    expect(res.status).toBe(200)
    // Should have fetched using the signed URL, not the fallback
    expect(global.fetch).toHaveBeenCalledWith('https://storage.example.com/signed-url?token=abc')
  })

  it('returns 502 when image fetch fails', async () => {
    authed()
    mockPhotoFrom.mockReturnValue(
      chainable({ id: 'photo-1', url: 'https://cdn.example.com/photo.jpg', storage_path: null })
    )
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403 })

    const { req, ctx } = makeRequest('photo-1')
    const res = await handler(req, ctx)
    expect(res.status).toBe(502)
  })

  it('uses default filename when name param is not provided', async () => {
    authed()
    mockPhotoFrom.mockReturnValue(
      chainable({ id: 'abcd1234-5678', url: 'https://cdn.example.com/photo.jpg', storage_path: null })
    )
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
    })

    const { req, ctx } = makeRequest('abcd1234-5678')
    const res = await handler(req, ctx)

    expect(res.headers.get('Content-Disposition')).toContain('photo_abcd1234')
  })
})

// ── ZIP download endpoint ──────────────────────────────────────────────────

describe('POST /api/photos/download (ZIP)', () => {
  let handler: (req: unknown) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('@/app/api/photos/download/route')
    handler = mod.POST as typeof handler
  })

  function makeJsonRequest(body: unknown) {
    return {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(body),
      formData: jest.fn(),
    }
  }

  function makeFormRequest(payload: string | null) {
    const formData = new Map()
    if (payload !== null) formData.set('payload', payload)
    return {
      headers: new Headers({ 'content-type': 'application/x-www-form-urlencoded' }),
      json: jest.fn(),
      formData: () => Promise.resolve({
        get: (key: string) => formData.get(key) ?? null,
      }),
    }
  }

  it('returns 401 when not authenticated', async () => {
    notAuthed()
    const req = makeJsonRequest({ photoIds: ['id-1'], athleteName: 'Test' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  it('parses JSON body correctly', async () => {
    authed()
    const req = makeJsonRequest({ photoIds: ['id-1'], athleteName: 'Ali Hassan' })

    // Return empty photos so endpoint returns 404 (simplest assertion path)
    mockPhotoFrom.mockReturnValue(chainable(null))

    const res = await handler(req)
    // If parsing succeeded, we get 404 (no photos found) not 400 (bad input)
    expect(res.status).toBe(404)
  })

  it('parses form-encoded payload correctly', async () => {
    authed()
    const req = makeFormRequest(JSON.stringify({ photoIds: ['id-1'], athleteName: 'Ali Hassan' }))

    mockPhotoFrom.mockReturnValue(chainable(null))

    const res = await handler(req)
    expect(res.status).toBe(404)
  })

  it('returns 400 when form payload is missing', async () => {
    authed()
    const req = makeFormRequest(null)

    const res = await handler(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing payload')
  })

  it('returns 400 when form payload contains invalid JSON', async () => {
    authed()
    const req = makeFormRequest('not valid json {{{')

    const res = await handler(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON payload')
  })

  it('returns 400 when form payload has wrong format', async () => {
    authed()
    const req = makeFormRequest(JSON.stringify({ photoIds: 'not-an-array', athleteName: 123 }))

    const res = await handler(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid payload format')
  })

  it('returns 400 when photoIds is empty', async () => {
    authed()
    const req = makeJsonRequest({ photoIds: [], athleteName: 'Test' })

    const res = await handler(req)
    expect(res.status).toBe(400)
  })
})
