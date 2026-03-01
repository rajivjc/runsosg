/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for cross-browser photo download utilities.
 *
 * Validates:
 * 1. Platform detection (iOS, PWA standalone, Web Share API)
 * 2. Download strategy routing per platform
 * 3. DOM element creation for downloads (anchor, form)
 * 4. iOS PWA does NOT fall back to server download (would break standalone)
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  })
}

function setPlatform(platform: string) {
  Object.defineProperty(navigator, 'platform', {
    value: platform,
    configurable: true,
  })
}

function setMaxTouchPoints(n: number) {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: n,
    configurable: true,
  })
}

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockReturnValue({ matches }),
    configurable: true,
    writable: true,
  })
}

function setSafariStandalone(val: boolean | undefined) {
  Object.defineProperty(window.navigator, 'standalone', {
    value: val,
    configurable: true,
    writable: true,
  })
}

function setShareAPI(opts: {
  share?: jest.Mock | undefined
  canShare?: ((data: unknown) => boolean) | undefined
}) {
  Object.defineProperty(navigator, 'share', {
    value: opts.share,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(navigator, 'canShare', {
    value: opts.canShare,
    configurable: true,
    writable: true,
  })
}

// ── Import after helpers ───────────────────────────────────────────────────────

import {
  isIOSDevice,
  isPWAStandalone,
  canShareFiles,
  downloadViaServer,
  downloadZipViaForm,
  shareViaWebShare,
  savePhoto,
} from '@/lib/utils/download'

// ── Reset between tests ────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()

  // Reset to desktop Chrome defaults
  setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36')
  setPlatform('MacIntel')
  setMaxTouchPoints(0)
  setMatchMedia(false)
  setSafariStandalone(undefined)
  setShareAPI({ share: undefined, canShare: undefined })

  // Reset global fetch
  global.fetch = jest.fn()
})

// ── Platform detection ─────────────────────────────────────────────────────────

describe('isIOSDevice', () => {
  it('returns false for desktop Chrome', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0')
    setPlatform('MacIntel')
    setMaxTouchPoints(0)
    expect(isIOSDevice()).toBe(false)
  })

  it('returns true for iPhone', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    expect(isIOSDevice()).toBe(true)
  })

  it('returns true for iPad', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    expect(isIOSDevice()).toBe(true)
  })

  it('returns true for iPod', () => {
    setUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15')
    expect(isIOSDevice()).toBe(true)
  })

  it('returns true for iPadOS 13+ (reports as MacIntel with touch)', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15')
    setPlatform('MacIntel')
    setMaxTouchPoints(5)
    expect(isIOSDevice()).toBe(true)
  })

  it('returns false for Android', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile')
    setPlatform('Linux armv8l')
    setMaxTouchPoints(5)
    expect(isIOSDevice()).toBe(false)
  })
})

describe('isPWAStandalone', () => {
  it('returns false when not in standalone mode', () => {
    setMatchMedia(false)
    setSafariStandalone(undefined)
    expect(isPWAStandalone()).toBe(false)
  })

  it('returns true when display-mode: standalone matches', () => {
    setMatchMedia(true)
    expect(isPWAStandalone()).toBe(true)
  })

  it('returns true when Safari standalone flag is set', () => {
    setMatchMedia(false)
    setSafariStandalone(true)
    expect(isPWAStandalone()).toBe(true)
  })

  it('returns false when Safari standalone flag is explicitly false', () => {
    setMatchMedia(false)
    setSafariStandalone(false)
    expect(isPWAStandalone()).toBe(false)
  })
})

describe('canShareFiles', () => {
  it('returns false when navigator.share is undefined', () => {
    setShareAPI({ share: undefined, canShare: undefined })
    expect(canShareFiles()).toBe(false)
  })

  it('returns false when navigator.canShare is undefined', () => {
    setShareAPI({ share: jest.fn(), canShare: undefined })
    expect(canShareFiles()).toBe(false)
  })

  it('returns true when canShare accepts files', () => {
    setShareAPI({
      share: jest.fn(),
      canShare: () => true,
    })
    expect(canShareFiles()).toBe(true)
  })

  it('returns false when canShare rejects files', () => {
    setShareAPI({
      share: jest.fn(),
      canShare: () => false,
    })
    expect(canShareFiles()).toBe(false)
  })

  it('returns false when canShare throws', () => {
    setShareAPI({
      share: jest.fn(),
      canShare: () => { throw new TypeError('not supported') },
    })
    expect(canShareFiles()).toBe(false)
  })
})

// ── Download actions ───────────────────────────────────────────────────────────

describe('downloadViaServer', () => {
  it('creates an anchor pointing to the server endpoint and clicks it', () => {
    const clickSpy = jest.fn()
    const origCreate = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag === 'a') el.click = clickSpy
      return el
    })

    downloadViaServer('photo-123', 'Ali_Hassan_photo.jpg')

    const a = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement
    expect(a.getAttribute('download')).toBe('Ali_Hassan_photo.jpg')
    expect(a.href).toContain('/api/photos/download/photo-123')
    expect(a.href).toContain('name=Ali_Hassan_photo.jpg')
    expect(clickSpy).toHaveBeenCalled()
    // Anchor should have been removed from DOM after click
    expect(document.body.contains(a)).toBe(false)
  })

  it('URL-encodes special characters in filename', () => {
    const origCreate = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag === 'a') el.click = jest.fn()
      return el
    })

    downloadViaServer('id-1', 'Name With Spaces & (Parens).jpg')

    const a = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement
    expect(a.href).toContain(encodeURIComponent('Name With Spaces & (Parens).jpg'))
  })
})

describe('downloadZipViaForm', () => {
  it('creates a form with POST method and correct action', () => {
    const submitSpy = jest.fn()
    const mockInput = { type: '', name: '', value: '' }
    const mockForm = {
      method: '',
      action: '',
      style: {} as CSSStyleDeclaration,
      appendChild: jest.fn(),
      submit: submitSpy,
    }

    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'form') return mockForm as unknown as HTMLFormElement
      if (tag === 'input') return mockInput as unknown as HTMLInputElement
      return document.createElement(tag)
    })
    jest.spyOn(document.body, 'appendChild').mockImplementation((n) => n)
    jest.spyOn(document.body, 'removeChild').mockImplementation((n) => n)

    const ids = ['id-1', 'id-2', 'id-3']
    downloadZipViaForm(ids, 'Ali Hassan')

    expect(mockForm.method).toBe('POST')
    expect(mockForm.action).toBe('/api/photos/download')
    expect(mockInput.name).toBe('payload')
    expect(JSON.parse(mockInput.value)).toEqual({
      photoIds: ['id-1', 'id-2', 'id-3'],
      athleteName: 'Ali Hassan',
    })
    expect(mockForm.appendChild).toHaveBeenCalledWith(mockInput)
    expect(submitSpy).toHaveBeenCalled()
  })
})

// ── Web Share API ──────────────────────────────────────────────────────────────

describe('shareViaWebShare', () => {
  it('returns false when Web Share API is not available', async () => {
    setShareAPI({ share: undefined, canShare: undefined })
    const result = await shareViaWebShare('https://example.com/photo.jpg', 'photo.jpg')
    expect(result).toBe(false)
  })

  it('fetches the image and calls navigator.share with a File', async () => {
    const mockShare = jest.fn().mockResolvedValue(undefined)
    setShareAPI({
      share: mockShare,
      canShare: () => true,
    })

    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      blob: () => Promise.resolve(blob),
    })

    const result = await shareViaWebShare(
      'https://storage.example.com/signed-url',
      'athlete_photo.jpg',
      { title: 'Run photo', text: 'Great run!' }
    )

    expect(result).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith('https://storage.example.com/signed-url')
    expect(mockShare).toHaveBeenCalledTimes(1)

    const shareArg = mockShare.mock.calls[0][0]
    expect(shareArg.files).toHaveLength(1)
    expect(shareArg.files[0].name).toBe('athlete_photo.jpg')
    expect(shareArg.title).toBe('Run photo')
    expect(shareArg.text).toBe('Great run!')
  })

  it('returns false when user cancels the share sheet', async () => {
    const mockShare = jest.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    setShareAPI({
      share: mockShare,
      canShare: () => true,
    })

    const blob = new Blob(['data'], { type: 'image/jpeg' })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      blob: () => Promise.resolve(blob),
    })

    const result = await shareViaWebShare('https://example.com/photo.jpg', 'photo.jpg')
    expect(result).toBe(false)
  })

  it('returns false when fetch fails', async () => {
    setShareAPI({
      share: jest.fn(),
      canShare: () => true,
    })
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const result = await shareViaWebShare('https://example.com/photo.jpg', 'photo.jpg')
    expect(result).toBe(false)
  })
})

// ── Strategy routing ───────────────────────────────────────────────────────────

describe('savePhoto', () => {
  // Spy on the internal DOM operations to verify which strategy was chosen
  let anchorProps: { href: string; download: string }

  beforeEach(() => {
    anchorProps = { href: '', download: '' }
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          ...anchorProps,
          set href(v: string) { anchorProps.href = v },
          get href() { return anchorProps.href },
          set download(v: string) { anchorProps.download = v },
          get download() { return anchorProps.download },
          click: jest.fn(),
        } as unknown as HTMLAnchorElement
      }
      return { appendChild: jest.fn(), submit: jest.fn(), method: '', action: '', style: {} } as unknown as HTMLElement
    })
    jest.spyOn(document.body, 'appendChild').mockImplementation((n) => n)
    jest.spyOn(document.body, 'removeChild').mockImplementation((n) => n)
  })

  it('uses server download on desktop Chrome', async () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0')
    setPlatform('MacIntel')
    setMaxTouchPoints(0)
    setMatchMedia(false)
    setShareAPI({ share: undefined, canShare: undefined })

    await savePhoto('photo-1', 'https://example.com/signed', 'test.jpg')

    expect(anchorProps.href).toContain('/api/photos/download/photo-1')
    expect(anchorProps.download).toBe('test.jpg')
  })

  it('uses server download on Android (browser)', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile')
    setPlatform('Linux armv8l')
    setMaxTouchPoints(5)
    setMatchMedia(false)
    setShareAPI({ share: jest.fn(), canShare: () => true })

    await savePhoto('photo-1', 'https://example.com/signed', 'test.jpg')

    expect(anchorProps.href).toContain('/api/photos/download/photo-1')
  })

  it('uses server download on iOS Safari browser (non-PWA)', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    setMatchMedia(false) // NOT standalone
    setSafariStandalone(false)
    setShareAPI({ share: jest.fn(), canShare: () => true })

    await savePhoto('photo-1', 'https://example.com/signed', 'test.jpg')

    // Should use server download, not share API (not in PWA mode)
    expect(anchorProps.href).toContain('/api/photos/download/photo-1')
  })

  it('uses Web Share API on iOS PWA standalone', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    setMatchMedia(true) // standalone mode
    const mockShare = jest.fn().mockResolvedValue(undefined)
    setShareAPI({ share: mockShare, canShare: () => true })

    const blob = new Blob(['data'], { type: 'image/jpeg' })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      blob: () => Promise.resolve(blob),
    })

    await savePhoto('photo-1', 'https://example.com/signed', 'test.jpg', {
      title: 'Run photo',
    })

    // Should have used Web Share API
    expect(mockShare).toHaveBeenCalledTimes(1)
    // Should NOT have created an anchor (server download not triggered)
    expect(anchorProps.href).toBe('')
  })

  it('does NOT fall back to server download when share is cancelled on iOS PWA', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    setMatchMedia(true) // standalone mode
    const mockShare = jest.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    setShareAPI({ share: mockShare, canShare: () => true })

    const blob = new Blob(['data'], { type: 'image/jpeg' })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      blob: () => Promise.resolve(blob),
    })

    await savePhoto('photo-1', 'https://example.com/signed', 'test.jpg')

    // Share was attempted
    expect(mockShare).toHaveBeenCalledTimes(1)
    // Anchor should NOT have been created (no server fallback)
    expect(anchorProps.href).toBe('')
  })

  it('uses server download when Web Share is unavailable on iOS PWA', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    setMatchMedia(true) // standalone mode
    setShareAPI({ share: undefined, canShare: undefined }) // No Web Share API

    await savePhoto('photo-1', 'https://example.com/signed', 'test.jpg')

    // Falls back to server download since canShareFiles() is false
    expect(anchorProps.href).toContain('/api/photos/download/photo-1')
  })

  it('uses server download on desktop Firefox', async () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0')
    setPlatform('Linux x86_64')
    setMaxTouchPoints(0)
    setMatchMedia(false)
    setShareAPI({ share: undefined, canShare: undefined })

    await savePhoto('photo-1', 'https://example.com/signed', 'test.jpg')

    expect(anchorProps.href).toContain('/api/photos/download/photo-1')
  })
})
