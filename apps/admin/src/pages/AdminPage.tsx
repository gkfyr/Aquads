import { useEffect, useMemo, useState } from "react";
 
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import NavBar from '../components/NavBar';

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function AdminPage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [filters, setFilters] = useState({ domainHash: "", size: "" });
  const [createForm, setCreateForm] = useState({
    width: "300",
    height: "250",
    domainHash: "",
    reservePrice: "100000000",
  });
  const [txResult, setTxResult] = useState<any>(null);
  const [createUpload, setCreateUpload] = useState<{ file: File | null; landingUrl: string }>(() => ({
    file: null,
    landingUrl: "https://example.com",
  }));
  const [preview, setPreview] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [previewSrc, setPreviewSrc] = useState("http://localhost:5174");
  const [pageUrl, setPageUrl] = useState("");
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [cfg, setCfg] = useState<{ packageId: string; moduleName: string; protocolId?: string } | null>(null);

  function normalizeHost(host: string) {
    try {
      let h = host.trim().toLowerCase();
      if (h.startsWith("www.")) h = h.slice(4);
      return h;
    } catch {
      return host;
    }
  }

  async function sha256Hex(input: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Browser-safe helpers (avoid Node Buffer)
  function hexToBytes(hex: string): number[] {
    const clean = hex.replace(/^0x/, '').toLowerCase();
    const out: number[] = [];
    for (let i = 0; i < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16));
    return out;
  }
  function strToBytes(s: string): number[] {
    return Array.from(new TextEncoder().encode(s));
  }

  async function autofillDomainHashFromUrl() {
    try {
      const u = new URL(pageUrl);
      const host = normalizeHost(u.hostname);
      const hex = await sha256Hex(host);
      setCreateForm((f) => ({ ...f, domainHash: `0x${hex}` }));
    } catch {
      // ignore invalid URL
    }
  }

  const reload = async (attempt = 1) => {
    try {
      const qs = new URLSearchParams();
      if (filters.domainHash) qs.set("domainHash", filters.domainHash);
      if (filters.size) qs.set("size", filters.size);
      const data = await j<any[]>(`/api/slots?${qs.toString()}`);
      setSlots(data);
    } catch (e) {
      if (attempt < 5) setTimeout(() => reload(attempt + 1), 1000);
    }
  };

  useEffect(() => {
    reload();
    j('/api/config').then((c: any) => setCfg({ packageId: c.packageId, moduleName: c.moduleName, protocolId: c.protocolId || '' })).catch(() => {});
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUpload.file) {
      alert("Please select a creative image to upload");
      return;
    }
    if (!cfg) { alert('Config not loaded'); return; }
    // Build and sign create_slot
    const width = Number(createForm.width || '0');
    const height = Number(createForm.height || '0');
    const domainHash = (createForm.domainHash || '').replace(/^0x/, '');
    const reservePrice = String(createForm.reservePrice || '0');
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${cfg.packageId}::${cfg.moduleName}::create_slot`,
      arguments: [
        tx.pure(width),
        tx.pure(height),
        tx.pure(hexToBytes(domainHash)),
        tx.pure(reservePrice),
      ],
    });
    const res = await signAndExecute({
      transaction: tx.serialize(),
      options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });
    setTxResult(res as any);
    let slotId: string | null = null;
    const changes: any[] = ((res as any).objectChanges) || ((res as any).effects?.objectChanges) || [];
    const createdSlot = changes.find((c: any) => c.type === 'created' && typeof c.objectType === 'string' && c.objectType.endsWith('::AdSlot'));
    slotId = createdSlot?.objectId || null;
    if (slotId && pageUrl) {
      await j(`/api/slot/${slotId}/page`, { method: 'POST', body: JSON.stringify({ pageUrl }) }).catch(() => {});
    }
    setTimeout(reload, 1000);
    if (slotId && createUpload.file) {
      const form = new FormData();
      form.set("file", createUpload.file);
      form.set("slotId", slotId);
      form.set("landingUrl", createUpload.landingUrl);
      form.set("width", String(Number(createForm.width || "0")));
      form.set("height", String(Number(createForm.height || "0")));
      const r = await fetch("/api/walrus/upload", { method: "POST", body: form });
      const data = await r.json();
      // Anchor via wallet
      const tx2 = new TransactionBlock();
      tx2.moveCall({
        target: `${cfg.packageId}::${cfg.moduleName}::update_creative`,
        arguments: [
          tx2.object(slotId),
          tx2.pure(strToBytes(data.metaCid)),
          tx2.pure(strToBytes(data.meta.checksum)),
        ],
      });
      const anc = await signAndExecute({
        transaction: tx2.serialize(),
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
      });
      setTxResult({ create: res, upload: data, anchor: anc });
      setTimeout(reload, 1000);
    }
    if (slotId) setPreviewSrc(`http://localhost:5174?slotId=${slotId}`);
  };

  const onBid = async (slotId: string) => {
    const s = slots.find((x) => x.id === slotId);
    let suggested = "0";
    if (s) {
      const last = BigInt(s.last_price || "0");
      const reserve = BigInt(s.reserve_price || "0");
      const base = last === 0n ? reserve : last;
      const min = base + (base * 10n) / 100n;
      suggested = min.toString();
    }
    const amount = prompt("Bid amount in mist (>= min required)", suggested || undefined);
    if (!amount) return;
    if (!cfg) { alert('Config not loaded'); return; }
    const tx = new TransactionBlock();
    const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))]);
    if (cfg.protocolId) {
      tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::bid_with_protocol`, arguments: [tx.object(cfg.protocolId), tx.object(slotId), pay] });
    } else {
      tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::bid`, arguments: [tx.object(slotId), pay] });
    }
    const res = await signAndExecute({
      transaction: tx.serialize(),
      options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });
    setTxResult(res);
    setTimeout(reload, 1000);
  };

  const onLock = async (slotId: string) => {
    const amount = prompt("Lock amount (mist)");
    const secs = prompt("Lock seconds (e.g., 3600)");
    if (!amount || !secs) return;
    if (!cfg) { alert('Config not loaded'); return; }
    const tx = new TransactionBlock();
    const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))]);
    if (cfg.protocolId) {
      tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::lock_rental_with_protocol`, arguments: [tx.object(cfg.protocolId), tx.object(slotId), pay, tx.pure(Number(secs))] });
    } else {
      tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::lock_rental`, arguments: [tx.object(slotId), pay, tx.pure(Number(secs))] });
    }
    const res = await signAndExecute({
      transaction: tx.serialize(),
      options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });
    setTxResult(res);
    setTimeout(reload, 1000);
  };

  const onUpload = async (slotId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const landingUrl = prompt("Landing URL", "https://example.com") || "https://example.com";
      const width = prompt("Width", "300") || "300";
      const height = prompt("Height", "250") || "250";
      const form = new FormData();
      form.set("file", file);
      form.set("slotId", slotId);
      form.set("landingUrl", landingUrl);
      form.set("width", width);
      form.set("height", height);
      const r = await fetch("/api/walrus/upload", { method: "POST", body: form });
      const data = await r.json();
      setTxResult({ upload: data });
      if (!cfg) { alert('Config not loaded'); return; }
      const tx2 = new TransactionBlock();
      tx2.moveCall({
        target: `${cfg.packageId}::${cfg.moduleName}::update_creative`,
        arguments: [
          tx2.object(slotId),
          tx2.pure(strToBytes(data.metaCid)),
          tx2.pure(strToBytes(data.meta.checksum)),
        ],
      });
      const anc = await signAndExecute({
        transaction: tx2.serialize(),
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
      });
      setTxResult(anc);
      setTimeout(reload, 1000);
    };
    input.click();
  };

  const onPreview = async (slotId: string) => {
    try {
      const data = await j<any>(`/api/slot/${slotId}/creative/current`);
      setPreview({ open: true, data });
    } catch (e) {
      setPreview({ open: true, data: { error: "No creative or failed to fetch" } });
    }
  };

  const onHistory = async (slotId: string) => {
    try {
      const list = await j<any[]>(`/api/slot/${slotId}/creatives`);
      setHistoryList(list);
      setHistoryOpen(true);
    } catch (e) {
      setHistoryList([]);
      setHistoryOpen(true);
    }
  };

  return (
    <div className="min-h-full font-[Inter]">
      <NavBar />
      <main className="mx-auto max-w-7xl px-6 py-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 card p-5">
          <h2 className="text-base font-semibold mb-4">Create Slot</h2>
          <form onSubmit={onCreate} className="space-y-3">
            <div>
              <label className="label">Width</label>
              <input
                className="input"
                inputMode="numeric"
                placeholder="e.g. 300"
                value={createForm.width}
                onChange={(e) => setCreateForm({ ...createForm, width: e.target.value.replace(/[^0-9]/g, "") })}
              />
            </div>
            <div>
              <label className="label">Height</label>
              <input
                className="input"
                inputMode="numeric"
                placeholder="e.g. 250"
                value={createForm.height}
                onChange={(e) => setCreateForm({ ...createForm, height: e.target.value.replace(/[^0-9]/g, "") })}
              />
            </div>
            <div>
              <label className="label">Page URL (auto-fills domain hash)</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="https://example.com/article"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  onBlur={autofillDomainHashFromUrl}
                />
                <button className="btn-outline" type="button" onClick={autofillDomainHashFromUrl}>
                  Auto-fill
                </button>
              </div>
            </div>
            <div>
              <label className="label">Domain Hash (auto)</label>
              <input className="input" placeholder="0x..." value={createForm.domainHash} readOnly disabled />
            </div>
            <div>
              <label className="label">Reserve Price (mist)</label>
              <input
                className="input"
                inputMode="numeric"
                placeholder="mist"
                value={createForm.reservePrice}
                onChange={(e) => setCreateForm({ ...createForm, reservePrice: e.target.value.replace(/[^0-9]/g, "") })}
              />
            </div>
            <div className="pt-2">
              <div className="mt-2 space-y-2">
                <div>
                  <label className="label">Creative Image</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCreateUpload((c) => ({ ...c, file: e.target.files?.[0] || null }))}
                  />
                </div>
                <div>
                  <label className="label">AD redirect URL</label>
                  <input
                    className="input"
                    value={createUpload.landingUrl}
                    onChange={(e) => setCreateUpload((c) => ({ ...c, landingUrl: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn-primary" type="submit">
                Create
              </button>
              <button className="btn-outline" type="button" onClick={reload}>
                Refresh
              </button>
            </div>
          </form>
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Preview</h3>
            <div className="rounded-lg overflow-hidden border border-slate-200">
              <iframe className="w-full" style={{ height: 340 }} src={previewSrc} />
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Slots</h2>
            <div className="flex gap-2">
              <input
                className="input w-48"
                placeholder="domain hash"
                value={filters.domainHash}
                onChange={(e) => setFilters({ ...filters, domainHash: e.target.value })}
              />
              <input
                className="input w-36"
                placeholder="size WxH"
                value={filters.size}
                onChange={(e) => setFilters({ ...filters, size: e.target.value })}
              />
              <button className="btn-outline" onClick={reload}>
                Search
              </button>
            </div>
          </div>
          <div className="grid gap-3">
            {slots.map((s) => (
              <div key={s.id} className="surface rounded-lg p-4 hover:shadow-card transition">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">
                      {s.width}×{s.height}
                    </div>
                    <div className="font-mono text-xs break-all text-slate-200">{s.id}</div>
                  </div>
                  <div className="text-sm text-slate-300">
                    last: {s.last_price} • renter: {s.current_renter || "-"}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-outline" onClick={() => onBid(s.id)}>
                      Bid
                    </button>
                    <button className="btn-outline" onClick={() => onLock(s.id)}>
                      Lock
                    </button>
                    <button className="btn-primary" onClick={() => onUpload(s.id)}>
                      Upload + Anchor
                    </button>
                    <button className="btn-outline" onClick={() => onPreview(s.id)}>
                      Preview
                    </button>
                    <button className="btn-outline" onClick={() => onHistory(s.id)}>
                      History
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => setPreviewSrc(`http://localhost:5174?slotId=${s.id}`)}
                    >
                      Use in Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {slots.length === 0 && <div className="text-sm text-slate-400">No slots yet</div>}
          </div>

          {txResult && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Transaction</div>
              <pre className="text-xs bg-black/60 border border-white/10 text-slate-100 p-3 rounded-lg overflow-auto max-h-60">
                {JSON.stringify(txResult, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </main>

      {/* Preview Modal */}
      {preview.open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setPreview({ open: false, data: null })}
        >
          <div className="card max-w-3xl w-full m-4 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Current Creative</div>
              <button className="btn-outline" onClick={() => setPreview({ open: false, data: null })}>
                Close
              </button>
            </div>
            {preview.data?.imgUrl ? (
              <div className="grid gap-3">
                <div className="w-full border border-slate-200 rounded overflow-hidden">
                  <img src={preview.data.imgUrl} alt="creative" className="w-full" />
                </div>
                <div className="text-sm">
                  <div>
                    metaCid: <code className="font-mono break-all">{preview.data.metaCid}</code>
                  </div>
                  {preview.data.metaUrl && (
                    <div>
                      metaUrl:{" "}
                      <a className="text-brand-600 underline" href={preview.data.metaUrl} target="_blank">
                        {preview.data.metaUrl}
                      </a>
                    </div>
                  )}
                  {preview.data.slot && (
                    <div className="text-slate-600">
                      {preview.data.slot.width}×{preview.data.slot.height}
                    </div>
                  )}
                </div>
                {preview.data.meta && (
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded max-h-56 overflow-auto">
                    {JSON.stringify(preview.data.meta, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-600">{preview.data?.error || "No creative found"}</div>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setHistoryOpen(false)}
        >
          <div className="card max-w-2xl w-full m-4 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Creative History</div>
              <button className="btn-outline" onClick={() => setHistoryOpen(false)}>
                Close
              </button>
            </div>
            <div className="grid gap-2">
              {historyList.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded p-2">
                  <div className="text-xs font-mono break-all">{h.metaCid}</div>
                  <div className="text-xs text-slate-500">{new Date((h.ts || 0) * 1000).toLocaleString()}</div>
                  {h.metaUrl && (
                    <a className="btn-outline" href={h.metaUrl} target="_blank">
                      Open meta
                    </a>
                  )}
                </div>
              ))}
              {historyList.length === 0 && <div className="text-sm text-slate-600">No history</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
