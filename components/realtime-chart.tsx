'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, LineStyle, LineSeries, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { useTheme } from '../app/theme-provider'

interface RealtimeChartProps {
  asset: string
}

const MAX_POINTS = 200
const CHART_HEIGHT = 160

export function RealtimeChart({ asset }: RealtimeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line', Time> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pointsRef = useRef<{ time: Time; value: number }[]>([])
  const { theme } = useTheme()

  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'unavailable'>('connecting')

  const getColors = (isDark: boolean) => ({
    text: isDark ? '#ababab' : '#666666',
    grid: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.08)',
    line: isDark ? '#d8d8d3' : '#626262',
    crosshair: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(17,17,17,0.2)',
  })

  // Init chart once
  useEffect(() => {
    if (!chartContainerRef.current) return

    const colors = getColors(theme === 'dark')

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
      rightPriceScale: { borderColor: colors.border, textColor: colors.text },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
      width: chartContainerRef.current.clientWidth,
      height: CHART_HEIGHT,
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

    const ro = new ResizeObserver((entries) => {
      if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width })
    })
    ro.observe(chartContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Theme sync
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    const colors = getColors(theme === 'dark')
    chartRef.current.applyOptions({
      layout: { textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: {
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.line },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.line },
      },
      rightPriceScale: { borderColor: colors.border, textColor: colors.text },
      timeScale: { borderColor: colors.border },
    })
    seriesRef.current.applyOptions({ color: colors.line })
  }, [theme])

  // WebSocket
  useEffect(() => {
    pointsRef.current = []
    setCurrentPrice(null)
    setPriceChange(null)
    setStatus('connecting')

    // Clear series data on asset change
    seriesRef.current?.setData([])

    const symbol = `${asset.toLowerCase()}usdt`
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      // First successful message — mark as live
      setStatus('live')

      const trade = JSON.parse(event.data)
      const price = parseFloat(trade.p)
      const time = Math.floor(trade.T / 1000) as Time

      const points = pointsRef.current
      const last = points[points.length - 1]
      if (last && last.time >= time) return

      const point = { time, value: price }
      points.push(point)
      if (points.length > MAX_POINTS) points.shift()

      seriesRef.current?.update(point)
      chartRef.current?.timeScale().scrollToRealTime()

      setCurrentPrice(price)
      if (points.length >= 2) {
        const first = points[0].value
        setPriceChange(((price - first) / first) * 100)
      }
    }

    ws.onclose = (e) => {
      // Only mark unavailable if we never received data (code 1006 = abnormal close = bad symbol)
      if (pointsRef.current.length === 0) setStatus('unavailable')
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [asset])

  const isPositive = priceChange !== null && priceChange >= 0

  return (
    <div className="surface-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <p className="kicker">LIVE</p>
          {currentPrice !== null && (
            <>
              <span className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {priceChange !== null && (
                <span className="text-sm" style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(3)}%
                </span>
              )}
            </>
          )}
          {status === 'connecting' && (
            <span className="text-xs" style={{ color: 'var(--text-soft)' }}>connecting...</span>
          )}
          {status === 'unavailable' && (
            <span className="text-xs" style={{ color: 'var(--text-soft)' }}>unavailable for {asset}</span>
          )}
        </div>

        {/* Status dot */}
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: status === 'live' ? '#10b981' : status === 'unavailable' ? '#ef4444' : '#fbbf24',
            boxShadow: status === 'live' ? '0 0 5px #10b981' : 'none',
          }}
        />
      </div>

      {/* Always mounted so chart ref stays attached */}
      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          opacity: status === 'unavailable' ? 0 : 1,
          height: status === 'unavailable' ? 0 : 'auto',
        }}
      />
    </div>
  )
}
