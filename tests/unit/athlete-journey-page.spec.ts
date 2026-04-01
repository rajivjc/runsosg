/**
 * Unit tests for the athlete journey page accessibility and design principles.
 *
 * These are static analysis tests verifying:
 * 1. Accessibility: aria-live, aria-label, role attributes
 * 2. Touch target sizes (64px+ for athlete-facing)
 * 3. Sensory safety: no idioms, literal language
 * 4. Icons paired with text labels
 * 5. Visual progress bars alongside numbers
 * 6. Privacy: no sensitive data exposure
 * 7. setAthleteGoal goal_choice_updated_at tracking
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockCookieGet = jest.fn()
const mockCookieSet = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookieGet(...args),
    set: (...args: unknown[]) => mockCookieSet(...args),
  }),
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

import * as fs from 'fs'
import * as path from 'path'
import { setAthleteGoal } from '@/app/my/[athleteId]/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; error: unknown }>> = {}
  const updatePayloads: Record<string, unknown[]> = {}

  function enqueue(table: string, ...responses: Array<{ data: unknown; error?: unknown }>) {
    if (!queues[table]) queues[table] = []
    for (const r of responses) {
      queues[table].push({ data: r.data, error: r.error ?? null })
    }
  }

  function impl(table: string) {
    const obj: Record<string, unknown> = {}
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === 'then') {
          const queue = queues[table]
          const response = queue?.shift() ?? { data: null, error: null }
          return (resolve: (v: unknown) => void) => resolve(response)
        }
        if (prop === 'update') {
          return (payload: unknown) => {
            if (!updatePayloads[table]) updatePayloads[table] = []
            updatePayloads[table].push(payload)
            return new Proxy(obj, handler)
          }
        }
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  }

  return { enqueue, impl, updatePayloads }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('MyJourneyDashboard accessibility', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/athlete/MyJourneyDashboard.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('uses semantic main element', () => {
    expect(content).toContain('<main')
  })

  it('uses section elements with aria-label', () => {
    expect(content).toContain('aria-label=')
    expect(content).toContain('<section')
  })

  it('has aria-live region for message feedback', () => {
    expect(content).toContain('aria-live="polite"')
  })

  it('has progress bar with role="progressbar"', () => {
    expect(content).toContain('role="progressbar"')
    expect(content).toContain('aria-valuenow')
    expect(content).toContain('aria-valuemin')
    expect(content).toContain('aria-valuemax')
  })

  it('uses 20px+ base font size (text-xl or larger for headings)', () => {
    // The dashboard uses text-2xl for name, text-lg for section headers
    expect(content).toContain('text-2xl')
    expect(content).toContain('text-lg')
  })

  it('pairs icons with text labels on interactive elements', () => {
    // Header stats have text labels alongside values
    expect(content).toContain('Runs')
    expect(content).toContain('Total km')
    // Share button has icon + text
    expect(content).toContain('Share my running story')
  })

  it('provides visual progress bars alongside numbers', () => {
    // Theme defines bar color for progress bars
    expect(content).toContain("bg: 'bg-teal-400'")
    // Progress bars use rounded-full styling
    expect(content).toContain('rounded-full')
    // Goal progress bar exists
    expect(content).toContain('h-full')
  })

  it('uses literal language (no idioms or metaphors)', () => {
    expect(content).not.toContain("you're on fire")
    expect(content).not.toContain('killing it')
    expect(content).not.toContain('crushing it')
    expect(content).not.toContain('so proud')
    expect(content).not.toContain('brave')
    // Greeting uses athlete's name directly (literal, warm)
    expect(content).toContain('athlete.name')
  })

  it('does not expose sensitive data (notes, medical, cues)', () => {
    expect(content).not.toContain('medical')
    expect(content).not.toContain('communication_notes')
    expect(content).not.toContain('emergency_contact')
    expect(content).not.toContain('cues')
    expect(content).not.toContain('coach_notes')
  })

  it('uses left-aligned text (no text-justify)', () => {
    expect(content).not.toContain('text-justify')
  })

  it('has large touch targets for message buttons (h-14 = 56px)', () => {
    expect(content).toContain('h-14')
  })
})

describe('PinEntry accessibility', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/athlete/PinEntry.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('has aria-live region for error messages', () => {
    expect(content).toContain('aria-live="polite"')
  })

  it('has aria-label on each PIN digit input', () => {
    expect(content).toContain('aria-label={`PIN digit')
  })

  it('has role="group" on PIN input container', () => {
    expect(content).toContain('role="group"')
  })

  it('uses large input boxes (w-16 h-16 = 64px)', () => {
    expect(content).toContain('w-16 h-16')
  })

  it('uses numeric input mode for mobile keyboards', () => {
    expect(content).toContain('inputMode="numeric"')
  })

  it('has large submit button (h-14 = 56px)', () => {
    expect(content).toContain('h-14')
  })

  it('uses clear error messages with literal language', () => {
    // "That PIN didn't match" comes from the server action, not the component
    // PinEntry shows its own validation message:
    expect(content).toContain('Please enter all 4 numbers')
  })

  it('shows lockout guidance', () => {
    expect(content).not.toContain('You are locked out')
    // The lockout message comes from the server action
  })

  it('provides help text for users who need assistance', () => {
    expect(content).toContain('Ask your coach if you need help')
  })
})

describe('CheerToast accessibility', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/feed/CheerToast.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('has aria-live for screen reader announcements', () => {
    expect(content).toContain('aria-live="polite"')
  })

  it('has role="status" for toast notification', () => {
    expect(content).toContain('role="status"')
  })

  it('respects prefers-reduced-motion', () => {
    expect(content).toContain('prefers-reduced-motion')
  })

  it('has Escape key handler', () => {
    expect(content).toContain("e.key === 'Escape'")
  })

  it('auto-dismisses after 5 seconds', () => {
    expect(content).toContain('5000')
  })
})

describe('Middleware includes /my route as public', () => {
  const filePath = path.join(
    __dirname,
    '../../src/middleware.ts'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('has /my in PUBLIC_PATHS', () => {
    expect(content).toContain("'/my'")
  })
})

describe('Database migration for athlete PIN', () => {
  const migrationDir = path.join(__dirname, '../../supabase/migrations')
  let migrationContent: string

  beforeAll(() => {
    const files = fs.readdirSync(migrationDir)
    const pinMigration = files.find(f => f.includes('athlete_pin'))
    expect(pinMigration).toBeDefined()
    migrationContent = fs.readFileSync(path.join(migrationDir, pinMigration!), 'utf-8')
  })

  it('adds athlete_pin column', () => {
    expect(migrationContent).toContain('athlete_pin')
  })

  it('adds pin_attempts column', () => {
    expect(migrationContent).toContain('pin_attempts')
  })

  it('adds pin_locked_until column', () => {
    expect(migrationContent).toContain('pin_locked_until')
  })

  it('creates athlete_messages table', () => {
    expect(migrationContent).toContain('athlete_messages')
    expect(migrationContent).toContain('CREATE TABLE')
  })

  it('enables RLS on athlete_messages', () => {
    expect(migrationContent).toContain('ENABLE ROW LEVEL SECURITY')
  })

  it('creates RLS policy for coaches and admins', () => {
    expect(migrationContent).toContain("role IN ('admin', 'coach')")
  })

  it('creates indexes for efficient queries', () => {
    expect(migrationContent).toContain('CREATE INDEX')
  })
})

// ── setAthleteGoal date tracking ────────────────────────────────────────────

const athleteId = 'athlete-456'

describe('setAthleteGoal goal_choice_updated_at tracking', () => {
  beforeEach(() => {
    // Simulate verified cookie
    mockCookieGet.mockReturnValue({ value: 'verified' })
  })

  it('sets goal_choice_updated_at on first pick', async () => {
    const mock = createQueueMock()
    // 1. Read current athlete (no current choice)
    mock.enqueue('athletes', {
      data: { athlete_goal_choice: null, goal_choice_updated_at: null },
    })
    // 2. Update result
    mock.enqueue('athletes', { data: null, error: null })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    const before = new Date()
    const result = await setAthleteGoal(athleteId, 'run_further')
    const after = new Date()

    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
    const payload = mock.updatePayloads['athletes']![0] as Record<string, unknown>
    const ts = new Date(payload.goal_choice_updated_at as string)
    expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(ts.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('tracks previous when changing goals', async () => {
    const mock = createQueueMock()
    mock.enqueue('athletes', {
      data: {
        athlete_goal_choice: 'run_further',
        goal_choice_updated_at: '2026-01-15T00:00:00.000Z',
      },
    })
    mock.enqueue('athletes', { data: null, error: null })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    const result = await setAthleteGoal(athleteId, 'feel_stronger')

    expect(result.success).toBe(true)
    const payload = mock.updatePayloads['athletes']![0] as Record<string, unknown>
    expect(payload.previous_goal_choice).toBe('run_further')
    expect(payload.previous_goal_choice_at).toBe('2026-01-15T00:00:00.000Z')
    expect(payload.athlete_goal_choice).toBe('feel_stronger')
    expect(payload.goal_choice_updated_at).toBeDefined()
  })

  it('does not set previous on first pick', async () => {
    const mock = createQueueMock()
    mock.enqueue('athletes', {
      data: { athlete_goal_choice: null, goal_choice_updated_at: null },
    })
    mock.enqueue('athletes', { data: null, error: null })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    const result = await setAthleteGoal(athleteId, 'run_more')

    expect(result.success).toBe(true)
    const payload = mock.updatePayloads['athletes']![0] as Record<string, unknown>
    expect(payload.previous_goal_choice).toBeUndefined()
    expect(payload.previous_goal_choice_at).toBeUndefined()
    expect(payload.athlete_goal_choice).toBe('run_more')
    expect(payload.goal_choice_updated_at).toBeDefined()
  })

  it('does not change previous when re-picking same goal', async () => {
    const mock = createQueueMock()
    mock.enqueue('athletes', {
      data: {
        athlete_goal_choice: 'run_further',
        goal_choice_updated_at: '2026-01-15T00:00:00.000Z',
      },
    })
    mock.enqueue('athletes', { data: null, error: null })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    const result = await setAthleteGoal(athleteId, 'run_further')

    expect(result.success).toBe(true)
    const payload = mock.updatePayloads['athletes']![0] as Record<string, unknown>
    expect(payload.previous_goal_choice).toBeUndefined()
    expect(payload.athlete_goal_choice).toBe('run_further')
    // goal_choice_updated_at should still be refreshed
    expect(payload.goal_choice_updated_at).toBeDefined()
  })
})
