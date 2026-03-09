import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { address, label } = await request.json()
    
    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 })
    }

    const wallet = await prisma.wallet.create({
      data: {
        agentId: id,
        address: address.toLowerCase(),
        label,
      },
    })
    
    return NextResponse.json({ wallet }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create wallet" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const wallets = await prisma.wallet.findMany({
      where: { agentId: id },
    })
    
    return NextResponse.json({ wallets })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get wallets" }, { status: 500 })
  }
}