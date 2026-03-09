'use client'

import Link from 'next/link'
import { useTheme } from '../app/theme-provider'

export function Navigation() {
  const { theme, setTheme } = useTheme()

  return (
    <nav className="sticky top-0 z-50 nav-blur border-b" style={{
      backgroundColor: 'var(--nav-bg)',
      borderColor: 'var(--border)',
    }}>
      <div className="max-w-main mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          <span className="text-lg font-bold tracking-tight">
            get<em className="italic font-bold text-[var(--text-dim)]">Hyped</em>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/skill.md"
            className="text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: 'var(--text-dim)' }}
          >
            SKILL.md
          </Link>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--accent-soft)',
              color: 'var(--text-dim)'
            }}
          >
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>
      </div>
    </nav>
  )
}