import type { SlotMeta } from "@aquads/shared/src/types";

let API_BASE = ""; // default same origin
export function setApiBase(base: string) {
  API_BASE = base || "";
}

export async function mount(el: HTMLElement, slotId: string) {
  const s = await fetch(`${API_BASE}/api/slot/${slotId}/current`).then((r) => r.json());
  const latest = s.latestMetaCid as string | null;
  if (!latest) {
    renderPlaceholder(el, "No creative yet");
    return;
  }
  const meta = await fetchWalrusJSON(latest);
  if (!verifySeal(meta)) {
    renderPlaceholder(el, "Rejected by policy");
    return;
  }
  enforceSize(el, meta.width, meta.height);

  const isHtml = (meta as any).type === 'html' || (!(meta as any).img_cid && ((meta as any).title || (meta as any).subtitle));
  if (isHtml) {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    const bg = (meta as any).bg || 'linear-gradient(135deg,#0ea5e9,#7c3aed)';
    container.style.background = bg;
    container.style.color = '#fff';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.textAlign = 'center';
    container.style.padding = '8px';
    const title = document.createElement('div');
    title.textContent = (meta as any).title || 'Aquads';
    title.style.font = '700 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    const subtitle = document.createElement('div');
    subtitle.textContent = (meta as any).subtitle || 'Fast. Simple Ads. Powered by SUI';
    subtitle.style.font = '12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    subtitle.style.opacity = '0.9';
    container.appendChild(title);
    if (subtitle.textContent) container.appendChild(subtitle);
    const hideLabel = (window as any).__AQUADS_HIDE_LABEL === true || (window as any).__SUI_AD_HIDE_LABEL === true;
    if (!hideLabel) {
      const badge = document.createElement('div');
      badge.textContent = 'Ad by Aquads';
      badge.style.position = 'absolute';
      badge.style.right = '6px';
      badge.style.bottom = '6px';
      badge.style.padding = '2px 6px';
      badge.style.font = '10px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
      badge.style.color = '#fff';
      badge.style.background = 'rgba(0,0,0,0.45)';
      badge.style.borderRadius = '4px';
      badge.style.pointerEvents = 'none';
      badge.style.userSelect = 'none';
      container.appendChild(badge);
    }
    // Slot ID label (bottom-left) — always show (shortened)
    const sid = document.createElement('div');
    const short = (id: string) => {
      const s = String(id || '');
      const clean = s.startsWith('0x') ? s.slice(2) : s;
      const head = clean.slice(0, 6);
      return '0x' + head + (clean.length > 6 ? '…' : '');
    };
    sid.textContent = slotId ? `Slot: ${short(String(slotId))}` : '';
    sid.style.position = 'absolute';
    sid.style.left = '6px';
    sid.style.bottom = '6px';
    sid.style.padding = '2px 6px';
    sid.style.font = '10px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    sid.style.color = '#fff';
    sid.style.background = 'rgba(0,0,0,0.35)';
    sid.style.borderRadius = '4px';
    sid.style.pointerEvents = 'none';
    sid.style.userSelect = 'none';
    sid.style.maxWidth = '70%';
    sid.style.whiteSpace = 'nowrap';
    sid.style.overflow = 'hidden';
    sid.style.textOverflow = 'ellipsis';
    if (sid.textContent) container.appendChild(sid);
    container.onclick = () => {
      try {
        fetch(`${API_BASE}/api/track/click`, { method: 'POST', body: JSON.stringify({ slotId, url: meta.landing_url }) }).catch(() => {});
      } catch {}
      if (meta.landing_url) window.location.href = meta.landing_url;
    };
    el.replaceChildren(container);
  } else {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.height = "100%";
    function renderImg(cid: string) {
      const img = new Image();
      img.src = walrusToHttp(cid);
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.onload = () => {
        img.onclick = () => {
          fetch(`${API_BASE}/api/track/click`, { method: "POST", body: JSON.stringify({ slotId, url: meta.landing_url }) }).catch(() => {});
          window.location.href = meta.landing_url;
        };
      };
      img.onerror = () => {
        renderPlaceholder(el, "Image failed to load");
      };
      container.replaceChildren(img);
    }
    renderImg((meta as any).img_cid);
    const hideLabel = (window as any).__AQUADS_HIDE_LABEL === true || (window as any).__SUI_AD_HIDE_LABEL === true;
    if (!hideLabel) {
      const badge = document.createElement("div");
      badge.textContent = "Ad by Aquads";
      badge.style.position = "absolute";
      badge.style.right = "6px";
      badge.style.bottom = "6px";
      badge.style.padding = "2px 6px";
      badge.style.font = "10px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
      badge.style.color = "#fff";
      badge.style.background = "rgba(0,0,0,0.45)";
      badge.style.borderRadius = "4px";
      badge.style.pointerEvents = "none";
      badge.style.userSelect = "none";
      container.appendChild(badge);
    }
    // Rotate creatives if multiple and unlocked (fetch meta -> img_cid)
    try {
      const list = await fetch(`${API_BASE}/api/slot/${slotId}/creatives`).then(r => r.json());
      const unlocked = !s.expiry || s.expiry === 0;
      const metas: string[] = Array.isArray(list) ? list.map((e: any) => String(e.metaCid || '')) : [];
      const imgs: string[] = [];
      // include current first
      if ((meta as any).img_cid) imgs.push((meta as any).img_cid);
      for (const mcid of metas) {
        try {
          const m = await fetchWalrusJSON(mcid);
          if (m && (m as any).img_cid && !imgs.includes((m as any).img_cid)) imgs.push((m as any).img_cid);
        } catch {}
      }
      let idx = 0;
      if (unlocked && imgs.length > 1) {
        setInterval(() => {
          idx = (idx + 1) % imgs.length;
          renderImg(imgs[idx]);
        }, 5000);
      }
    } catch {}
    el.replaceChildren(container);
  }
  // Start viewability tracking once creative is in DOM
  try {
    startViewability(el, { slotId });
  } catch {}
}

export function renderPlaceholder(el: HTMLElement, text: string) {
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;background:#f2f3f5;color:#666;border:1px dashed #ccc;width:100%;height:100%;font:12px sans-serif;">${text}</div>`;
}

export function enforceSize(el: HTMLElement, w: number, h: number) {
  const responsive = el.hasAttribute('data-responsive') || (el as any).dataset?.responsive === 'true';
  if (responsive) {
    el.style.width = '100%';
    (el.style as any).aspectRatio = `${w} / ${h}`;
    el.style.height = 'auto';
    return;
  }
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
}

export function walrusToHttp(cid: string) {
  if (cid.startsWith("mock://")) {
    // Local mock: return uploads path if meta or image present; here we just echo cid
    return `/uploads/${cid.replace(/^mock:\/\//, "")}`; // might not exist for images; used for demo
  }
  if (cid.startsWith("walrus://")) {
    return cid.replace("walrus://", (window as any).WALRUS_HTTP_GATEWAY || "https://walrus.testnet/ipfs/");
  }
  return cid;
}

export async function fetchWalrusJSON(metaCid: string): Promise<SlotMeta> {
  if (metaCid.startsWith("mock://sha256-")) {
    const id = metaCid.replace("mock://sha256-", "");
    return fetch(`/uploads/${id}.json`).then((r) => r.json());
  }
  const url = walrusToHttp(metaCid);
  return fetch(url).then((r) => r.json());
}

export function verifySeal(meta: SlotMeta): boolean {
  // MVP: mocked verification. Set window.__SEAL_DISABLE=true to bypass.
  const disabled = (window as any).__SEAL_DISABLE === true;
  if (disabled) return true;
  // Basic checksum format check
  return /^sha256:[0-9a-fA-F]{64}$/.test(meta.checksum);
}

declare global {
  interface Window {
    Aquads: any;
    SuiAds: any;
    __SEAL_DISABLE?: boolean;
    WALRUS_HTTP_GATEWAY?: string;
  }
}

// UMD export (provide both Aquads and legacy SuiAds aliases)
const __aquadsUMD = {
  mount: (el: HTMLElement | string, opts: { slotId?: string } = {}) => {
    const elem = typeof el === "string" ? (document.querySelector(el) as HTMLElement) : el;
    const slotId = opts.slotId || elem?.dataset?.slotId || document.currentScript?.getAttribute("data-slot") || "";
    if (!elem || !slotId) return;
    mount(elem, slotId);
  },
  setApiBase,
};
(window as any).Aquads = __aquadsUMD;
(window as any).SuiAds = __aquadsUMD;

// --- Viewability (Active View-like) ---
type ViewabilityOpts = { slotId: string; thresholdPct?: number; minDurationMs?: number };
export function startViewability(el: HTMLElement, opts: ViewabilityOpts) {
  const thresholdPct = opts.thresholdPct ?? 0.5; // 50%
  const minDurationMs = opts.minDurationMs ?? 1000; // 1s
  let visibleRatio = 0;
  let maxRatio = 0;
  let accumMs = 0;
  let lastTs = performance.now();
  let pageVisible = document.visibilityState === "visible";
  const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);

  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      visibleRatio = e.intersectionRatio;
      if (visibleRatio > maxRatio) maxRatio = visibleRatio;
    },
    { root: null, threshold: thresholds }
  );
  io.observe(el);

  const onVis = () => {
    pageVisible = document.visibilityState === "visible";
    lastTs = performance.now();
  };
  document.addEventListener("visibilitychange", onVis);

  const timer = setInterval(() => {
    const now = performance.now();
    const dt = now - lastTs;
    lastTs = now;
    if (pageVisible && visibleRatio >= thresholdPct) accumMs += dt;
    if (accumMs >= minDurationMs) {
      try {
        const payload = {
          slotId: opts.slotId,
          maxPct: Math.round(maxRatio * 100),
          durationMs: Math.round(accumMs),
          ts: Date.now(),
        };
        navigator.sendBeacon?.(
          `${API_BASE}/api/track/view`,
          new Blob([JSON.stringify(payload)], { type: "application/json" })
        ) ||
          fetch(`${API_BASE}/api/track/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      } catch {}
      cleanup();
    }
  }, 250);

  function cleanup() {
    clearInterval(timer);
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  }
  return { stop: cleanup };
}
