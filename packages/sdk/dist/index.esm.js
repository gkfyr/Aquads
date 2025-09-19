let API_BASE = ""; // default same origin
function setApiBase(base) {
    API_BASE = base || "";
}
async function mount(el, slotId) {
    const s = await fetch(`${API_BASE}/api/slot/${slotId}/current`).then((r) => r.json());
    const latest = s.latestMetaCid;
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
    const isHtml = meta.type === 'html' || (!meta.img_cid && (meta.title || meta.subtitle));
    if (isHtml) {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        const bg = meta.bg || 'linear-gradient(135deg,#0ea5e9,#7c3aed)';
        container.style.background = bg;
        container.style.color = '#fff';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.textAlign = 'center';
        container.style.padding = '8px';
        const title = document.createElement('div');
        title.textContent = meta.title || 'Aquads';
        title.style.font = '700 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
        const subtitle = document.createElement('div');
        subtitle.textContent = meta.subtitle || 'Fast. Simple Ads. Powered by SUI';
        subtitle.style.font = '12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
        subtitle.style.opacity = '0.9';
        container.appendChild(title);
        if (subtitle.textContent)
            container.appendChild(subtitle);
        const hideLabel = window.__AQUADS_HIDE_LABEL === true || window.__SUI_AD_HIDE_LABEL === true;
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
        const short = (id) => {
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
        if (sid.textContent)
            container.appendChild(sid);
        container.onclick = () => {
            try {
                fetch(`${API_BASE}/api/track/click`, { method: 'POST', body: JSON.stringify({ slotId, url: meta.landing_url }) }).catch(() => { });
            }
            catch (_a) { }
            if (meta.landing_url)
                window.location.href = meta.landing_url;
        };
        el.replaceChildren(container);
    }
    else {
        const img = new Image();
        img.src = walrusToHttp(meta.img_cid);
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        const container = document.createElement("div");
        container.style.position = "relative";
        container.style.width = "100%";
        container.style.height = "100%";
        container.appendChild(img);
        const hideLabel = window.__AQUADS_HIDE_LABEL === true || window.__SUI_AD_HIDE_LABEL === true;
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
        img.onload = () => {
            img.onclick = () => {
                fetch(`${API_BASE}/api/track/click`, {
                    method: "POST",
                    body: JSON.stringify({ slotId, url: meta.landing_url }),
                }).catch(() => { });
                window.location.href = meta.landing_url;
            };
        };
        img.onerror = () => {
            renderPlaceholder(el, "Image failed to load");
        };
        el.replaceChildren(container);
    }
    // Start viewability tracking once creative is in DOM
    try {
        startViewability(el, { slotId });
    }
    catch (_a) { }
}
function renderPlaceholder(el, text) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;background:#f2f3f5;color:#666;border:1px dashed #ccc;width:100%;height:100%;font:12px sans-serif;">${text}</div>`;
}
function enforceSize(el, w, h) {
    var _a;
    const responsive = el.hasAttribute('data-responsive') || ((_a = el.dataset) === null || _a === void 0 ? void 0 : _a.responsive) === 'true';
    if (responsive) {
        el.style.width = '100%';
        el.style.aspectRatio = `${w} / ${h}`;
        el.style.height = 'auto';
        return;
    }
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
}
function walrusToHttp(cid) {
    if (cid.startsWith("mock://")) {
        // Local mock: return uploads path if meta or image present; here we just echo cid
        return `/uploads/${cid.replace(/^mock:\/\//, "")}`; // might not exist for images; used for demo
    }
    if (cid.startsWith("walrus://")) {
        return cid.replace("walrus://", window.WALRUS_HTTP_GATEWAY || "https://walrus.testnet/ipfs/");
    }
    return cid;
}
async function fetchWalrusJSON(metaCid) {
    if (metaCid.startsWith("mock://sha256-")) {
        const id = metaCid.replace("mock://sha256-", "");
        return fetch(`/uploads/${id}.json`).then((r) => r.json());
    }
    const url = walrusToHttp(metaCid);
    return fetch(url).then((r) => r.json());
}
function verifySeal(meta) {
    // MVP: mocked verification. Set window.__SEAL_DISABLE=true to bypass.
    const disabled = window.__SEAL_DISABLE === true;
    if (disabled)
        return true;
    // Basic checksum format check
    return /^sha256:[0-9a-fA-F]{64}$/.test(meta.checksum);
}
// UMD export (provide both Aquads and legacy SuiAds aliases)
const __aquadsUMD = {
    mount: (el, opts = {}) => {
        var _a, _b;
        const elem = typeof el === "string" ? document.querySelector(el) : el;
        const slotId = opts.slotId || ((_a = elem === null || elem === void 0 ? void 0 : elem.dataset) === null || _a === void 0 ? void 0 : _a.slotId) || ((_b = document.currentScript) === null || _b === void 0 ? void 0 : _b.getAttribute("data-slot")) || "";
        if (!elem || !slotId)
            return;
        mount(elem, slotId);
    },
    setApiBase,
};
window.Aquads = __aquadsUMD;
window.SuiAds = __aquadsUMD;
function startViewability(el, opts) {
    var _a, _b;
    const thresholdPct = (_a = opts.thresholdPct) !== null && _a !== void 0 ? _a : 0.5; // 50%
    const minDurationMs = (_b = opts.minDurationMs) !== null && _b !== void 0 ? _b : 1000; // 1s
    let visibleRatio = 0;
    let maxRatio = 0;
    let accumMs = 0;
    let lastTs = performance.now();
    let pageVisible = document.visibilityState === "visible";
    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
    const io = new IntersectionObserver((entries) => {
        const e = entries[0];
        visibleRatio = e.intersectionRatio;
        if (visibleRatio > maxRatio)
            maxRatio = visibleRatio;
    }, { root: null, threshold: thresholds });
    io.observe(el);
    const onVis = () => {
        pageVisible = document.visibilityState === "visible";
        lastTs = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);
    const timer = setInterval(() => {
        var _a;
        const now = performance.now();
        const dt = now - lastTs;
        lastTs = now;
        if (pageVisible && visibleRatio >= thresholdPct)
            accumMs += dt;
        if (accumMs >= minDurationMs) {
            try {
                const payload = {
                    slotId: opts.slotId,
                    maxPct: Math.round(maxRatio * 100),
                    durationMs: Math.round(accumMs),
                    ts: Date.now(),
                };
                ((_a = navigator.sendBeacon) === null || _a === void 0 ? void 0 : _a.call(navigator, `${API_BASE}/api/track/view`, new Blob([JSON.stringify(payload)], { type: "application/json" }))) ||
                    fetch(`${API_BASE}/api/track/view`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
            }
            catch (_b) { }
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

export { enforceSize, fetchWalrusJSON, mount, renderPlaceholder, setApiBase, startViewability, verifySeal, walrusToHttp };
//# sourceMappingURL=index.esm.js.map
