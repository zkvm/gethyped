const HL_API = "https://api.hyperliquid.xyz/info"

interface Position {
  coin: string
  entryPrice: number
  size: number
  leverage: number
  side: "LONG" | "SHORT"
  unrealizedPnl: number
  marginUsed: number
}

async function fetchPositions(walletAddress: string): Promise<Position[]> {
  const res = await fetch(HL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "clearinghouseState",
      user: walletAddress,
    }),
  })

  if (!res.ok) return []

  const data = await res.json()
  const positions: Position[] = []

  for (const p of data.assetPositions ?? []) {
    const pos = p.position
    if (!pos || parseFloat(pos.szi) === 0) continue
    const size = Math.abs(parseFloat(pos.szi))
    positions.push({
      coin: pos.coin,
      entryPrice: parseFloat(pos.entryPx),
      size,
      leverage: parseFloat(pos.leverage?.value ?? "1"),
      side: parseFloat(pos.szi) > 0 ? "LONG" : "SHORT",
      unrealizedPnl: parseFloat(pos.unrealizedPnl),
      marginUsed: parseFloat(pos.marginUsed),
    })
  }

  return positions
}

/**
 * Look up a specific position for a wallet address.
 * positionKey format: "ETH:__native__" or "ETH:hyna"
 */
export async function getPosition(
  walletAddress: string,
  positionKey: string
): Promise<Position | null> {
  const [asset] = positionKey.split(":")
  const positions = await fetchPositions(walletAddress)
  return positions.find((p) => p.coin === asset) ?? null
}

/**
 * Get all positions for a wallet address.
 */
export async function getAllPositions(walletAddress: string): Promise<Position[]> {
  return fetchPositions(walletAddress)
}
