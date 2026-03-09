import { NextRequest, NextResponse } from 'next/server'
import { monitorPositions } from '../../../../services/monitor'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization")
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = await monitorPositions()
    return NextResponse.json({ ok: true, results })
  } catch (error) {
    return NextResponse.json({ error: "Failed to monitor positions" }, { status: 500 })
  }
}