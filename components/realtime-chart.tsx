'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, LineStyle, LineSeries, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { useTheme } from '../app/theme-provider'

interface RealtimeChartProps {
  asset: string
}

const MAX_POINTS = 200

export function RealtimeChart({ asset }: RealtimeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line', Time> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pointsRef = useRef<{ time: Time; value: number }[]>([])
  const { theme } = useTheme()

  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  const getChartColors = (isDark: boolean) => ({
    text: isDark ? '#ababab' : '#666666',
    grid: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.08)',
    line: isDark ? '#d8d8d3' : '#626262',
    crosshair: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(17,17,17,0.2)',
  })

  // Init chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const colors = getChartColors(theme === 'dark')

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
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.line },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.line },
      },
      rightPriceScale: {
        borderColor: colors.border,
        textColor: colors.text,
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: true,
        fixLeftEdge: false,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
      width: chartContainerRef.current.clientWidth,
      height: 200,
    })

    const series = chart.addSeries(LineSeries, {
      color: colors.line,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      crosshairMarkerBorderColor: colors.line,
      crosshairMarkerBackgroundColor: colors.line,
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width })
    })
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Theme updates
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    const colors = getChartColors(theme === 'dark')

    chartRef.current.applyOptions({
      layout: { textColor: colors.text },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.line },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.line },
      },
      rightPriceScale: { borderColor: colors.border, textColor: colors.text },
      timeScale: { borderColor: colors.border },
    })

    seriesRef.current.applyOptions({ color: colors.line })
  }, [theme])

  // WebSocket connection
  useEffect(() => {
    const symbol = `${asset.toLowerCase()}usdt`

    pointsRef.current = []
    setCurrentPrice(null)
    setPriceChange(null)
    setConnected(false)
    setUnsupported(false)

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (event) => {
      const trade = JSON.parse(event.data)
      const price = parseFloat(trade.p)
      const time = Math.floor(trade.T / 1000) as Time

      const points = pointsRef.current
      const last = points[points.length - 1]

      // Lightweight Charts requires strictly increasing time — skip dupes
      if (last && last.time >= time) return

      const newPoint = { time, value: price }
      points.push(newPoint)
      if (points.length > MAX_POINTS) points.shift()

      seriesRef.current?.update(newPoint)
      chartRef.current?.timeScale().scrollToRealTime()

      setCurrentPrice(price)
      if (points.length >= 2) {
        const first = points[0].value
        setPriceChange(((price - first) / first) * 100)
      }
    }

    ws.onerror = () => setUnsupported(true)
    ws.onclose = () => setConnected(false)

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [asset])

  const isPositive = priceChange !== null && priceChange >= 0

  return (
    <div className="surface-card p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="kicker mb-1">LIVE PRICE</p>
          {currentPrice !== null ? (
            <div className="flex items-baseline gap-3">
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}
              >
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {priceChange !== null && (
                <span className="text-sm font-medium" style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(3)}%
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-soft)' }}>
              {unsupported ? `No live feed for ${asset}` : 'Connecting...'}
            </div>
          )}
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: unsupported ? '#ef4444' : connected ? '#10b981' : '#fbbf24',
              boxShadow: connected ? '0 0 6px #10b981' : 'none',
            }}
          />
          <span className="text-xs" style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
            {unsupported ? 'UNAVAILABLE' : connected ? 'LIVE' : 'CONNECTING'}
          </span>
        </div>
      </div>

      {/* Chart */}
      {unsupported ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 200, color: 'var(--text-soft)', fontSize: '0.875rem' }}
        >
          Live feed unavailable for {asset}
        </div>
      ) : (
        <div ref={chartContainerRef} style={{ width: '100%' }} />
      )}
    </div>
  )
}
