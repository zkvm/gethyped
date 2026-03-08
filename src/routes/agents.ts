import { Hono } from "hono";
import { prisma } from "../lib/db.js";
import { getAllPositions } from "../lib/hl.js";

const app = new Hono();

// Register agent
app.post("/", async (c) => {
  const { name } = await c.req.json();
  if (!name) return c.json({ error: "name is required" }, 400);

  const agent = await prisma.agent.create({ data: { name } });
  return c.json({ agent }, 201);
});

// Get agent profile + stats
app.get("/:id", async (c) => {
  const agent = await prisma.agent.findUnique({
    where: { id: c.req.param("id") },
    include: {
      wallets: true,
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  // Compute thesis stats
  const theses = await prisma.thesis.findMany({
    where: { agentId: agent.id },
  });
  const closed = theses.filter((t) => t.status === "CLOSED");
  const wins = closed.filter((t) => (t.realizedPnl ?? 0) > 0);

  const stats = {
    totalTheses: theses.length,
    activeTheses: theses.filter((t) => t.status === "ACTIVE").length,
    closedTheses: closed.length,
    winRate: closed.length > 0 ? wins.length / closed.length : null,
    totalPnl: closed.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0),
  };

  return c.json({ agent, stats });
});

// Update agent
app.patch("/:id", async (c) => {
  const { name, twitterHandle } = await c.req.json();
  const agent = await prisma.agent.update({
    where: { id: c.req.param("id") },
    data: {
      ...(name !== undefined && { name }),
      ...(twitterHandle !== undefined && { twitterHandle }),
    },
  });
  return c.json({ agent });
});

// --- Wallets ---

app.post("/:id/wallets", async (c) => {
  const { address, label } = await c.req.json();
  if (!address) return c.json({ error: "address is required" }, 400);

  const wallet = await prisma.wallet.create({
    data: {
      agentId: c.req.param("id"),
      address: address.toLowerCase(),
      label,
    },
  });
  return c.json({ wallet }, 201);
});

app.get("/:id/wallets", async (c) => {
  const wallets = await prisma.wallet.findMany({
    where: { agentId: c.req.param("id") },
  });
  return c.json({ wallets });
});

app.delete("/:id/wallets/:walletId", async (c) => {
  await prisma.wallet.delete({ where: { id: c.req.param("walletId") } });
  return c.json({ ok: true });
});

// --- Positions (proxied via hp, not stored) ---

app.get("/:id/positions", async (c) => {
  const wallets = await prisma.wallet.findMany({
    where: { agentId: c.req.param("id") },
  });

  const allPositions = [];
  for (const wallet of wallets) {
    const positions = await getAllPositions(wallet.address);
    for (const pos of positions) {
      // Check if there's an active thesis for this position
      const positionKey = pos.market
        ? `${pos.baseAsset}:${pos.market.dex ?? "__native__"}`
        : `${pos.baseAsset}:__native__`;

      const activeThesis = await prisma.thesis.findFirst({
        where: {
          walletId: wallet.id,
          positionKey,
          status: "ACTIVE",
        },
      });

      allPositions.push({
        ...pos,
        walletAddress: wallet.address,
        walletLabel: wallet.label,
        positionKey,
        hasActiveThesis: !!activeThesis,
        thesisId: activeThesis?.id ?? null,
      });
    }
  }

  return c.json({ positions: allPositions });
});

// --- Follow ---

app.post("/:id/follow", async (c) => {
  const { followerId } = await c.req.json();
  if (!followerId) return c.json({ error: "followerId is required" }, 400);

  const follow = await prisma.follow.create({
    data: {
      followerId,
      followingId: c.req.param("id"),
    },
  });
  return c.json({ follow }, 201);
});

app.delete("/:id/follow", async (c) => {
  const { followerId } = await c.req.json();
  await prisma.follow.delete({
    where: {
      followerId_followingId: {
        followerId,
        followingId: c.req.param("id"),
      },
    },
  });
  return c.json({ ok: true });
});

app.get("/:id/followers", async (c) => {
  const followers = await prisma.follow.findMany({
    where: { followingId: c.req.param("id") },
    include: { follower: true },
  });
  return c.json({ followers: followers.map((f) => f.follower) });
});

app.get("/:id/following", async (c) => {
  const following = await prisma.follow.findMany({
    where: { followerId: c.req.param("id") },
    include: { following: true },
  });
  return c.json({ following: following.map((f) => f.following) });
});

export default app;
