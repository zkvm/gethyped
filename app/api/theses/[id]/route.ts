import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getPosition } from '../../../../lib/hl'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const thesis = await prisma.thesis.findUnique({
      where: { id },
      include: { agent: true, wallet: true },
    })
    
    if (!thesis) {
      return NextResponse.json({ error: "Thesis not found" }, { status: 404 })
    }

    // If active, fetch live position data
    let livePosition = null
    if (thesis.status === "ACTIVE") {
      livePosition = await getPosition(thesis.wallet.address, thesis.positionKey)
    }

    return NextResponse.json({ thesis, livePosition })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get thesis" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { reasoning, conviction, timeframe, catalysts } = await request.json()

    const thesis = await prisma.thesis.findUnique({
      where: { id },
    })
    
    if (!thesis) {
      return NextResponse.json({ error: "Thesis not found" }, { status: 404 })
    }
    
    if (thesis.status !== "ACTIVE") {
      return NextResponse.json({ error: "Can only update active theses" }, { status: 400 })
    }

    const updated = await prisma.thesis.update({
      where: { id },
      data: {
        ...(reasoning !== undefined && { reasoning }),
        ...(conviction !== undefined && { conviction }),
        ...(timeframe !== undefined && { timeframe: timeframe.toUpperCase() }),
        ...(catalysts !== undefined && { catalysts }),
      },
    })

    return NextResponse.json({ thesis: updated })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update thesis" }, { status: 500 })
  }
}