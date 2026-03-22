import * as fs from 'fs'
import * as path from 'path'

describe('Dark mode', () => {
  const srcDir = path.join(process.cwd(), 'src')

  test('globals.css contains .dark override block', () => {
    const content = fs.readFileSync(path.join(srcDir, 'app', 'globals.css'), 'utf-8')
    expect(content).toContain('.dark {')
    expect(content).toContain('--color-bg: #141424')
    expect(content).toContain('--color-surface: #1E1E32')
    expect(content).toContain('--color-text-primary: #F0EDE8')
    expect(content).toContain('color-scheme: dark')
  })

  test('globals.css contains @custom-variant dark', () => {
    const content = fs.readFileSync(path.join(srcDir, 'app', 'globals.css'), 'utf-8')
    expect(content).toContain('@custom-variant dark')
  })

  test('ThemeProvider component exists', () => {
    const providerPath = path.join(srcDir, 'components', 'theme', 'ThemeProvider.tsx')
    expect(fs.existsSync(providerPath)).toBe(true)
    const content = fs.readFileSync(providerPath, 'utf-8')
    expect(content).toContain('ThemeContext')
    expect(content).toContain("'system'")
    expect(content).toContain("'light'")
    expect(content).toContain("'dark'")
    expect(content).toContain('localStorage')
    expect(content).toContain('prefers-color-scheme')
  })

  test('ThemeToggle component exists', () => {
    const togglePath = path.join(srcDir, 'components', 'theme', 'ThemeToggle.tsx')
    expect(fs.existsSync(togglePath)).toBe(true)
    const content = fs.readFileSync(togglePath, 'utf-8')
    expect(content).toContain('useTheme')
    expect(content).toContain('System')
    expect(content).toContain('Light')
    expect(content).toContain('Dark')
  })

  test('layout.tsx includes anti-flash script', () => {
    const content = fs.readFileSync(path.join(srcDir, 'app', 'layout.tsx'), 'utf-8')
    expect(content).toContain('localStorage')
    expect(content).toContain('prefers-color-scheme')
    expect(content).toContain("classList.add('dark')")
  })

  test('layout.tsx wraps content in ThemeProvider', () => {
    const content = fs.readFileSync(path.join(srcDir, 'app', 'layout.tsx'), 'utf-8')
    expect(content).toContain('ThemeProvider')
  })

  test('account page includes ThemeToggle', () => {
    const content = fs.readFileSync(path.join(srcDir, 'app', 'account', 'page.tsx'), 'utf-8')
    expect(content).toContain('ThemeToggle')
    expect(content).toContain('Appearance')
  })
})
