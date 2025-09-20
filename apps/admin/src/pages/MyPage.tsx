import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { SuiClient } from '@mysten/sui.js/client'
import NavBar from '../components/NavBar'

type SlotSummary = {
  id: string
  publisher: string
  width: number
  height: number
  domain_hash: string
  reserve_price: string | null
  current_renter?: string | null
  rental_expiry?: number
  last_price?: string
  latest_meta_cid?: string | null
  created_at?: number
}

type RentalSnapshot = {
  type: string
  renter?: string
  ts: number
  priceMist: string
  expiry: number
}

type ViewSnapshot = {
  views: number
  totalDurationMs: number
  avgMaxViewPct: number
}

type PurchasedSlot = {
  slot: SlotSummary
  pageUrl: string | null
  viewStats: ViewSnapshot
  lastRental: RentalSnapshot | null
}

type CreatedSlot = {
  slot: SlotSummary
  pageUrl: string | null
  viewStats: ViewSnapshot
  revenueMist: string
  pendingMist: string
  latestRental: RentalSnapshot | null
}

type WalletOverview = {
  wallet: string
  purchased: {
    totalSlots: number
    totalViews: number
    slots: PurchasedSlot[]
  }
  created: {
    totalSlots: number
    totalViews: number
    totalRevenueMist: string
    pendingRevenueMist: string
    depositedRevenueMist: string
    slots: CreatedSlot[]
  }
}

type TabKey = 'purchased' | 'created' | 'create'

type FetchError = { message?: string }

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init)
  if (!resp.ok) {
    let message = resp.statusText
    try {
      const data = await resp.json()
      message = (data as FetchError)?.message || JSON.stringify(data)
    } catch {}
    throw new Error(message)
  }
  return resp.json()
}

function fmtSui(mistStr?: string | null) {
  try {
    const n = BigInt(mistStr || '0')
    const whole = n / 1000000000n
    const frac = n % 1000000000n
    const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '')
    return fracStr ? `${whole}.${fracStr} SUI` : `${whole} SUI`
  } catch {
    return '0 SUI'
  }
}

function short(addr?: string | null) {
  if (!addr) return '-'
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr
}

function hostFromUrl(url?: string | null) {
  if (!url) return '—'
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    return host.startsWith('www.') ? host.slice(4) : host
  } catch {
    return '—'
  }
}

function formatExpiry(expiry: number | undefined) {
  if (!expiry) return '—'
  if (expiry > 1_000_000_000) {
    return new Date(expiry * 1000).toLocaleString()
  }
  if (expiry > 0) return `${expiry} sec`
  return '—'
}

function normalizeAddress(addr?: string | null) {
  if (!addr) return null
  const trimmed = addr.trim().toLowerCase()
  if (!trimmed) return null
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
}

function averageDuration(stat: ViewSnapshot) {
  if (!stat.views) return 0
  return Math.round(stat.totalDurationMs / stat.views)
}

// Browser-safe helpers (avoid Node Buffer)
function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/^0x/, '').toLowerCase()
  const out: number[] = []
  for (let i = 0; i < clean.length; i += 2) {
    out.push(parseInt(clean.slice(i, i + 2), 16))
  }
  return out
}
function strToBytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s))
}

export default function MyPage() {
  const params = useParams<{ address?: string }>()
  const location = useLocation()
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const [cfg, setCfg] = useState<{ packageId: string; moduleName: string; network: string; protocolId?: string } | null>(null)
  const connectedAddr = normalizeAddress(account?.address ?? '')
  const routeAddr = normalizeAddress(params.address ?? '')
  const effectiveAddress = routeAddr || connectedAddr

  const [activeTab, setActiveTab] = useState<TabKey>('purchased')
  const [overview, setOverview] = useState<WalletOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [createForm, setCreateForm] = useState({ width: '300', height: '250', domainHash: '', reservePrice: '0.1' })
  const [pageUrl, setPageUrl] = useState('')
  const [createUpload, setCreateUpload] = useState<{ file: File | null; landingUrl: string }>({ file: null, landingUrl: 'https://example.com' })
  const [landingTouched, setLandingTouched] = useState(false)
  const [txResult, setTxResult] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [loadingOpen, setLoadingOpen] = useState(false)
  const [loadingStep, setLoadingStep] = useState<string>('')
  const [loadingPct, setLoadingPct] = useState<number>(0)
  const [useCustomImage, setUseCustomImage] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeSlotId, setCompleteSlotId] = useState<string | null>(null)

  const addressMismatch = Boolean(routeAddr && connectedAddr && routeAddr !== connectedAddr)
  const canManage = Boolean(effectiveAddress && connectedAddr && effectiveAddress === connectedAddr && !addressMismatch)

  useEffect(() => {
    setOverview(null)
    setError(null)
    const usp = new URLSearchParams(location.search)
    const tab = (usp.get('tab') || '').toLowerCase()
    setActiveTab(tab === 'create' ? 'create' : 'purchased')
  }, [effectiveAddress, location.search])

  useEffect(() => {
    if (!effectiveAddress) return
    j('/api/config').then((c: any) => setCfg({ packageId: c.packageId, moduleName: c.moduleName, network: c.network || 'testnet', protocolId: c.protocolId || '' })).catch(() => {})
    let aborted = false
    setLoading(true)
    j<WalletOverview>(`/api/wallet/${effectiveAddress}/overview`)
      .then((data) => {
        if (!aborted) {
          setOverview(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load wallet overview')
          setOverview(null)
        }
      })
      .finally(() => {
        if (!aborted) setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [effectiveAddress, reloadKey])

  useEffect(() => {
    // fetch finance for created slots when overview updates
    (async () => {
      try {
        const ids: string[] = (overview?.created.slots || []).map((s: any) => s.slot.id)
        const map: any = {}
        for (const id of ids.slice(0, 50)) {
          try { map[id] = await j<any>(`/api/slot/${id}/finance`) } catch {}
        }
        setFinance(map)
      } catch {}
    })()
  }, [overview])

  async function sha256Hex(input: string): Promise<string> {
    const enc = new TextEncoder()
    const data = enc.encode(input)
    const digest = await crypto.subtle.digest('SHA-256', data)
    const bytes = Array.from(new Uint8Array(digest))
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  function normalizeHost(host: string) {
    try {
      let h = host.trim().toLowerCase()
      if (h.startsWith('www.')) h = h.slice(4)
      return h
    } catch {
      return host
    }
  }

  async function autofillDomainHashFromUrl() {
    try {
      const u = new URL(pageUrl)
      const host = normalizeHost(u.hostname)
      const hex = await sha256Hex(host)
      setCreateForm((f) => ({ ...f, domainHash: `0x${hex}` }))
      // Default landing URL unless user edited
      if (!landingTouched) {
        setCreateUpload((c) => ({ ...c, landingUrl: `http://localhost:5173` }))
      }
    } catch {
      // ignore
    }
  }

  const triggerReload = () => setReloadKey((k) => k + 1)

  function fullnodeUrl(net?: string | null) {
    const n = (net || 'testnet').toLowerCase()
    if (n.startsWith('main')) return 'https://fullnode.mainnet.sui.io:443'
    if (n.startsWith('dev')) return 'https://fullnode.devnet.sui.io:443'
    return 'https://fullnode.testnet.sui.io:443'
  }

  const purchasedSlots = overview?.purchased.slots ?? []
  const createdSlots = overview?.created.slots ?? []
  const [finance, setFinance] = useState<Record<string, { totalMist: string; claimableMist: string; claimedMist: string; availableMist: string }>>({})

  const createdSummary = useMemo(() => {
    if (!overview) return { total: '0', pending: '0', deposited: '0' }
    return {
      total: overview.created.totalRevenueMist,
      pending: overview.created.pendingRevenueMist,
      deposited: overview.created.depositedRevenueMist,
    }
  }, [overview])

  const onExtend = async (slot: PurchasedSlot) => {
    if (!canManage) return
    try {
      const last = BigInt(slot.slot.last_price || '0')
      const base = last > 0n ? last : 0n
      const min = base + (base * 10n) / 100n
      const amount = prompt('Bid amount (mist)', min.toString())
      if (!amount) return
      if (!cfg) { alert('Config not loaded'); return }
      const tx = new TransactionBlock()
      const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))])
      if (cfg.protocolId) {
        tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::bid_with_protocol`, arguments: [tx.object(cfg.protocolId), tx.object(slot.slot.id), pay] })
      } else {
        tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::bid`, arguments: [tx.object(slot.slot.id), pay] })
      }
      await signAndExecute({ transaction: tx.serialize() })
      triggerReload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to bid')
    }
  }

  const onLock = async (slot: PurchasedSlot) => {
    if (!canManage) return
    try {
      const amount = prompt('Lock amount (mist)', slot.slot.last_price || '0')
      if (!amount) return
      const secs = prompt('Lock seconds (e.g. 3600)', String(slot.slot.rental_expiry || 0))
      if (!secs) return
      const secsValue = Number(secs)
      if (!Number.isFinite(secsValue) || secsValue <= 0) {
        alert('Lock seconds must be a positive number')
        return
      }
      if (!cfg) { alert('Config not loaded'); return }
      const tx = new TransactionBlock()
      const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))])
      if (cfg.protocolId) {
        tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::lock_rental_with_protocol`, arguments: [tx.object(cfg.protocolId), tx.object(slot.slot.id), pay, tx.pure(secsValue)] })
      } else {
        tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::lock_rental`, arguments: [tx.object(slot.slot.id), pay, tx.pure(secsValue)] })
      }
      await signAndExecute({ transaction: tx.serialize() })
      triggerReload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to lock rental')
    }
  }

  const onUpload = async (slot: PurchasedSlot) => {
    if (!canManage) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      try {
        if (!input.files || input.files.length === 0) return
        const file = input.files[0]
        const landingUrl = prompt('Landing URL', 'https://example.com') || 'https://example.com'
        const form = new FormData()
        form.set('file', file)
        form.set('slotId', slot.slot.id)
        form.set('landingUrl', landingUrl)
        form.set('width', String(slot.slot.width))
        form.set('height', String(slot.slot.height))
        const uploadResp = await fetch('/api/walrus/upload', { method: 'POST', body: form })
        if (!uploadResp.ok) throw new Error('Upload failed')
        const uploadData = await uploadResp.json()
        if (!cfg) { alert('Config not loaded'); return }
        const tx2 = new TransactionBlock()
        tx2.moveCall({
          target: `${cfg.packageId}::${cfg.moduleName}::update_creative`,
          arguments: [
            tx2.object(slot.slot.id),
            tx2.pure(strToBytes(uploadData.metaCid)),
            tx2.pure(strToBytes(uploadData.meta.checksum)),
          ],
        })
        await signAndExecute({ transaction: tx2.serialize() })
        triggerReload()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update creative')
      }
    }
    input.click()
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    if (useCustomImage && !createUpload.file) {
      alert('Select an image or uncheck "Upload custom image now".')
      return
    }
    try {
      setCreating(true)
      setLoadingOpen(true)
      setLoadingStep('Creating slot...')
      setLoadingPct(20)
      if (!cfg) throw new Error('Config not loaded')

      const width = Number(createForm.width || '0')
      const height = Number(createForm.height || '0')
      const domainHashHex = (createForm.domainHash || '').replace(/^0x/, '')
      const reservePriceSui = String(createForm.reservePrice || '0')
      function suiToMist(suiStr: string) {
        const s = (suiStr || '').trim()
        if (!s) return '0'
        if (!/^\d*(?:\.)?\d*$/.test(s)) throw new Error('Invalid SUI amount')
        const [intPart, fracPartRaw = ''] = s.split('.')
        const frac = (fracPartRaw + '000000000').slice(0, 9)
        const mist = BigInt(intPart || '0') * 1_000_000_000n + BigInt(frac || '0')
        return mist.toString()
      }
      const reservePrice = suiToMist(reservePriceSui)

      const tx = new TransactionBlock()
      tx.moveCall({
        target: `${cfg.packageId}::${cfg.moduleName}::create_slot`,
        arguments: [
          tx.pure(width),
          tx.pure(height),
          tx.pure(hexToBytes(domainHashHex)),
          tx.pure(reservePrice),
        ],
      })
      const created = await signAndExecute({
        transaction: tx.serialize(),
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
      })
      setTxResult(created)

      let slotId: string | null = null
      const oc: any[] = (created as any).objectChanges || []
      const createdSlot = oc.find((c: any) => c.type === 'created' && typeof c.objectType === 'string' && c.objectType.endsWith('::AdSlot'))
      slotId = createdSlot?.objectId || null
      if (!slotId) {
        const evs: any[] = (created as any).events || []
        const sc = evs.find((e: any) => typeof e.type === 'string' && e.type.endsWith('::SlotCreated') && e.parsedJson?.slot)
        slotId = sc?.parsedJson?.slot || null
      }
      if (!slotId) {
        const effCreated: any[] = (created as any).effects?.created || []
        slotId = effCreated[0]?.reference?.objectId || null
      }
      async function pollResolve(digest: string, maxAttempts = 10, delayMs = 1000): Promise<string | null> {
        // 1) Try server endpoint repeatedly
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const r = await j<{ slotId: string | null }>(`/api/tx/resolveSlotId/${encodeURIComponent(digest)}`)
            if (r.slotId) return r.slotId
          } catch {}
          await new Promise(res => setTimeout(res, delayMs))
        }
        // 2) Try public fullnode as a fallback
        try {
          const client = new SuiClient({ url: fullnodeUrl(cfg?.network) })
          for (let i = 0; i < Math.max(5, Math.floor(maxAttempts/2)); i++) {
            const txd: any = await client.getTransactionBlock({ digest, options: { showObjectChanges: true, showEvents: true, showEffects: true } })
            const oc2: any[] = txd.objectChanges || []
            const cs2 = oc2.find((c: any) => c.type === 'created' && typeof c.objectType === 'string' && c.objectType.endsWith('::AdSlot'))
            if (cs2?.objectId) return cs2.objectId
            const ev2: any[] = txd.events || []
            const sc2 = ev2.find((e: any) => typeof e.type === 'string' && e.type.endsWith('::SlotCreated') && e.parsedJson?.slot)
            if (sc2?.parsedJson?.slot) return sc2.parsedJson.slot
            const eff2: any[] = txd.effects?.created || []
            if (eff2[0]?.reference?.objectId) return eff2[0].reference.objectId
            await new Promise(res => setTimeout(res, delayMs))
          }
        } catch {}
        return null
      }
      if (!slotId) {
        setLoadingStep('Resolving slot ID...')
        setLoadingPct(30)
        slotId = await pollResolve((created as any).digest)
      }
      if (!slotId) throw new Error('Failed to resolve new slot ID')

      if (pageUrl) {
        j(`/api/slot/${slotId}/page`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageUrl }) }).catch(() => {})
      }

      let metaForAnchor: { metaCid: string; meta: any; checksum?: string } | null = null
      if (useCustomImage && createUpload.file) {
        setLoadingStep('Uploading creative...')
        setLoadingPct(60)
        const form = new FormData()
        form.set('file', createUpload.file)
        form.set('slotId', slotId)
        form.set('landingUrl', createUpload.landingUrl)
        form.set('width', String(width))
        form.set('height', String(height))
        const uploadResp = await fetch('/api/walrus/upload', { method: 'POST', body: form })
        if (!uploadResp.ok) throw new Error('Upload failed')
        const uploadData = await uploadResp.json()
        metaForAnchor = { metaCid: uploadData.metaCid, meta: uploadData.meta, checksum: uploadData.meta.checksum }
      } else {
        setLoadingStep('Preparing default creative...')
        setLoadingPct(55)
        const defResp = await fetch('/api/creative/default', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotId, width, height, landingUrl: createUpload.landingUrl, title: 'Aquads', subtitle: 'Fast. Simple Ads. Powered by SUI' }),
        })
        if (!defResp.ok) throw new Error('Default creative failed')
        const defaultData = await defResp.json()
        metaForAnchor = { metaCid: defaultData.metaCid, meta: defaultData.meta, checksum: defaultData.meta.checksum }
      }

      setLoadingStep('Anchoring creative...')
      setLoadingPct(85)
      const tx2 = new TransactionBlock()
      tx2.moveCall({
        target: `${cfg.packageId}::${cfg.moduleName}::update_creative`,
        arguments: [
          tx2.object(slotId),
          tx2.pure(strToBytes(metaForAnchor!.metaCid)),
          tx2.pure(strToBytes(metaForAnchor!.checksum || metaForAnchor!.meta.checksum)),
        ],
      })
      const anchored = await signAndExecute({
        transaction: tx2.serialize(),
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
      })
      setTxResult({ create: created, meta: metaForAnchor, anchor: anchored })
      setLoadingPct(100)
      setTimeout(() => setLoadingOpen(false), 400)
      triggerReload()
      setCompleteSlotId(slotId)
      setCompleteOpen(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create slot.')
      setLoadingOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-full font-[Inter]">
      <NavBar />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="card p-4 space-y-2">
            {[
              { key: 'purchased' as TabKey, label: 'Purchased', disabled: false },
              { key: 'created' as TabKey, label: 'Created', disabled: false },
              { key: 'create' as TabKey, label: 'Create New', disabled: !canManage },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  activeTab === tab.key
                    ? 'bg-white/10 text-white font-semibold border border-white/10'
                    : tab.disabled
                    ? 'text-slate-500 border border-dashed border-white/10 cursor-not-allowed'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {tab.label}
                {tab.disabled && <span className="block text-xs text-slate-500">Wallet required</span>}
              </button>
            ))}
          </aside>

          <section className="space-y-5">
            {!effectiveAddress && (
              <div className="card p-5 text-sm text-slate-300">Connect your wallet to view My Page.</div>
            )}

            {effectiveAddress && addressMismatch && (
              <div className="card p-4 bg-amber-500/10 border border-amber-400/30 text-sm text-amber-200">
                Connected wallet ({short(connectedAddr)}) does not match route address ({short(routeAddr)}). Management actions are limited.
              </div>
            )}

            {effectiveAddress && loading && (
              <div className="card p-5 text-sm text-slate-300">Loading data...</div>
            )}

            {effectiveAddress && error && (
              <div className="card p-5 text-sm text-red-300">{error}</div>
            )}

            {effectiveAddress && !loading && !error && overview && activeTab === 'purchased' && (
              <div className="space-y-4">
                <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Total views</div>
                    <div className="text-2xl font-semibold text-slate-100">{overview.purchased.totalViews.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Purchased slots</div>
                    <div className="text-lg font-semibold text-slate-100">{overview.purchased.totalSlots}</div>
                  </div>
                </div>
                <div className="grid gap-4">
                  {purchasedSlots.map((item) => (
                    <div key={item.slot.id} className="card p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-slate-400">Slot</div>
                          <div className="font-semibold text-slate-100">
                            {item.slot.width}×{item.slot.height}
                          </div>
                        </div>
                        <div className="text-sm text-slate-400">Last price <span className="font-semibold text-slate-100">{fmtSui(item.slot.last_price)}</span></div>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-300">
                        <div>Website: {item.pageUrl ? <a className="text-brand-300 underline" href={item.pageUrl} target="_blank" rel="noreferrer">{hostFromUrl(item.pageUrl)}</a> : '—'}</div>
                        <div>Slot ID: <span className="font-mono text-xs break-all text-slate-200">{item.slot.id}</span></div>
                        <div>Expiry: {formatExpiry(item.lastRental?.expiry || item.slot.rental_expiry)}</div>
                        <div>Views: <span className="font-semibold text-slate-100">{item.viewStats.views.toLocaleString()}</span> (avg {averageDuration(item.viewStats)}ms)</div>
                        {item.lastRental && (
                          <div>Latest activity: {item.lastRental.type} • {fmtSui(item.lastRental.priceMist)} • {new Date(item.lastRental.ts * 1000).toLocaleString()}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-primary" disabled={!canManage} onClick={() => onExtend(item)}>Extend</button>
                        <button className="btn-outline" disabled={!canManage} onClick={() => onUpload(item)}>Update Creative</button>
                        <button className="btn-outline" disabled={!canManage} onClick={() => onLock(item)}>Lock</button>
                      </div>
                    </div>
                  ))}
                  {purchasedSlots.length === 0 && (
                    <div className="card p-5 text-sm text-slate-500">No purchased slots.</div>
                  )}
                </div>
              </div>
            )}

            {effectiveAddress && !loading && !error && overview && activeTab === 'created' && (
              <div className="space-y-4">
                <div className="card p-5 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-sm text-slate-400">Total revenue</div>
                    <div className="text-xl font-semibold text-slate-100">{fmtSui(createdSummary.total)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Pending</div>
                    <div className="text-lg font-semibold text-slate-100">{fmtSui(createdSummary.pending)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Deposited</div>
                    <div className="text-lg font-semibold text-slate-100">{fmtSui(createdSummary.deposited)}</div>
                  </div>
                </div>
                <div className="grid gap-4">
                  {createdSlots.map((item) => (
                    <div key={item.slot.id} className="card p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-slate-400">Slot</div>
                          <div className="font-semibold text-slate-100">{item.slot.width}×{item.slot.height}</div>
                        </div>
                        <div className="text-sm text-slate-400">Total revenue <span className="font-semibold text-slate-100">{fmtSui(item.revenueMist)}</span></div>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-300">
                        <div>Website: {item.pageUrl ? <a className="text-brand-300 underline" href={item.pageUrl} target="_blank" rel="noreferrer">{hostFromUrl(item.pageUrl)}</a> : '—'}</div>
                        <div>Slot ID: <span className="font-mono text-xs break-all text-slate-200">{item.slot.id}</span></div>
                        <div>Latest bid: {fmtSui(item.slot.last_price)}</div>
                        <div>Pending: {fmtSui(item.pendingMist)}</div>
                        {finance[item.slot.id] && (
                          <div className="text-xs text-slate-400">Claimable: <span className="text-slate-100 font-medium">{fmtSui(finance[item.slot.id].availableMist)}</span> (Total {fmtSui(finance[item.slot.id].totalMist)})</div>
                        )}
                        <div>Views: <span className="font-semibold text-slate-100">{item.viewStats.views.toLocaleString()}</span></div>
                        {item.latestRental && (
                          <div>Latest activity: {fmtSui(item.latestRental.priceMist)} • {new Date(item.latestRental.ts * 1000).toLocaleString()}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-outline"
                          onClick={() => alert('Refunds will be supported later.')}
                          type="button"
                        >
                          Refund
                        </button>
                      </div>
                    </div>
                  ))}
                  {createdSlots.length === 0 && (
                    <div className="card p-5 text-sm text-slate-400">No created slots.</div>
                  )}
                </div>
              </div>
            )}

            {effectiveAddress && activeTab === 'create' && (
              <div className="card p-5 space-y-4">
                {!canManage && (
                  <div className="text-sm text-slate-400">Connect your wallet to create a slot.</div>
                )}
                <h2 className="text-base font-semibold">Create New Slot</h2>
                <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">Width</label>
                    <input
                      className="input"
                      disabled={!canManage}
                      inputMode="numeric"
                      value={createForm.width}
                      onChange={(e) => setCreateForm((f) => ({ ...f, width: e.target.value.replace(/[^0-9]/g, '') }))}
                    />
                  </div>
                  <div>
                    <label className="label">Height</label>
                    <input
                      className="input"
                      disabled={!canManage}
                      inputMode="numeric"
                      value={createForm.height}
                      onChange={(e) => setCreateForm((f) => ({ ...f, height: e.target.value.replace(/[^0-9]/g, '') }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Page URL (auto domain hash)</label>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        disabled={!canManage}
                        value={pageUrl}
                        onChange={(e) => setPageUrl(e.target.value)}
                        onBlur={autofillDomainHashFromUrl}
                        placeholder="https://example.com"
                      />
                      <button type="button" className="btn-outline" disabled={!canManage} onClick={autofillDomainHashFromUrl}>
                        Auto
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Domain Hash</label>
                    <input className="input" value={createForm.domainHash} readOnly disabled />
                  </div>
                  <div>
                    <label className="label">Reserve Price (SUI)</label>
                    <input
                      className="input"
                      disabled={!canManage}
                      inputMode="decimal"
                      value={createForm.reservePrice}
                      onChange={(e) => setCreateForm((f) => ({ ...f, reservePrice: e.target.value.replace(/[^0-9.]/g, '') }))}
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input id="toggle-upload" type="checkbox" className="h-4 w-4" checked={useCustomImage} onChange={(e) => setUseCustomImage(e.target.checked)} />
                    <label htmlFor="toggle-upload" className="label !mb-0">Upload custom image now (optional)</label>
                  </div>
                  {useCustomImage && (
                    <div>
                      <label className="label">Creative Image</label>
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        disabled={!canManage}
                        onChange={(e) => setCreateUpload((c) => ({ ...c, file: e.target.files?.[0] || null }))}
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="label">AD redirect URL</label>
                    <input
                      className="input"
                      disabled={!canManage}
                      value={createUpload.landingUrl}
                      onChange={(e) => { setLandingTouched(true); setCreateUpload((c) => ({ ...c, landingUrl: e.target.value })) }}
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <button className="btn-primary" type="submit" disabled={!canManage || creating}>
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                    <button className="btn-outline" type="button" disabled={!canManage} onClick={triggerReload}>
                      Refresh
                    </button>
                  </div>
                </form>
                {txResult && (
                  <pre className="text-xs bg-black/60 border border-white/10 text-slate-100 p-3 rounded-lg max-w-xl overflow-y-auto overflow-x-hidden max-h-60 whitespace-pre-wrap break-words">
                    {JSON.stringify(txResult, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      {/* Loading Popup */}
      {loadingOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card w-full max-w-sm m-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold mb-1">Processing</div>
            <div className="text-sm text-slate-300 mb-3">{loadingStep}</div>
            <div className="w-full h-2 bg-white/10 rounded">
              <div className="h-2 bg-brand-500 rounded" style={{ width: `${loadingPct}%`, transition: 'width .3s ease' }} />
            </div>
          </div>
        </div>
      )}
      {/* Completed Modal */}
      {completeOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCompleteOpen(false)}>
          <div className="card max-w-md w-full m-4 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold mb-2">Completed</div>
            <div className="text-sm text-slate-300 mb-3">Slot creation has been completed.</div>
            <div className="flex gap-2">
              <a className="btn-primary" href="/">Go to Marketplace</a>
              <a className="btn-outline" href="/wallet">Go to My Page</a>
              <button className="btn-outline" onClick={() => setCompleteOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
