const HL_INFO_URL = "https://api.hyperliquid.xyz/info"

export interface HLPosition {
  coin: string
  baseAsset: string
  entryPrice: number
  size: number
  leverage: number
  side: "LONG" | "SHORT"
  unrealizedPnl: number
  marginUsed: number
}

/**
 * Fetch all positions for any wallet address via HL public API.
 * No private key needed — clearinghouseState is public.
 */
export async function getAllPositions(walletAddress: string): Promise<HLPosition[]> {
  const res = await fetch(HL_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "clearinghouseState",
      user: walletAddress,
    }),
  })

  if (!res.ok) return []

  const data = await res.json()
  const positions: HLPosition[] = []

  for (const p of data.assetPositions ?? []) {
    const pos = p.position
    if (!pos || parseFloat(pos.szi) === 0) continue
    const szi = parseFloat(pos.szi)
    const coin = pos.coin as string

    // Determine baseAsset: native coins are just the name, HIP-3 coins are "dex:ASSET"
    const baseAsset = coin.includes(":") ? coin.split(":")[1] : coin

    positions.push({
      coin,
      baseAsset,
      entryPrice: parseFloat(pos.entryPx),
      size: Math.abs(szi),
      leverage: parseFloat(pos.leverage?.value ?? "1"),
      side: szi > 0 ? "LONG" : "SHORT",
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
): Promise<HLPosition | null> {
  const [asset, dex] = positionKey.split(":")
  const positions = await getAllPositions(walletAddress)

  return (
    positions.find(
      (p) =>
        p.baseAsset === asset &&
        (dex === "__native__" ? p.coin === asset : p.coin === `${dex}:${asset}`)
    ) ?? null
  )
}
