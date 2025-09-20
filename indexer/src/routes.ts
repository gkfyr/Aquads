import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma, upsertSlot } from "./db.js";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { getClient, keypairFromEnv } from "./sui.js";
let snapshotAvailable = true;
async function snapshotUrlDynamic(url: string, opts: any) {
  try {
    const mod = await import("./snapshot.js");
    return mod.snapshotUrl(url, opts);
  } catch (e) {
    snapshotAvailable = false;
    throw new Error("snapshot module not available; ensure puppeteer is installed");
  }
}

const uploadsRoot = path.join(process.cwd(), "indexer", "uploads");
const upload = multer({ dest: uploadsRoot });

export const router = express.Router();

function serializeSlot(s: any) {
  if (!s) return s;
  return {
    id: s.id,
    publisher: s.publisher,
    width: s.width,
    height: s.height,
    domain_hash: s.domain_hash,
    reserve_price: s.reserve_price != null ? String(s.reserve_price) : null,
    current_renter: s.current_renter,
    rental_expiry: s.rental_expiry != null ? Number(s.rental_expiry) : 0,
    last_price: s.last_price != null ? String(s.last_price) : "0",
    latest_meta_cid: s.latest_meta_cid,
    created_at: s.created_at != null ? Number(s.created_at) : undefined,
  };
}

// Simple on-disk mapping for page URLs per slot (MVP, avoids DB migration)
const pagesMapPath = path.join(uploadsRoot, 'slot-pages.json');
function loadPagesMap(): Record<string, string> {
  try {
    if (fs.existsSync(pagesMapPath)) {
      return JSON.parse(fs.readFileSync(pagesMapPath, 'utf8')) as Record<string, string>;
    }
  } catch {}
  return {};
}
function savePagesMap(map: Record<string, string>) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
  fs.writeFileSync(pagesMapPath, JSON.stringify(map, null, 2));
}

// Simple claims ledger (hackathon): track claimed amounts per slot
const claimsPath = path.join(uploadsRoot, 'claims.json');
function loadClaims(): Record<string, { amountMist: string; ts: number }[]> {
  try {
    if (fs.existsSync(claimsPath)) return JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
  } catch {}
  return {};
}
function saveClaims(map: Record<string, { amountMist: string; ts: number }[]>) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
  fs.writeFileSync(claimsPath, JSON.stringify(map, null, 2));
}

function metaCidToPaths(metaCid: string) {
  // For mock://sha256-<hash>, meta JSON is /uploads/<hash>.json
  // and image inside meta points to mock://sha256-<imgHash> => /uploads/sha256-<imgHash>
  if (!metaCid) return { metaUrl: null as string | null };
  if (metaCid.startsWith("mock://sha256-")) {
    const hash = metaCid.replace("mock://sha256-", "");
    return { metaUrl: `/uploads/${hash}.json` };
  }
  return { metaUrl: metaCid };
}

function readMetaFromCid(metaCid: string): any | null {
  try {
    const { metaUrl } = metaCidToPaths(metaCid);
    if (!metaUrl) return null;
    if (metaUrl.startsWith("/uploads/")) {
      const rel = metaUrl.replace(/^\/uploads\//, "");
      const file = path.join(uploadsRoot, rel);
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    // Fallback: try fetching if it's an absolute URL (sync fetch not available here; skip for MVP)
    return null;
  } catch {
    return null;
  }
}

type ViewStats = {
  views: number;
  totalDurationMs: number;
  maxPctSum: number;
};

function loadViewStats(slotIds: string[]) {
  const stats: Record<string, ViewStats> = {};
  if (!slotIds.length) return stats;
  const file = path.join(uploadsRoot, 'views.log');
  if (!fs.existsSync(file)) return stats;
  const slotSet = new Set(slotIds);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const slotId = String(entry.slotId || entry.slot_id || '');
        if (!slotId || !slotSet.has(slotId)) continue;
        let stat = stats[slotId];
        if (!stat) {
          stat = { views: 0, totalDurationMs: 0, maxPctSum: 0 };
          stats[slotId] = stat;
        }
        stat.views += 1;
        stat.totalDurationMs += Number(entry.durationMs || 0);
        stat.maxPctSum += Number(entry.maxPct || 0);
      } catch (err) {
        // ignore corrupt lines
      }
    }
  } catch (err) {
    // ignore read errors for MVP
  }
  return stats;
}

function parseEventData(raw: any) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

function toBigInt(value: any): bigint {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.trunc(value));
    if (typeof value === 'string') {
      if (!value) return 0n;
      if (value.startsWith('0x') || value.startsWith('0X')) return BigInt(value);
      if (/^-?\d+$/.test(value)) return BigInt(value);
      return 0n;
    }
    if (Array.isArray(value)) {
      const text = Buffer.from(value).toString('utf8');
      if (/^-?\d+$/.test(text)) return BigInt(text);
      if (text.startsWith('0x')) return BigInt(text);
    }
  } catch {}
  return 0n;
}

function toNumber(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  const str = typeof value === 'string' ? value : Array.isArray(value) ? Buffer.from(value).toString('utf8') : String(value);
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

function toAddress(value: any): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    try { return Buffer.from(value).toString('utf8'); } catch { return ''; }
  }
  return '';
}

async function ensureSharedObject(client: SuiClient, id: string) {
  const obj = await client.getObject({ id, options: { showOwner: true } }).catch(() => null as any);
  if (!obj || obj.error || !obj.data) throw new Error("Object not found");
  const owner = (obj.data as any).owner;
  const isShared = owner && typeof owner === 'object' && 'Shared' in owner;
  if (!isShared) throw new Error("Object is not shared");
}

router.get("/api/slot/:id/current", async (req, res) => {
  const { id } = req.params;
  let slot = await prisma.slot.findUnique({ where: { id } });
  if (!slot) return res.status(404).json({ error: "Not found" });
  // Fallback: fetch reserve_price from on-chain object if missing (older events schema)
  try {
    if (!slot.reserve_price || String(slot.reserve_price) === '0') {
      const client = getClient();
      const obj: any = await client.getObject({ id, options: { showContent: true } });
      const fields = (obj as any)?.data?.content?.fields as any;
      const rp = fields?.reserve_price;
      if (rp != null) {
        const asStr = typeof rp === 'string' ? rp : Array.isArray(rp) ? Buffer.from(rp).toString('utf8') : String(rp);
        await prisma.slot.update({ where: { id }, data: { reserve_price: BigInt(asStr) } }).catch(() => {});
        slot = await prisma.slot.findUnique({ where: { id } }) as any;
      }
    }
  } catch {}
  const pages = loadPagesMap();
  const pageUrl = pages[id] || null;
  res.json({
    slot: serializeSlot(slot),
    renter: slot.current_renter,
    expiry: Number(slot.rental_expiry),
    lastPrice: String(slot.last_price),
    latestMetaCid: slot.latest_meta_cid,
    pageUrl,
  });
});

// Public config for clients (safe values only)
router.get('/api/config', (_req, res) => {
  res.json({
    packageId: process.env.SUI_PACKAGE_ID || '',
    moduleName: process.env.SUI_MODULE_NAME || 'ad_market',
    network: process.env.SUI_NETWORK || 'testnet',
    protocolId: process.env.SUI_PROTOCOL_ID || process.env.PROTOCOL_ID || '',
  });
});

// Current creative resolved: returns meta JSON (if accessible) and derived image URL
router.get("/api/slot/:id/creative/current", async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await prisma.slot.findUnique({ where: { id } });
    if (!slot || !slot.latest_meta_cid) return res.status(404).json({ error: "No creative" });
    const { metaUrl } = metaCidToPaths(slot.latest_meta_cid);
    let meta: any = null;
    if (metaUrl && metaUrl.startsWith("/uploads/")) {
      const rel = metaUrl.replace(/^\/uploads\//, "");
      const file = path.join(uploadsRoot, rel);
      if (fs.existsSync(file)) meta = JSON.parse(fs.readFileSync(file, "utf8"));
    }
    let imgUrl: string | null = null;
    if (meta && typeof meta.img_cid === "string") {
      if (meta.img_cid.startsWith("mock://sha256-")) imgUrl = `/uploads/${meta.img_cid.replace("mock://", "")}`;
      else imgUrl = meta.img_cid;
    }
    res.json({
      slot: serializeSlot(slot),
      metaCid: slot.latest_meta_cid,
      metaUrl,
      meta,
      imgUrl,
    });
  } catch (e) {
    console.error("creative current error", e);
    res.status(500).json({ error: "failed" });
  }
});

// Creative history per slot from events
router.get("/api/slot/:id/creatives", async (req, res) => {
  try {
    const { id } = req.params;
    const evs = await prisma.event.findMany({ where: { slot_id: id, type: "CreativeUpdated" }, orderBy: { ts: "desc" }, take: 50 });
    const list = evs.map((e) => {
      const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data as any;
      const metaCid = data?.meta_cid ?? null;
      const { metaUrl } = metaCidToPaths(String(metaCid || ""));
      return { id: e.id, ts: Number(e.ts), metaCid: String(metaCid || ""), metaUrl };
    });
    res.json(list);
  } catch (e) {
    console.error("creative list error", e);
    res.status(500).json({ error: "failed" });
  }
});

// Finance metrics per slot — hackathon linear vesting over 30 days based on Rented/BuyoutLocked event ts
router.get('/api/slot/:id/finance', async (req, res) => {
  try {
    const id = String(req.params.id);
    const events = await prisma.event.findMany({ where: { slot_id: id, type: { in: ['Rented', 'BuyoutLocked'] } }, orderBy: { ts: 'asc' } });
    const now = Math.floor(Date.now() / 1000);
    const vestSec = 30 * 86400;
    const claims = loadClaims();
    const claimedList = claims[id] || [];
    const totalClaimed = claimedList.reduce((acc, c) => acc + BigInt(c.amountMist || '0'), 0n);
    let total = 0n;
    let claimable = 0n;
    for (const ev of events) {
      const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : (ev.data as any);
      const amt = BigInt(String(data.price ?? data.amount ?? '0'));
      total += amt;
      const ts = Number(ev.ts || 0);
      const passed = Math.max(0, Math.min(vestSec, now - ts));
      const vested = (amt * BigInt(passed)) / BigInt(vestSec);
      claimable += vested;
    }
    if (claimable < totalClaimed) claimable = totalClaimed; // guard
    const available = claimable - totalClaimed;
    res.json({ totalMist: total.toString(), claimableMist: claimable.toString(), claimedMist: totalClaimed.toString(), availableMist: available.toString(), vestDays: 30 });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

router.post('/api/slot/:id/claim', express.json(), async (req, res) => {
  try {
    const id = String(req.params.id);
    const { amountMist } = req.body as { amountMist: string };
    if (!amountMist) return res.status(400).json({ error: 'amountMist required' });
    const finance: any = await (await fetch(`http://localhost:${process.env.PORT || 8787}/api/slot/${id}/finance`)).json();
    const available = BigInt(finance.availableMist || '0');
    const reqAmt = BigInt(String(amountMist));
    if (reqAmt <= 0n || reqAmt > available) return res.status(400).json({ error: 'invalid amount' });
    const claims = loadClaims();
    const list = claims[id] || [];
    list.push({ amountMist: reqAmt.toString(), ts: Math.floor(Date.now() / 1000) });
    claims[id] = list;
    saveClaims(claims);
    res.json({ ok: true, claimedMist: reqAmt.toString() });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

router.get("/api/slots", async (req, res) => {
  const { domainHash, size, website, sort } = req.query as any;
  const where: any = {};
  if (domainHash) where.domain_hash = String(domainHash); // legacy support
  if (size) {
    const [w, h] = String(size).toLowerCase().split("x");
    if (w && h) {
      where.width = Number(w);
      where.height = Number(h);
    }
  }
  const slotsRaw = await prisma.slot.findMany({ where });

  // Optional website host filter via pages map
  let slots = slotsRaw.map(serializeSlot);
  if (website) {
    const pages = loadPagesMap();
    const term = String(website || "").trim().toLowerCase();
    const filterHost = (() => {
      try {
        const u = new URL(term.startsWith('http') ? term : `https://${term}`);
        const h = u.hostname.toLowerCase();
        return h.startsWith('www.') ? h.slice(4) : h;
      } catch {
        return term.startsWith('www.') ? term.slice(4) : term;
      }
    })();
    slots = slots.filter((s) => {
      const url = pages[s.id] || '';
      try {
        const u = new URL(url);
        const h = u.hostname.toLowerCase();
        const host = h.startsWith('www.') ? h.slice(4) : h;
        return filterHost ? host.includes(filterHost) : true;
      } catch { return false; }
    });
  }

  // Sorting: price_desc (default), price_asc, newest, oldest
  const key = String(sort || 'price_desc');
  const byBigInt = (v: any) => {
    try { return BigInt(v ?? '0'); } catch { return 0n; }
  };
  const byNum = (v: any) => Number(v ?? 0);
  slots.sort((a: any, b: any) => {
    switch (key) {
      case 'price_asc': return byBigInt(a.last_price) < byBigInt(b.last_price) ? -1 : byBigInt(a.last_price) > byBigInt(b.last_price) ? 1 : 0;
      case 'newest': return byNum(b.created_at) - byNum(a.created_at);
      case 'oldest': return byNum(a.created_at) - byNum(b.created_at);
      case 'price_desc':
      default:
        return byBigInt(b.last_price) < byBigInt(a.last_price) ? -1 : byBigInt(b.last_price) > byBigInt(a.last_price) ? 1 : 0;
    }
  });

  res.json(slots.slice(0, 50));
});

router.get("/api/publisher/:addr/slots", async (req, res) => {
  const { addr } = req.params;
  const slots = await prisma.slot.findMany({ where: { publisher: addr }, orderBy: { created_at: "desc" } });
  res.json(slots.map(serializeSlot));
});

// Save page URL mapping for a slot (no auth for MVP)
router.post('/api/slot/:id/page', express.json(), async (req, res) => {
  try {
    const { id } = req.params;
    const { pageUrl } = req.body as { pageUrl?: string };
    const pages = loadPagesMap();
    if (pageUrl) pages[id] = String(pageUrl);
    else delete (pages as any)[id];
    savePagesMap(pages);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

router.get('/api/wallet/:addr/overview', async (req, res) => {
  try {
    const rawAddr = String(req.params.addr || '').trim();
    if (!rawAddr) return res.status(400).json({ error: 'addr required' });
    const normalized = rawAddr.toLowerCase().startsWith('0x') ? rawAddr.toLowerCase() : `0x${rawAddr.toLowerCase()}`;

    const [purchasedSlots, createdSlots] = await Promise.all([
      prisma.slot.findMany({ where: { current_renter: normalized }, orderBy: { last_price: 'desc' } }),
      prisma.slot.findMany({ where: { publisher: normalized }, orderBy: { created_at: 'desc' } }),
    ]);

    const purchasedIds = purchasedSlots.map((s) => s.id);
    const createdIds = createdSlots.map((s) => s.id);
    const allSlotIds = Array.from(new Set([...purchasedIds, ...createdIds]));

    const [eventRecordsPurchased, eventRecordsCreated] = await Promise.all([
      purchasedIds.length
        ? prisma.event.findMany({
            where: { slot_id: { in: purchasedIds }, type: { in: ['Rented', 'BuyoutLocked'] } },
            orderBy: { ts: 'desc' },
          })
        : Promise.resolve([]),
      createdIds.length
        ? prisma.event.findMany({
            where: { slot_id: { in: createdIds }, type: { in: ['Rented', 'BuyoutLocked'] } },
            orderBy: { ts: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const pages = loadPagesMap();
    const viewStats = loadViewStats(allSlotIds);

    const purchasedGrouped = new Map<string, typeof eventRecordsPurchased>();
    for (const ev of eventRecordsPurchased) {
      const list = purchasedGrouped.get(ev.slot_id) || [];
      list.push(ev);
      purchasedGrouped.set(ev.slot_id, list);
    }

    const createdGrouped = new Map<string, typeof eventRecordsCreated>();
    for (const ev of eventRecordsCreated) {
      const list = createdGrouped.get(ev.slot_id) || [];
      list.push(ev);
      createdGrouped.set(ev.slot_id, list);
    }

    const purchasedSummaries = purchasedSlots.map((slot) => {
      const events = purchasedGrouped.get(slot.id) || [];
      let lastRental: any = null;
      for (const ev of events) {
        const data = parseEventData(ev.data);
        const renter = toAddress(data.renter ?? data.new_renter);
        if (renter.toLowerCase() !== normalized) continue;
        const price = toBigInt(data.price ?? data.amount ?? 0);
        const expiry = toNumber(data.expiry ?? data.lock_until ?? slot.rental_expiry ?? 0);
        lastRental = {
          type: ev.type,
          ts: Number(ev.ts ?? 0n),
          priceMist: price.toString(),
          expiry,
        };
        break;
      }
      const stats = viewStats[slot.id] || { views: 0, totalDurationMs: 0, maxPctSum: 0 };
      return {
        slot: serializeSlot(slot),
        pageUrl: pages[slot.id] || null,
        viewStats: {
          views: stats.views,
          totalDurationMs: stats.totalDurationMs,
          avgMaxViewPct: stats.views ? stats.maxPctSum / stats.views : 0,
        },
        lastRental,
      };
    });

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    let totalRevenue = 0n;
    let pendingRevenue = 0n;
    const revenueBySlot: Record<string, bigint> = {};
    const pendingBySlot: Record<string, bigint> = {};

    for (const ev of eventRecordsCreated) {
      const data = parseEventData(ev.data);
      if (ev.type === 'Rented') {
        const price = toBigInt(data.price);
        totalRevenue += price;
        revenueBySlot[ev.slot_id] = (revenueBySlot[ev.slot_id] ?? 0n) + price;
      } else if (ev.type === 'BuyoutLocked') {
        const amount = toBigInt(data.amount);
        totalRevenue += amount;
        revenueBySlot[ev.slot_id] = (revenueBySlot[ev.slot_id] ?? 0n) + amount;
        const lockUntil = toBigInt(data.lock_until ?? 0);
        if (lockUntil > nowSec) {
          pendingRevenue += amount;
          pendingBySlot[ev.slot_id] = (pendingBySlot[ev.slot_id] ?? 0n) + amount;
        }
      }
    }

    const createdSummaries = createdSlots.map((slot) => {
      const events = createdGrouped.get(slot.id) || [];
      const stats = viewStats[slot.id] || { views: 0, totalDurationMs: 0, maxPctSum: 0 };
      let latestRental: any = null;
      for (const ev of events) {
        const data = parseEventData(ev.data);
        const renter = toAddress(data.renter ?? data.new_renter);
        const price = toBigInt(data.price ?? data.amount ?? 0);
        const expiry = toNumber(data.expiry ?? data.lock_until ?? slot.rental_expiry ?? 0);
        latestRental = {
          type: ev.type,
          renter,
          ts: Number(ev.ts ?? 0n),
          priceMist: price.toString(),
          expiry,
        };
        break;
      }
      return {
        slot: serializeSlot(slot),
        pageUrl: pages[slot.id] || null,
        viewStats: {
          views: stats.views,
          totalDurationMs: stats.totalDurationMs,
          avgMaxViewPct: stats.views ? stats.maxPctSum / stats.views : 0,
        },
        revenueMist: (revenueBySlot[slot.id] ?? 0n).toString(),
        pendingMist: (pendingBySlot[slot.id] ?? 0n).toString(),
        latestRental,
      };
    });

    const totalViewsPurchased = purchasedSummaries.reduce((acc, s) => acc + (s.viewStats.views || 0), 0);
    const totalViewsCreated = createdSummaries.reduce((acc, s) => acc + (s.viewStats.views || 0), 0);
    const depositedRevenue = totalRevenue > pendingRevenue ? totalRevenue - pendingRevenue : 0n;

    res.json({
      wallet: normalized,
      purchased: {
        totalSlots: purchasedSummaries.length,
        totalViews: totalViewsPurchased,
        slots: purchasedSummaries,
      },
      created: {
        totalSlots: createdSummaries.length,
        totalViews: totalViewsCreated,
        totalRevenueMist: totalRevenue.toString(),
        pendingRevenueMist: pendingRevenue.toString(),
        depositedRevenueMist: depositedRevenue.toString(),
        slots: createdSummaries,
      },
    });
  } catch (err) {
    console.error('wallet overview error', err);
    res.status(500).json({ error: 'failed' });
  }
});

router.post("/api/walrus/upload", upload.single("file"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "file required" });
    const buf = fs.readFileSync(f.path);
    const sha = crypto.createHash("sha256").update(buf).digest("hex");
    const imgCid = `mock://sha256-${sha}`;

    // Create a basic meta alongside for convenience
    const meta = {
      slot_id: req.body.slotId || "",
      img_cid: imgCid,
      landing_url: req.body.landingUrl || "https://example.com",
      checksum: `sha256:${sha}`,
      policy_sig: req.body.policySig || "0x",
      width: Number(req.body.width || 300),
      height: Number(req.body.height || 250),
      updated_at: Math.floor(Date.now() / 1000),
    };
    const metaStr = JSON.stringify(meta);
    const msha = crypto.createHash("sha256").update(metaStr).digest("hex");
    const metaCid = `mock://sha256-${msha}`;
    const metaDir = path.join(process.cwd(), "indexer", "uploads");
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, `${msha}.json`), metaStr);
    // Also store the image under a deterministic name matching the mock CID path the SDK will request
    const imgOut = path.join(metaDir, `sha256-${sha}`);
    if (!fs.existsSync(imgOut)) fs.copyFileSync(f.path, imgOut);

    res.json({ imgCid, metaCid, meta });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "upload failed" });
  }
});

// Create a default HTML creative meta for a slot (no image required)
router.post("/api/creative/default", express.json(), async (req, res) => {
  try {
    const { slotId, width, height, landingUrl, title, subtitle, bg } = req.body as any;
    if (!slotId) return res.status(400).json({ error: "slotId required" });
    const w = Number(width || 300);
    const h = Number(height || 250);
    const t = String(title || 'Aquads');
    const st = String(subtitle || 'Fast. Simple Ads. Powered by SUI');
    const meta = {
      slot_id: slotId,
      type: 'html',
      title: t,
      subtitle: st,
      bg: typeof bg === 'string' ? bg : 'linear-gradient(135deg,#0ea5e9,#7c3aed)',
      landing_url: String(landingUrl || 'https://example.com'),
      checksum: 'sha256:' + crypto.createHash('sha256').update(`${slotId}:${t}:${st}:${w}x${h}`).digest('hex'),
      width: w,
      height: h,
      updated_at: Math.floor(Date.now() / 1000),
    } as any;
    const metaStr = JSON.stringify(meta);
    const msha = crypto.createHash('sha256').update(metaStr).digest('hex');
    const metaCid = `mock://sha256-${msha}`;
    const metaDir = path.join(process.cwd(), 'indexer', 'uploads');
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, `${msha}.json`), metaStr);
    res.json({ ok: true, metaCid, meta });
  } catch (e) {
    console.error('default creative error', e);
    res.status(500).json({ error: 'default creative failed' });
  }
});

router.post("/api/creative/anchor", express.json(), async (req, res) => {
  try {
    const { slotId, metaCid, checksum } = req.body as { slotId: string; metaCid: string; checksum: string };
    if (!slotId || !metaCid) return res.status(400).json({ error: "missing params" });
    const client: SuiClient = getClient();
    await ensureSharedObject(client, slotId);
    const kp = keypairFromEnv(process.env.ADVERTISER_PRIVATE_KEY || "ed25519:");
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE_NAME || "ad_market"}::update_creative`,
      arguments: [
        tx.object(slotId),
        tx.pure(Array.from(Buffer.from(metaCid))),
        tx.pure(Array.from(Buffer.from(checksum))),
      ],
    });
    const result = await client.signAndExecuteTransactionBlock({ signer: kp, transactionBlock: tx, options: { showEffects: true, showEvents: true } });
    // Optimistically update DB so preview works immediately
    const meta = readMetaFromCid(metaCid);
    const updateData: any = { latest_meta_cid: metaCid };
    if (meta && typeof meta.width === "number" && typeof meta.height === "number") {
      updateData.width = meta.width;
      updateData.height = meta.height;
    }
    await prisma.slot.update({ where: { id: slotId }, data: updateData }).catch(() => {});
    res.json({ ok: true, result });
  } catch (e) {
    console.error("anchor error", e);
    res.status(500).json({ error: "anchor failed", message: (e as any)?.message || String(e) });
  }
});

// Optional click tracking stub
router.post("/api/track/click", express.json(), async (req, res) => {
  res.json({ ok: true });
});

// Viewability tracking (Active View-like)
router.post("/api/track/view", express.json(), async (req, res) => {
  try {
    const { slotId, maxPct, durationMs, ts } = req.body as { slotId: string; maxPct: number; durationMs: number; ts?: number };
    if (!slotId) return res.status(400).json({ error: "slotId required" });
    // For MVP, just log to stdout and a simple file
    const line = JSON.stringify({ type: 'view', slotId, maxPct, durationMs, ts: ts || Date.now() });
    const logDir = path.join(process.cwd(), 'indexer', 'uploads');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'views.log'), line + "\n");
    res.json({ ok: true });
  } catch (e) {
    console.error('view track error', e);
    res.status(500).json({ error: 'track failed' });
  }
});

// Snapshot: create snapshots via headless render, hash, manifest, walrus-mock
router.post("/api/snapshot", express.json(), async (req, res) => {
  try {
    const { url, slotId, anchor } = req.body as { url: string; slotId?: string; anchor?: boolean };
    if (!url) return res.status(400).json({ error: "url required" });
    const snap = await snapshotUrlDynamic(url, { slotId });
    const result: any = { ok: true, snapshot: snap };
    if (anchor && slotId) {
      const client: SuiClient = getClient();
      const kp = keypairFromEnv(process.env.ADVERTISER_PRIVATE_KEY || "ed25519:");
      const tx = new TransactionBlock();
      tx.moveCall({
        target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE_NAME || "ad_market"}::update_creative`,
        arguments: [
          tx.object(slotId),
          tx.pure(Array.from(Buffer.from(snap.blobId))),
          tx.pure(Array.from(Buffer.from(`sha256:${snap.manifestSha256}`))),
        ],
      });
      result.anchor = await client.signAndExecuteTransactionBlock({ signer: kp, transactionBlock: tx, options: { showEvents: true, showEffects: true } });
    }
    res.json(result);
  } catch (e: any) {
    console.error("snapshot error", e);
    res.status(500).json({ error: "snapshot failed", message: e?.message || String(e) });
  }
});

// Snapshot verify: re-run snapshot and report deltas / policy checks
router.post("/api/snapshot/verify", express.json(), async (req, res) => {
  try {
    const { url, slotId } = req.body as { url: string; slotId?: string };
    if (!url) return res.status(400).json({ error: "url required" });
    const snap = await snapshotUrlDynamic(url, { slotId });
    res.json({ ok: snap.adSlotVisible, snapshot: snap });
  } catch (e: any) {
    console.error("verify error", e);
    res.status(500).json({ error: "verify failed", message: e?.message || String(e) });
  }
});

// Transactions (server-signed for MVP)
router.post("/api/tx/createSlot", express.json(), async (req, res) => {
  try {
    const { width, height, domainHash, reservePrice, pageUrl } = req.body as {
      width: number;
      height: number;
      domainHash: string; // hex string or utf8
      reservePrice: string | number;
      pageUrl?: string;
    };
    const client = getClient();
    const kp = keypairFromEnv(process.env.PUBLISHER_PRIVATE_KEY || "ed25519:");
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE_NAME || "ad_market"}::create_slot`,
      arguments: [
        // &signer is implicit
        tx.pure(width),
        tx.pure(height),
        tx.pure(Array.from(Buffer.from(domainHash.replace(/^0x/, ""), "hex"))),
        tx.pure(String(reservePrice)),
      ],
    });
    const result = await client.signAndExecuteTransactionBlock({ signer: kp, transactionBlock: tx, options: { showEvents: true, showEffects: true, showObjectChanges: true } as any });
    // Try to extract created AdSlot object id from objectChanges
    const changes = (result as any).objectChanges || [];
    const createdSlot = changes.find((c: any) => c.type === 'created' && typeof c.objectType === 'string' && c.objectType.endsWith('::AdSlot'));
    const slotId = createdSlot?.objectId || null;
    // Optimistically upsert slot so UI updates immediately with proper metadata including reserve_price
    if (slotId) {
      await upsertSlot({
        id: slotId,
        publisher: createdSlot.sender || "",
        width: Number(req.body.width),
        height: Number(req.body.height),
        domain_hash: String(req.body.domainHash),
        reserve_price: BigInt(String(req.body.reservePrice || "0")),
        created_at: BigInt(Math.floor(Date.now() / 1000)),
      });
      if (pageUrl) {
        const pages = loadPagesMap();
        pages[slotId] = String(pageUrl);
        savePagesMap(pages);
      }
    }
    res.json({ ok: true, slotId, result });
  } catch (e: any) {
    console.error("createSlot error", e);
    res.status(500).json({ error: "createSlot failed", message: e?.message || String(e) });
  }
});

// Resolve created AdSlot ID from a transaction digest
router.get('/api/tx/resolveSlotId/:digest', async (req, res) => {
  try {
    const { digest } = req.params as { digest: string };
    if (!digest) return res.status(400).json({ error: 'digest required' });
    const client = getClient();
    const txd: any = await client.getTransactionBlock({ digest, options: { showObjectChanges: true, showEffects: true, showEvents: true } as any });
    let slotId: string | null = null;
    const oc: any[] = (txd as any).objectChanges || [];
    const createdSlot = oc.find((c: any) => c.type === 'created' && typeof c.objectType === 'string' && c.objectType.endsWith('::AdSlot'));
    slotId = createdSlot?.objectId || null;
    if (!slotId) {
      const evs: any[] = (txd as any).events || [];
      const sc = evs.find((e: any) => typeof e.type === 'string' && e.type.endsWith('::SlotCreated') && e.parsedJson?.slot);
      slotId = sc?.parsedJson?.slot || null;
    }
    if (!slotId) {
      const effCreated: any[] = (txd as any).effects?.created || [];
      slotId = effCreated[0]?.reference?.objectId || null;
    }
    res.json({ slotId, tx: { digest, hasObjectChanges: Boolean((txd as any).objectChanges), hasEvents: Boolean((txd as any).events) } });
  } catch (e: any) {
    res.status(500).json({ error: 'resolve failed', message: e?.message || String(e) });
  }
});

router.post("/api/tx/bid", express.json(), async (req, res) => {
  try {
    const { slotId, amount } = req.body as { slotId: string; amount: string | number };
    const client = getClient();
    await ensureSharedObject(client, slotId);
    const kp = keypairFromEnv(process.env.ADVERTISER_PRIVATE_KEY || "ed25519:");
    const tx = new TransactionBlock();
    const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))]);
    tx.moveCall({
      target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE_NAME || "ad_market"}::bid`,
      arguments: [tx.object(slotId), pay],
    });
    const result = await client.signAndExecuteTransactionBlock({ signer: kp, transactionBlock: tx, options: { showEvents: true, showEffects: true } });
    res.json({ ok: true, result });
  } catch (e: any) {
    console.error("bid error", e);
    res.status(500).json({ error: "bid failed", message: e?.message || String(e) });
  }
});

router.post("/api/tx/lock", express.json(), async (req, res) => {
  try {
    const { slotId, amount, lockSecs } = req.body as { slotId: string; amount: string | number; lockSecs: number };
    const client = getClient();
    await ensureSharedObject(client, slotId);
    const kp = keypairFromEnv(process.env.ADVERTISER_PRIVATE_KEY || "ed25519:");
    const tx = new TransactionBlock();
    const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))]);
    tx.moveCall({
      target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE_NAME || "ad_market"}::lock_rental`,
      arguments: [tx.object(slotId), pay, tx.pure(lockSecs)],
    });
    const result = await client.signAndExecuteTransactionBlock({ signer: kp, transactionBlock: tx, options: { showEvents: true, showEffects: true } });
    res.json({ ok: true, result });
  } catch (e: any) {
    console.error("lock error", e);
    res.status(500).json({ error: "lock failed", message: e?.message || String(e) });
  }
});
