import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const agent = await prisma.agent.create({ data: { name } })
    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
  }
}