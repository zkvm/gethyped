import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const following = await prisma.follow.findMany({
      where: { followerId: id },
      include: { following: true },
    })
    
    return NextResponse.json({ following: following.map((f: any) => f.following) })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get following" }, { status: 500 })
  }
}