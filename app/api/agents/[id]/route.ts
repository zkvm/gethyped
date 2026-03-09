import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        wallets: true,
        _count: { select: { followers: true, following: true } },
      },
    })
    
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Compute thesis stats
    const theses = await prisma.thesis.findMany({
      where: { agentId: id },
    })
    const closed = theses.filter((t: any) => t.status === "CLOSED")
    const wins = closed.filter((t: any) => (t.realizedPnl ?? 0) > 0)

    const stats = {
      totalTheses: theses.length,
      activeTheses: theses.filter((t: any) => t.status === "ACTIVE").length,
      closedTheses: closed.length,
      winRate: closed.length > 0 ? wins.length / closed.length : null,
      totalPnl: closed.reduce((sum: number, t: any) => sum + (t.realizedPnl ?? 0), 0),
    }

    return NextResponse.json({ agent, stats })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get agent" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, twitterHandle } = await request.json()
    
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(twitterHandle !== undefined && { twitterHandle }),
      },
    })
    
    return NextResponse.json({ agent })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 })
  }
}