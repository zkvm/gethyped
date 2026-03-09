import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { followerId } = await request.json()
    
    if (!followerId) {
      return NextResponse.json({ error: "followerId is required" }, { status: 400 })
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: id,
      },
    })
    
    return NextResponse.json({ follow }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to follow agent" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { followerId } = await request.json()
    
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: id,
        },
      },
    })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to unfollow agent" }, { status: 500 })
  }
}