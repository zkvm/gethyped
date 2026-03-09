import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { getAllPositions } from '../../../../../lib/hl'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const wallets = await prisma.wallet.findMany({
      where: { agentId: id },
    })

    const allPositions = []
    
    for (const wallet of wallets) {
      const positions = await getAllPositions(wallet.address)
      for (const pos of positions) {
        // Check if there's an active thesis for this position
        const positionKey = pos.market
          ? `${pos.baseAsset}:${(pos.market as any).dex ?? "__native__"}`
          : `${pos.baseAsset}:__native__`

        const activeThesis = await prisma.thesis.findFirst({
          where: {
            walletId: wallet.id,
            positionKey,
            status: "ACTIVE",
          },
        })

        allPositions.push({
          ...pos,
          walletAddress: wallet.address,
          walletLabel: wallet.label,
          positionKey,
          hasActiveThesis: !!activeThesis,
          thesisId: activeThesis?.id ?? null,
        })
      }
    }

    return NextResponse.json({ positions: allPositions })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get positions" }, { status: 500 })
  }
}