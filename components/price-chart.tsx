'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, LineStyle, AreaSeries, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { useTheme } from '../app/theme-provider'

// Map ticker symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
}

const RANGE_DAYS: Record<string, number> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
}

interface PriceChartProps {
  asset: string
}

export function PriceChart({ asset }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area', Time> | null>(null)
  const { theme } = useTheme()
  const [range, setRange] = useState('30D')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)

  // Resolve CSS variable values for chart theming
  const getCssVar = (name: string) => {
    if (typeof window === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  }

  const getChartColors = () => {
    const isDark = theme === 'dark'
    return {
      background: isDark ? '#0a0a0a' : '#f7f7f6',
      text: isDark ? '#ababab' : '#666666',
      grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(17,17,17,0.05)',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.08)',
      lineColor: isDark ? '#d8d8d3' : '#626262',
      topColor: isDark ? 'rgba(216,216,211,0.12)' : 'rgba(98,98,98,0.1)',
      bottomColor: isDark ? 'rgba(216,216,211,0)' : 'rgba(98,98,98,0)',
      crosshair: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(17,17,17,0.2)',
    }
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const colors = getChartColors()

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: colors.text,
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: colors.grid, style: LineStyle.Solid },
        horzLines: { color: colors.grid, style: LineStyle.Solid },
      },
      crosshair: {
        vertLine: {
          color: colors.crosshair,
          labelBackgroundColor: colors.lineColor,
        },
        horzLine: {
          color: colors.crosshair,
          labelBackgroundColor: colors.lineColor,
        },
      },
      rightPriceScale: {
        borderColor: colors.border,
        textColor: colors.text,
      },
      timeScale: {
        borderColor: colors.border,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
      width: chartContainerRef.current.clientWidth,
      height: 240,
    })

    const series = chart.addSeries(AreaSeries, {
      lineColor: colors.lineColor,
      topColor: colors.topColor,
      bottomColor: colors.bottomColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: colors.lineColor,
      crosshairMarkerBackgroundColor: colors.background,
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        chart.applyOptions({ width: entries[0].contentRect.width })
      }
    })
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Update chart colors on theme change
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    const colors = getChartColors()

    chartRef.current.applyOptions({
      layout: { textColor: colors.text },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.lineColor },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.lineColor },
      },
      rightPriceScale: { borderColor: colors.border, textColor: colors.text },
      timeScale: { borderColor: colors.border },
    })

    seriesRef.current.applyOptions({
      lineColor: colors.lineColor,
      topColor: colors.topColor,
      bottomColor: colors.bottomColor,
    })
  }, [theme])

  // Fetch price data
  useEffect(() => {
    if (!seriesRef.current) return

    const coinId = COINGECKO_IDS[asset.toUpperCase()]
    if (!coinId) {
      setError(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    const days = RANGE_DAYS[range]
    fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${days <= 7 ? 'hourly' : 'daily'}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data.prices || !seriesRef.current) return

        const chartData = data.prices.map(([timestamp, price]: [number, number]) => ({
          time: Math.floor(timestamp / 1000) as Time,
          value: price,
        }))

        seriesRef.current.setData(chartData)
        chartRef.current?.timeScale().fitContent()

        if (chartData.length >= 2) {
          const first = chartData[0].value
          const last = chartData[chartData.length - 1].value
          setCurrentPrice(last)
          setPriceChange(((last - first) / first) * 100)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [asset, range])

  const isPositive = priceChange !== null && priceChange >= 0

  return (
    <div className="surface-card p-6 mb-8">
      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="kicker mb-1">PRICE</p>
          {currentPrice !== null && (
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {priceChange !== null && (
                <span
                  className="text-sm font-medium"
                  style={{ color: isPositive ? '#10b981' : '#ef4444' }}
                >
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
            </div>
          )}
          {loading && (
            <div className="text-sm" style={{ color: 'var(--text-soft)' }}>Loading...</div>
          )}
        </div>

        {/* Range selector */}
        <div className="flex gap-1">
          {Object.keys(RANGE_DAYS).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                backgroundColor: range === r ? 'var(--accent-soft)' : 'transparent',
                color: range === r ? 'var(--text)' : 'var(--text-soft)',
                border: `1px solid ${range === r ? 'var(--border-strong)' : 'transparent'}`,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {error ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 240, color: 'var(--text-soft)', fontSize: '0.875rem' }}
        >
          Price data unavailable for {asset}
        </div>
      ) : (
        <div ref={chartContainerRef} style={{ width: '100%' }} />
      )}
    </div>
  )
}
