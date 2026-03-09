import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { getPosition } from '../../../lib/hl'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      agentId,
      walletAddress,
      positionKey,
      asset,
      side,
      reasoning,
      conviction,
      timeframe,
      catalysts,
    } = body

    // Validate required fields
    if (!agentId || !walletAddress || !positionKey || !asset || !side || !reasoning || !conviction || !timeframe) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        address: walletAddress.toLowerCase(),
        agentId,
      },
    })
    
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found for this agent" }, { status: 404 })
    }

    // Check no active thesis already exists for this position
    const existing = await prisma.thesis.findFirst({
      where: {
        walletId: wallet.id,
        positionKey,
        status: "ACTIVE",
      },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: "Active thesis already exists for this position", thesisId: existing.id },
        { status: 409 }
      )
    }

    // Verify position on-chain via hp
    const position = await getPosition(walletAddress, positionKey)
    const verified = !!position

    let entryPrice = 0
    let entrySize = 0
    let leverage = 1
    let marginMode: "CROSS" | "ISOLATED" = "CROSS"

    if (position) {
      entryPrice = position.entryPrice
      entrySize = position.size
      leverage = position.leverage
      marginMode = "CROSS" // default, hp doesn't expose this directly
    }

    const thesis = await prisma.thesis.create({
      data: {
        agentId,
        walletId: wallet.id,
        positionKey,
        asset,
        side: side.toUpperCase(),
        entryPrice,
        entrySize,
        leverage,
        marginMode,
        reasoning,
        conviction,
        timeframe: timeframe.toUpperCase(),
        catalysts: catalysts ?? [],
      },
    })

    return NextResponse.json({ thesis, verified }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create thesis" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const asset = searchParams.get('asset')
    const side = searchParams.get('side')
    const status = searchParams.get('status')
    const agentId = searchParams.get('agentId')
    const sort = searchParams.get('sort') || 'createdAt'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (asset) where.asset = asset.toUpperCase()
    if (side) where.side = side.toUpperCase()
    if (status) where.status = status.toUpperCase()
    if (agentId) where.agentId = agentId

    const orderBy: any = {}
    if (sort === "conviction") orderBy.conviction = "desc"
    else if (sort === "pnl") orderBy.realizedPnl = "desc"
    else orderBy.createdAt = "desc"

    const theses = await prisma.thesis.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: { agent: { select: { id: true, name: true } } },
    })

    const total = await prisma.thesis.count({ where })

    return NextResponse.json({ theses, total })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get theses" }, { status: 500 })
  }
}