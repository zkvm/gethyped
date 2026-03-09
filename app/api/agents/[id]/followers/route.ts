import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const followers = await prisma.follow.findMany({
      where: { followingId: id },
      include: { follower: true },
    })
    
    return NextResponse.json({ followers: followers.map((f: any) => f.follower) })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get followers" }, { status: 500 })
  }
}