#!/usr/bin/env node
/**
 * gethyped setup — register agent/wallet and derive address from private key.
 *
 * Usage:
 *   node setup.js init <agent-name>                    # Init config with agent registration
 *   node setup.js wallet <private-key>                 # Derive address, register wallet, save key
 *   node setup.js derive <private-key>                 # Derive address only (no side effects)
 *   node setup.js status                               # Show current config state
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { createHash } from "crypto";

const CONFIG_PATH =
  process.env.GETHYPED_CONFIG ||
  `${process.env.HOME}/.openclaw/skills/gethyped/config.json`;

// --- Config helpers ---

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return {};
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

function saveConfig(cfg) {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n");
}

// --- Crypto: derive address from private key (no external deps) ---

async function deriveAddress(privateKeyHex) {
  // Use dynamic import for viem (available via hyperliquid-prime)
  const { privateKeyToAccount } = await import("viem/accounts");
  const key = privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`;
  const account = privateKeyToAccount(key);
  return account.address.toLowerCase();
}

// --- API helpers ---

async function apiCall(method, path, body, apiUrl) {
  const url = `${apiUrl}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API ${method} ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

// --- Commands ---

async function cmdInit(agentName) {
  const cfg = loadConfig();
  if (cfg.agentId) {
    console.log(JSON.stringify({ ok: true, status: "already_registered", agentId: cfg.agentId }));
    return;
  }
  const apiUrl = cfg.apiUrl || "https://gethyped.vercel.app";
  const { agent } = await apiCall("POST", "/agents", { name: agentName }, apiUrl);
  cfg.apiUrl = apiUrl;
  cfg.agentId = agent.id;
  saveConfig(cfg);
  console.log(JSON.stringify({ ok: true, status: "registered", agentId: agent.id }));
}

async function cmdWallet(privateKey) {
  const cfg = loadConfig();
  if (!cfg.agentId) {
    throw new Error("Agent not registered. Run: node setup.js init <name>");
  }
  const address = await deriveAddress(privateKey);
  const apiUrl = cfg.apiUrl || "https://gethyped.vercel.app";

  // Check if this address is already registered
  if (cfg.walletAddress === address) {
    console.log(JSON.stringify({ ok: true, status: "already_registered", address }));
    return;
  }

  // Register new wallet
  try {
    await apiCall("POST", `/agents/${cfg.agentId}/wallets`, { address }, apiUrl);
  } catch (e) {
    // Wallet may already exist (unique constraint) — that's fine
    if (!e.message.includes("409") && !e.message.includes("Unique")) throw e;
  }

  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  cfg.walletAddress = address;
  cfg.privateKey = key;
  saveConfig(cfg);
  console.log(JSON.stringify({ ok: true, status: "wallet_registered", address }));
}

async function cmdDerive(privateKey) {
  const address = await deriveAddress(privateKey);
  console.log(JSON.stringify({ address }));
}

function cmdStatus() {
  const cfg = loadConfig();
  const status = {
    configPath: CONFIG_PATH,
    hasApiUrl: !!cfg.apiUrl,
    hasAgentId: !!cfg.agentId,
    hasWallet: !!cfg.walletAddress,
    hasPrivateKey: !!cfg.privateKey,
    agentId: cfg.agentId || null,
    walletAddress: cfg.walletAddress || null,
  };
  console.log(JSON.stringify(status));
}

// --- Main ---

const [cmd, ...args] = process.argv.slice(2);

try {
  switch (cmd) {
    case "init":
      if (!args[0]) throw new Error("Usage: node setup.js init <agent-name>");
      await cmdInit(args[0]);
      break;
    case "wallet":
      if (!args[0]) throw new Error("Usage: node setup.js wallet <private-key>");
      await cmdWallet(args[0]);
      break;
    case "derive":
      if (!args[0]) throw new Error("Usage: node setup.js derive <private-key>");
      await cmdDerive(args[0]);
      break;
    case "status":
      cmdStatus();
      break;
    default:
      console.error("Usage: node setup.js <init|wallet|derive|status> [args]");
      process.exit(1);
  }
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
}
