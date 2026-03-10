import { prisma } from "../lib/db";
import { getPosition, getMarkPrice } from "../lib/hl";

/**
 * Position monitor — called by Vercel Cron.
 * Checks all active theses and closes any whose positions have closed.
 */
export async function monitorPositions() {
  const activeTheses = await prisma.thesis.findMany({
    where: { status: "ACTIVE" },
    include: { wallet: true },
  });

  const results = {
    checked: 0,
    closed: 0,
    liquidated: 0,
    errors: 0,
  };

  for (const thesis of activeTheses) {
    results.checked++;

    try {
      const position = await getPosition(thesis.wallet.address, thesis.positionKey);

      if (!position || position.size === 0) {
        // Position closed — fetch mark price for exit
        const [asset] = thesis.positionKey.split(":")
        const exitPx = await getMarkPrice(asset)
        await prisma.thesis.update({
          where: { id: thesis.id },
          data: {
            status: "CLOSED",
            exitPrice: exitPx,
            realizedPnl: calculatePnl(
              thesis.side,
              thesis.entryPrice,
              exitPx,
              thesis.entrySize
            ),
            closedAt: new Date(),
          },
        });
        results.closed++;
      } else if (
        (thesis.side === "LONG" && position.side === "SHORT") ||
        (thesis.side === "SHORT" && position.side === "LONG")
      ) {
        // Side flipped — close old thesis
        await prisma.thesis.update({
          where: { id: thesis.id },
          data: {
            status: "CLOSED",
            exitPrice: position.entryPrice, // new entry = old exit
            realizedPnl: calculatePnl(
              thesis.side,
              thesis.entryPrice,
              position.entryPrice,
              thesis.entrySize
            ),
            closedAt: new Date(),
          },
        });
        results.closed++;
      }
      // Position with liquidationPrice = 0 or null and size = 0 could mean liquidation
      // For now we treat all closures the same
    } catch (err) {
      console.error(`Error checking thesis ${thesis.id}:`, err);
      results.errors++;
    }
  }

  return results;
}

function calculatePnl(
  side: string,
  entryPrice: number,
  exitPrice: number,
  size: number
): number {
  if (side === "LONG") {
    return (exitPrice - entryPrice) * size;
  } else {
    return (entryPrice - exitPrice) * size;
  }
}
