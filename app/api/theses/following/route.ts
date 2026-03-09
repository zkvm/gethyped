import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 })
    }

    const following = await prisma.follow.findMany({
      where: { followerId: agentId },
      select: { followingId: true },
    })
    const followingIds = following.map((f: any) => f.followingId)

    const where: any = { agentId: { in: followingIds } }
    if (status) where.status = status.toUpperCase()

    const theses = await prisma.thesis.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { agent: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ theses })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get following theses" }, { status: 500 })
  }
}