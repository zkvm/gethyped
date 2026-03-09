import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; walletId: string }> }
) {
  try {
    const { walletId } = await params
    await prisma.wallet.delete({ where: { id: walletId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete wallet" }, { status: 500 })
  }
}