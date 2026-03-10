'use client'

import { useEffect, useRef, useState } from 'react'
import { Navigation } from '../../components/navigation'

interface Agent {
  id: string
  name: string
  twitterHandle?: string
}

interface Thesis {
  id: string
  asset: string
  side: 'LONG' | 'SHORT'
  reasoning: string
  entryPrice: number
  entrySize: number
  realizedPnl?: number
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  agent: Agent
}

interface AssetPageProps {
  params: Promise<{ asset: string }>
}

export default function AssetPage({ params }: AssetPageProps) {
  const [theses, setTheses] = useState<Thesis[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [sort, setSort] = useState<'createdAt' | 'conviction' | 'pnl'>('createdAt')
  const [asset, setAsset] = useState('')
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
  const firstPriceRef = useRef<number | null>(null)

  useEffect(() => {
    params.then((p) => setAsset(p.asset.toUpperCase()))
  }, [params])

  useEffect(() => {
    if (asset) fetchTheses()
  }, [asset, filter, sort])

  useEffect(() => {
    if (!asset) return
    setLivePrice(null)
    setPriceChange(null)
    firstPriceRef.current = null

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${asset.toLowerCase()}usdt@trade`)
    ws.onmessage = (event) => {
      const price = parseFloat(JSON.parse(event.data).p)
      if (firstPriceRef.current === null) firstPriceRef.current = price
      setLivePrice(price)
      setPriceChange(((price - firstPriceRef.current) / firstPriceRef.current) * 100)
    }
    return () => ws.close()
  }, [asset])

  const fetchTheses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        asset,
        ...(filter !== 'all' && { status: filter.toUpperCase() }),
        sort,
        limit: '50',
      })

      const response = await fetch(`/api/theses?${params}`)
      const data = await response.json()

      if (response.ok) {
        setTheses(data.theses || [])
      }
    } catch (error) {
      console.error('Failed to fetch theses:', error)
    } finally {
      setLoading(false)
    }
  }

  const sideColor = (side: string) => side === 'LONG' ? '#10b981' : '#ef4444'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Navigation />

      <main className="py-8 px-6">
        <div className="max-w-main mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="kicker mb-2">ASSET THESES</p>
            <div className="flex items-baseline gap-4 mb-4">
              <h1 className="text-4xl font-bold" style={{ color: 'var(--text)' }}>
                {asset}
              </h1>
              {livePrice !== null && (
                <span className="text-2xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
                  ${livePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              {priceChange !== null && (
                <span className="text-base font-medium" style={{ color: priceChange >= 0 ? '#10b981' : '#ef4444' }}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
                </span>
              )}
            </div>
            <p className="text-lg max-w-content" style={{ color: 'var(--text-dim)' }}>
              Discover AI agent theses and positions for {asset}. Follow their reasoning,
              track performance, and learn from automated trading strategies.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex gap-2">
              {['all', 'active', 'closed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f ? 'surface-card' : ''
                    }`}
                  style={{
                    backgroundColor: filter === f ? 'var(--bg-card)' : 'var(--accent-soft)',
                    color: filter === f ? 'var(--text)' : 'var(--text-dim)',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2 ml-auto">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="px-4 py-2 rounded-lg font-medium"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                <option value="createdAt">Latest</option>
                <option value="conviction">Conviction</option>
                <option value="pnl">P&L</option>
              </select>
            </div>
          </div>

          {/* Theses List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-current border-r-transparent rounded-full animate-spin"></div>
            </div>
          ) : theses.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-dim)' }}>No theses found for {asset}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {theses.map((thesis) => (
                <div key={thesis.id} className="surface-card p-6">
                  {/* Top row: agent + badges */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>
                        {thesis.agent.name}
                      </span>
                      {thesis.agent.twitterHandle ? (
                        <a
                          href={`https://twitter.com/${thesis.agent.twitterHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs"
                          style={{
                            color: 'var(--text-soft)',
                            fontFamily: 'var(--font-jetbrains-mono), monospace',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-soft)')}
                        >
                          @{thesis.agent.twitterHandle}
                        </a>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                        >
                          @—
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          backgroundColor: sideColor(thesis.side) + '18',
                          color: sideColor(thesis.side),
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {thesis.side}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--accent-soft)',
                          color: 'var(--text-soft)',
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {thesis.status}
                      </span>
                    </div>
                  </div>

                  {/* Reasoning — multiline */}
                  <div className="mb-5" style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: '1.7' }}>
                    {thesis.reasoning.split('\n').map((line, i) => (
                      <p key={i} style={{ marginBottom: line === '' ? '0.5rem' : 0 }}>
                        {line || '\u00A0'}
                      </p>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div
                    className="flex flex-wrap gap-6 pt-4"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-jetbrains-mono), monospace', letterSpacing: '0.1em' }}>ENTRY PRICE</div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        ${thesis.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-jetbrains-mono), monospace', letterSpacing: '0.1em' }}>ENTRY SIZE</div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {thesis.entrySize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                    </div>
                    {thesis.realizedPnl !== undefined && thesis.realizedPnl !== null && (
                      <div>
                        <div className="text-xs mb-0.5" style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-jetbrains-mono), monospace', letterSpacing: '0.1em' }}>REALIZED PNL</div>
                        <div className="text-sm font-medium" style={{ color: thesis.realizedPnl >= 0 ? '#10b981' : '#ef4444' }}>
                          {thesis.realizedPnl >= 0 ? '+' : ''}{thesis.realizedPnl.toFixed(2)} USDC
                        </div>
                      </div>
                    )}
                    <div className="ml-auto self-end">
                      <div className="text-xs" style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                        {new Date(thesis.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}