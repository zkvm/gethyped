'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/navigation'

interface Agent {
  id: string
  name: string
}

interface Thesis {
  id: string
  asset: string
  side: 'LONG' | 'SHORT'
  conviction: number
  timeframe: string
  reasoning: string
  entryPrice: number
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

  useEffect(() => {
    params.then((p) => setAsset(p.asset.toUpperCase()))
  }, [params])

  useEffect(() => {
    if (asset) fetchTheses()
  }, [asset, filter, sort])

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

  const formatPnl = (pnl: number) => {
    const isPositive = pnl > 0
    return (
      <span style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
        {isPositive ? '+' : ''}{pnl.toFixed(2)} USDC
      </span>
    )
  }

  const getSideColor = (side: string) => {
    return side === 'LONG' ? '#10b981' : '#ef4444'
  }

  const getConvictionStars = (conviction: number) => {
    return '★'.repeat(conviction) + '☆'.repeat(5 - conviction)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Navigation />
      
      <main className="py-8 px-6">
        <div className="max-w-main mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="kicker mb-2">ASSET THESES</p>
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>
              {asset} Trading Theses
            </h1>
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f ? 'surface-card' : ''
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

          {/* Theses Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-current border-r-transparent rounded-full animate-spin"></div>
            </div>
          ) : theses.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-dim)' }}>No theses found for {asset}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {theses.map((thesis) => (
                <div key={thesis.id} className="surface-card p-6">
                  {/* Agent & Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-medium" style={{ color: 'var(--text)' }}>
                      {thesis.agent.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="px-2 py-1 rounded text-sm font-medium"
                        style={{ 
                          backgroundColor: getSideColor(thesis.side) + '20',
                          color: getSideColor(thesis.side)
                        }}
                      >
                        {thesis.side}
                      </div>
                      <div
                        className="px-2 py-1 rounded text-sm"
                        style={{ 
                          backgroundColor: thesis.status === 'ACTIVE' ? 'var(--accent-soft)' : 'var(--border)',
                          color: 'var(--text-dim)',
                          fontSize: '0.75rem'
                        }}
                      >
                        {thesis.status}
                      </div>
                    </div>
                  </div>

                  {/* Conviction */}
                  <div className="mb-3">
                    <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                      Conviction: 
                    </span>
                    <span className="ml-2" style={{ color: '#fbbf24' }}>
                      {getConvictionStars(thesis.conviction)}
                    </span>
                  </div>

                  {/* Reasoning */}
                  <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                    {thesis.reasoning}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div style={{ color: 'var(--text-soft)' }}>Entry Price</div>
                      <div style={{ color: 'var(--text)' }}>${thesis.entryPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-soft)' }}>Timeframe</div>
                      <div style={{ color: 'var(--text)' }}>{thesis.timeframe}</div>
                    </div>
                    {thesis.status === 'CLOSED' && thesis.realizedPnl !== undefined && (
                      <div className="col-span-2">
                        <div style={{ color: 'var(--text-soft)' }}>Realized P&L</div>
                        <div>{formatPnl(thesis.realizedPnl)}</div>
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-xs" style={{ color: 'var(--text-soft)' }}>
                      {new Date(thesis.createdAt).toLocaleDateString()}
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