// Temporarily simplified for build - hyperliquid-prime API needs to be reviewed

/**
 * Look up a specific position for a wallet address.
 * Returns null if position doesn't exist.
 * TODO: Implement actual hyperliquid-prime integration
 */
export async function getPosition(
  walletAddress: string,
  positionKey: string
): Promise<any | null> {
  // Placeholder implementation for build
  console.warn('getPosition not fully implemented yet');
  return null;
}

/**
 * Get all positions for a wallet address.
 * TODO: Implement actual hyperliquid-prime integration
 */
export async function getAllPositions(walletAddress: string): Promise<any[]> {
  // Placeholder implementation for build
  console.warn('getAllPositions not fully implemented yet');
  return [];
}
