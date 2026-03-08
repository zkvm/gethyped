import { Hono } from "hono";
import { prisma } from "../lib/db.js";
import { getPosition } from "../lib/hl.js";

const app = new Hono();

// Submit thesis
app.post("/", async (c) => {
  const body = await c.req.json();
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
  } = body;

  // Validate required fields
  if (!agentId || !walletAddress || !positionKey || !asset || !side || !reasoning || !conviction || !timeframe) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Find wallet
  const wallet = await prisma.wallet.findFirst({
    where: {
      address: walletAddress.toLowerCase(),
      agentId,
    },
  });
  if (!wallet) {
    return c.json({ error: "Wallet not found for this agent" }, 404);
  }

  // Check no active thesis already exists for this position
  const existing = await prisma.thesis.findFirst({
    where: {
      walletId: wallet.id,
      positionKey,
      status: "ACTIVE",
    },
  });
  if (existing) {
    return c.json(
      { error: "Active thesis already exists for this position", thesisId: existing.id },
      409
    );
  }

  // Verify position on-chain via hp
  const position = await getPosition(walletAddress, positionKey);
  const verified = !!position;

  let entryPrice = 0;
  let entrySize = 0;
  let leverage = 1;
  let marginMode: "CROSS" | "ISOLATED" = "CROSS";

  if (position) {
    entryPrice = position.entryPrice;
    entrySize = position.size;
    leverage = position.leverage;
    // Determine margin mode from position data if available
    marginMode = "CROSS"; // default, hp doesn't expose this directly
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
  });

  return c.json({ thesis, verified }, 201);
});

// Get single thesis
app.get("/:id", async (c) => {
  const thesis = await prisma.thesis.findUnique({
    where: { id: c.req.param("id") },
    include: { agent: true, wallet: true },
  });
  if (!thesis) return c.json({ error: "Thesis not found" }, 404);

  // If active, fetch live position data
  let livePosition = null;
  if (thesis.status === "ACTIVE") {
    livePosition = await getPosition(thesis.wallet.address, thesis.positionKey);
  }

  return c.json({ thesis, livePosition });
});

// List theses (public feed)
app.get("/", async (c) => {
  const {
    asset,
    side,
    status,
    agentId,
    sort = "createdAt",
    limit = "20",
    offset = "0",
  } = c.req.query();

  const where: any = {};
  if (asset) where.asset = asset.toUpperCase();
  if (side) where.side = side.toUpperCase();
  if (status) where.status = status.toUpperCase();
  if (agentId) where.agentId = agentId;

  const orderBy: any = {};
  if (sort === "conviction") orderBy.conviction = "desc";
  else if (sort === "pnl") orderBy.realizedPnl = "desc";
  else orderBy.createdAt = "desc";

  const theses = await prisma.thesis.findMany({
    where,
    orderBy,
    take: parseInt(limit),
    skip: parseInt(offset),
    include: { agent: { select: { id: true, name: true } } },
  });

  const total = await prisma.thesis.count({ where });

  return c.json({ theses, total });
});

// Feed from followed agents
app.get("/following", async (c) => {
  const { agentId, status, limit = "20", offset = "0" } = c.req.query();
  if (!agentId) return c.json({ error: "agentId is required" }, 400);

  const following = await prisma.follow.findMany({
    where: { followerId: agentId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const where: any = { agentId: { in: followingIds } };
  if (status) where.status = status.toUpperCase();

  const theses = await prisma.thesis.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: parseInt(limit),
    skip: parseInt(offset),
    include: { agent: { select: { id: true, name: true } } },
  });

  return c.json({ theses });
});

// Update thesis
app.patch("/:id", async (c) => {
  const { reasoning, conviction, timeframe, catalysts } = await c.req.json();

  const thesis = await prisma.thesis.findUnique({
    where: { id: c.req.param("id") },
  });
  if (!thesis) return c.json({ error: "Thesis not found" }, 404);
  if (thesis.status !== "ACTIVE") {
    return c.json({ error: "Can only update active theses" }, 400);
  }

  const updated = await prisma.thesis.update({
    where: { id: c.req.param("id") },
    data: {
      ...(reasoning !== undefined && { reasoning }),
      ...(conviction !== undefined && { conviction }),
      ...(timeframe !== undefined && { timeframe: timeframe.toUpperCase() }),
      ...(catalysts !== undefined && { catalysts }),
    },
  });

  return c.json({ thesis: updated });
});

export default app;
