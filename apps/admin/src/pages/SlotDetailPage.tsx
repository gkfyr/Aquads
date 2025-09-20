import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { CopyIcon, ExternalLinkIcon } from "../components/icons";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function fmtSui(mistStr?: string | null) {
  try {
    const n = BigInt(mistStr || "0");
    const whole = n / 1000000000n;
    const frac = n % 1000000000n;
    const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr} SUI` : `${whole} SUI`;
  } catch {
    return "0 SUI";
  }
}

function fmtSuiApproxFromMistStr(mistStr?: string | null) {
  try {
    const n = BigInt(mistStr || '0');
    const whole = Number(n) / 1_000_000_000;
    return `${whole.toFixed(4)} SUI`;
  } catch { return '0 SUI'; }
}
function mistToSuiString(mistStr?: string | null) {
  try {
    const n = BigInt(mistStr || '0');
    const intPart = n / 1_000_000_000n;
    const frac = n % 1_000_000_000n;
    const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '');
    return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
  } catch { return '0'; }
}
function suiToMist(suiStr: string) {
  const s = (suiStr || '').trim();
  if (!s) return '0';
  if (!/^\d*(?:\.)?\d*$/.test(s)) throw new Error('Invalid SUI amount');
  const [intPart, fracPartRaw = ''] = s.split('.');
  const frac = (fracPartRaw + '000000000').slice(0, 9); // pad to 9
  const mist = BigInt(intPart || '0') * 1_000_000_000n + BigInt(frac || '0');
  return mist.toString();
}

function short(addr?: string | null) {
  if (!addr) return "-";
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function shortSlot(id?: string | null) {
  const s = id || "";
  const clean = s.startsWith("0x") ? s.slice(2) : s;
  const head = clean.slice(0, 6);
  return "0x" + head + (clean.length > 6 ? "…" : "");
}

function hostFromUrl(u?: string | null) {
  if (!u) return null;
  try {
    const url = new URL(u);
    const h = url.hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return null;
  }
}

function formatDateFromSeconds(sec?: number | null) {
  if (!sec) return "—";
  try {
    return new Date(Number(sec) * 1000).toLocaleDateString();
  } catch {
    return "—";
  }
}

function explorerUrl(network: string | undefined, addr: string | undefined) {
  if (!addr) return "#";
  const net = (network || "testnet").toLowerCase();
  const n = net.startsWith("main") ? "mainnet" : net.startsWith("dev") ? "devnet" : "testnet";
  return `https://suiscan.xyz/testnet/address/${addr}`;
}

export default function SlotDetailPage() {
  const { id = "" } = useParams();
  const [state, setState] = useState<any>(null);
  const [creative, setCreative] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();
  const [cfg, setCfg] = useState<{ packageId: string; moduleName: string; network?: string; protocolId?: string } | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseLanding, setPurchaseLanding] = useState("https://example.com");
  const [purchaseFile, setPurchaseFile] = useState<File | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const [detailError, setDetailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function load(attempt = 1) {
    try {
      setLoading(true)
      const s = await j<any>(`/api/slot/${id}/current`)
      setState(s)
      setDetailError(null)
      try { setCreative(await j<any>(`/api/slot/${id}/creative/current`)) } catch { setCreative(null) }
      try { setHistory(await j<any[]>(`/api/slot/${id}/creatives`)) } catch { setHistory([]) }
    } catch (e: any) {
      const msg = e?.message || 'Failed to load slot'
      setDetailError(msg)
      // Poll a few times — indexer may need a moment to ingest the event
      if (attempt < 5) setTimeout(() => load(attempt + 1), 1500)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load();
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setCfg({ packageId: c.packageId, moduleName: c.moduleName, network: c.network, protocolId: c.protocolId || '' }))
      .catch(() => {});
  }, [id]);

  function strToBytes(s: string): number[] {
    return Array.from(new TextEncoder().encode(s));
  }
  const minAmountMist = (() => {
    try {
      const last = BigInt(state?.lastPrice || '0');
      const reserve = BigInt(((state?.slot as any)?.reserve_price ?? '0'));
      let base = last === 0n ? reserve : last;
      // Fallback for brand new slot where reserve might be missing in indexer yet
      if (base === 0n) base = 10n; // enforce first-bid minimum 10 mist
      const min = base + (base * 10n) / 100n; // base + 10%
      return min.toString();
    } catch { return '10'; }
  })();
  const minAmountSui = mistToSuiString(minAmountMist);

  const onPurchaseWithCreative = () => {
    setPurchaseAmount(minAmountSui);
    setPurchaseLanding("https://example.com");
    setPurchaseFile(null);
    setPurchaseOpen(true);
  };

  const submitPurchase = async () => {
    try {
      if (!cfg) {
        alert("Config not loaded");
        return;
      }
      if (!purchaseFile) {
        alert("Please select an image");
        return;
      }
      const amountSui = String(purchaseAmount || "0");
      if (!/^\d*(?:\.)?\d*$/.test(amountSui)) {
        alert("Amount must be a number (SUI)");
        return;
      }
      const amount = suiToMist(amountSui);
      setPurchasing(true);
      // Upload image
      const form = new FormData();
      form.set("file", purchaseFile);
      form.set("slotId", String(id));
      form.set("landingUrl", purchaseLanding || "https://example.com");
      form.set("width", String(state?.slot?.width || 300));
      form.set("height", String(state?.slot?.height || 250));
      const uploadResp = await fetch("/api/walrus/upload", { method: "POST", body: form });
      if (!uploadResp.ok) {
        setPurchasing(false);
        alert("Upload failed");
        return;
      }
      const up = await uploadResp.json();
      // Bid (prefer with_protocol if available)
      const tx = new TransactionBlock();
      const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))]);
      if (cfg.protocolId) {
        tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::bid_with_protocol`, arguments: [tx.object(cfg.protocolId), tx.object(String(id)), pay] });
      } else {
        tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::bid`, arguments: [tx.object(String(id)), pay] });
      }
      await signAndExecute({ transaction: tx.serialize(), options: { showEffects: true } });
      // Anchor creative
      const tx2 = new TransactionBlock();
      tx2.moveCall({
        target: `${cfg.packageId}::${cfg.moduleName}::update_creative`,
        arguments: [tx2.object(String(id)), tx2.pure(strToBytes(up.metaCid)), tx2.pure(strToBytes(up.meta.checksum))],
      });
      await signAndExecute({ transaction: tx2.serialize(), options: { showEffects: true } });
      await load();
      setPurchaseOpen(false);
      setCompleteOpen(true);
    } catch (e: any) {
      alert(e?.message || "Failed to purchase");
    } finally {
      setPurchasing(false);
    }
  };

  const onVisit = () => {
    const pageUrl = state?.pageUrl as string | undefined;
    if (pageUrl) window.open(pageUrl, "_blank");
    else window.open(`http://localhost:5174?slotId=${id}`, "_blank");
  };

  return (
    <div className="min-h-full font-[Inter]">
      <NavBar />
      <main className="mx-auto max-w-5xl px-6 py-6 grid gap-6 lg:grid-cols-2">
        {!state && (
          <div className="lg:col-span-2 card p-4 text-sm">
            {loading ? 'Loading slot…' : detailError ? `Not found yet. ${detailError}` : 'Loading…'}
          </div>
        )}
        <section className="card overflow-hidden">
          <div className="aspect-video bg-white/5 flex items-center justify-center relative">
            {creative?.imgUrl ? (
              <img src={creative.imgUrl} className="w-full h-full object-cover" />
            ) : creative?.meta &&
              (creative.meta.type === "html" ||
                (!creative.meta.img_cid && (creative.meta.title || creative.meta.subtitle))) ? (
              <div
                className="w-full h-full flex items-center justify-center text-center text-white"
                style={{ background: creative.meta.bg || "linear-gradient(135deg,#0ea5e9,#7c3aed)" }}
              >
                <div className="px-2">
                  <div className="font-semibold" style={{ fontSize: 18 }}>
                    {creative.meta.title || "Aquads"}
                  </div>
                  {(creative.meta.subtitle || "Fast. Simple Ads. Powered by SUI") && (
                    <div className="opacity-90" style={{ fontSize: 12 }}>
                      {creative.meta.subtitle || "Fast. Simple Ads. Powered by SUI"}
                    </div>
                  )}
                </div>
                <div className="absolute right-1.5 bottom-1.5 text-[10px] px-1.5 py-0.5 bg-black/40 rounded">
                  Ad by Aquads
                </div>
                <div className="absolute left-1.5 bottom-1.5 text-[10px] px-1.5 py-0.5 bg-black/30 rounded font-mono max-w-[70%] truncate">{`Slot: ${shortSlot(
                  String(id)
                )}`}</div>
              </div>
            ) : (
              <img src="/placeholder.svg" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div className="text-slate-300">
              {state?.slot?.width}×{state?.slot?.height}
            </div>
            <div>
              Last price: <b>{fmtSui(state?.lastPrice)}</b>
            </div>
            <div>
              Advertiser:{" "}
              <span className="font-mono" title={state?.renter}>
                {short(state?.renter)}
              </span>
            </div>
            <div>
              Slot ID: <span className="font-mono break-all">{id}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button className="btn-primary" onClick={onPurchaseWithCreative}>Purchase</button>
              <button className="btn-outline" onClick={onVisit}>Visit website</button>
              {account?.address?.toLowerCase() === state?.slot?.publisher?.toLowerCase() && (
                <button className="btn-outline" onClick={async () => {
                  try {
                    if (!cfg) return;
                    const tx = new TransactionBlock();
                    tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::cancel_by_publisher`, arguments: [tx.object(String(id))] });
                    await signAndExecute({ transaction: tx.serialize(), options: { showEffects: true } });
                    await load();
                  } catch (e:any) { alert(e?.message || 'Cancel failed') }
                }}>Cancel (Publisher)</button>
              )}
              {account?.address?.toLowerCase() === state?.renter?.toLowerCase() && (
                <button className="btn-outline" onClick={async () => {
                  try {
                    if (!cfg) return;
                    const tx = new TransactionBlock();
                    tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::cancel_by_advertiser`, arguments: [tx.object(String(id))] });
                    await signAndExecute({ transaction: tx.serialize(), options: { showEffects: true } });
                    await load();
                  } catch (e:any) { alert(e?.message || 'Cancel failed') }
                }}>Cancel (Advertiser)</button>
              )}
            </div>
          </div>
        </section>
        <section className="card p-4">
          <div className="text-base font-semibold mb-3">Slot details</div>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-slate-400">Publisher</div>
              <div className="flex items-center gap-2">
                <a
                  className="font-mono text-xs text-brand-300 underline inline-flex items-center gap-1"
                  href={explorerUrl(cfg?.network, state?.slot?.publisher)}
                  target="_blank"
                  rel="noreferrer"
                  title={state?.slot?.publisher}
                >
                  {short(state?.slot?.publisher)}
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </a>
                <button
                  className="btn-outline"
                  title="Copy address"
                  onClick={() => {
                    const v = state?.slot?.publisher || "";
                    if (!v) return;
                    navigator.clipboard?.writeText(v).catch(() => {});
                  }}
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-400">Website</div>
              <div>
                {state?.pageUrl ? (
                  <a className="text-brand-300 underline" href={state?.pageUrl} target="_blank" rel="noreferrer">
                    {hostFromUrl(state?.pageUrl) || "open"}
                  </a>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-400">Size</div>
              <div>
                {state?.slot?.width}×{state?.slot?.height}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-400">Reserve</div>
              <div>{fmtSui(state?.slot?.reserve_price)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-400">Current price</div>
              <div>{fmtSui(state?.lastPrice)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-400">Created</div>
              <div>{formatDateFromSeconds(state?.slot?.created_at)}</div>
            </div>
            {state?.renter ? (
              <div className="flex items-center justify-between">
                <div className="text-slate-400">Expiry</div>
                <div>{formatDateFromSeconds(state?.expiry)}</div>
              </div>
            ) : null}
            {account?.address?.toLowerCase() === state?.slot?.publisher?.toLowerCase() && (
              <div className="flex items-center justify-between">
                <div className="text-slate-400">Actions</div>
                <div className="flex gap-2">
                  <button className="btn-outline" onClick={async () => {
                    try {
                      if (!cfg) return;
                      const tx = new TransactionBlock();
                      tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::reset_to_placeholder`, arguments: [tx.object(String(id))] });
                      await signAndExecute({ transaction: tx.serialize(), options: { showEffects: true } });
                      await load();
                    } catch (e:any) { alert(e?.message || 'Reset failed') }
                  }}>Reset creative</button>
                </div>
              </div>
            )}
          </div>
        </section>
        <section className="card p-4">
          <div className="text-base font-semibold mb-3">Created history</div>
          <div className="grid gap-2 text-sm">
            {history.map((h) => (
              <div key={h.id} className="surface rounded p-2">
                <div className="text-xs text-slate-400">{new Date((h.ts || 0) * 1000).toLocaleString()}</div>
              </div>
            ))}
            {history.length === 0 && <div className="text-slate-400">No history</div>}
          </div>
        </section>
      </main>
      {completeOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCompleteOpen(false)}>
          <div className="card max-w-md w-full m-4 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold mb-2">Completed</div>
            <div className="text-sm text-slate-300 mb-3">Purchase has been completed successfully.</div>
            <div className="flex gap-2">
              <a className="btn-primary" href={`http://localhost:5175?slotId=${id}`} target="_blank" rel="noreferrer">Open Blog Demo</a>
              <a className="btn-outline" href={`/wallet`} >Go to My Page</a>
              <button className="btn-outline" onClick={() => setCompleteOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {purchaseOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => !purchasing && setPurchaseOpen(false)}
        >
          <div className="card max-w-md w-full m-4 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Purchase with Creative</div>
              <button className="btn-outline" onClick={() => setPurchaseOpen(false)} disabled={purchasing}>
                Close
              </button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="label">Amount (SUI)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={minAmountSui}
                />
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>
                    Minimum required: <span className="text-slate-300 font-medium">{minAmountSui} SUI</span>
                  </span>
                  <button type="button" className="btn-outline !px-2 !py-1" onClick={() => setPurchaseAmount(minAmountSui)}>Use min</button>
                </div>
                {Number(state?.lastPrice || '0') === 0 && (
                  <div className="text-xs text-amber-300 mt-1">First bid hint: at least 0.000000010 SUI + 10%</div>
                )}
              </div>
              <div>
                <label className="label">Creative Image</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPurchaseFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="label">Landing URL</label>
                <input className="input" value={purchaseLanding} onChange={(e) => setPurchaseLanding(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <button className="btn-primary" onClick={submitPurchase} disabled={purchasing}>
                  {purchasing ? "Processing..." : "Purchase"}
                </button>
                <button className="btn-outline" onClick={() => setPurchaseOpen(false)} disabled={purchasing}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
