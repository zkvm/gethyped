import { HyperliquidPrime } from "hyperliquid-prime";

let _hp: HyperliquidPrime | null = null;

/**
 * Get a read-only HyperliquidPrime instance (no wallet, no private key).
 * Used for position verification and market data queries.
 */
export async function getHP(): Promise<HyperliquidPrime> {
  if (!_hp) {
    _hp = new HyperliquidPrime({});
    await _hp.connect();
  }
  return _hp;
}

/**
 * Look up a specific position for a wallet address.
 * Returns null if position doesn't exist.
 */
export async function getPosition(
  walletAddress: string,
  positionKey: string
) {
  const hp = await getHP();
  const positions = await hp.getPositions(walletAddress);

  // positionKey format: "ETH:__native__" or "ETH:hyna"
  const [asset, dex] = positionKey.split(":");
  return (
    positions.find(
      (p) => p.baseAsset === asset && (dex === "__native__" ? p.coin === asset : p.coin === `${dex}:${asset}`)
    ) ?? null
  );
}

/**
 * Get all positions for a wallet address.
 */
export async function getAllPositions(walletAddress: string) {
  const hp = await getHP();
  return hp.getPositions(walletAddress);
}
