import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import NavBar from '../components/NavBar'

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

type Slot = {
  id: string
  width: number
  height: number
  last_price: string
  current_renter?: string | null
  domain_hash: string
  created_at?: number
  rental_expiry?: number
}

export default function MarketPage() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState<Slot[]>([])
  const [previews, setPreviews] = useState<Record<string, any>>({})
  const [pages, setPages] = useState<Record<string, string | null>>({})
  const [filters, setFilters] = useState({ website: '', size: '', sort: 'price_desc' as 'price_desc'|'price_asc'|'newest'|'oldest' })
  const [loading, setLoading] = useState(false)
  const [cfg, setCfg] = useState<{ packageId: string; moduleName: string } | null>(null)
  const account = useCurrentAccount()
  const walletAddress = account?.address ? account.address.toLowerCase() : null
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  function shortSlot(id: string) {
    const s = id || ''
    const clean = s.startsWith('0x') ? s.slice(2) : s
    const head = clean.slice(0, 6)
    return '0x' + head + (clean.length > 6 ? '…' : '')
  }

  function expiryDate(slot: Slot) {
    const created = Number((slot as any).created_at || 0)
    if (!created) return '—'
    const expSec = created + 30 * 86400
    return new Date(expSec * 1000).toLocaleDateString()
  }

  function fmtSui(mistStr: string | null | undefined) {
    try {
      const n = BigInt(mistStr || '0')
      const whole = n / 1000000000n
      const frac = n % 1000000000n
      const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '')
      return fracStr ? `${whole}.${fracStr} SUI` : `${whole} SUI`
    } catch { return '0 SUI' }
  }

  function short(addr?: string | null) {
    if (!addr) return '-'
    return addr.length > 12 ? `${addr.slice(0,6)}...${addr.slice(-4)}` : addr
  }

  function hostFromUrl(u?: string | null) {
    if (!u) return null
    try {
      const url = new URL(u)
      const h = url.hostname.toLowerCase()
      return h.startsWith('www.') ? h.slice(4) : h
    } catch { return null }
  }

  async function load(attempt = 1) {
    try {
      setLoading(true)
      const qs = new URLSearchParams()
      if (filters.website) qs.set('website', filters.website)
      if (filters.size) qs.set('size', filters.size)
      if (filters.sort) qs.set('sort', filters.sort)
      const data = await j<Slot[]>(`/api/slots?${qs.toString()}`)
      setSlots(data)
      setLoading(false)
      // fetch images lazily
      data.slice(0, 50).forEach(async (s) => {
        try {
          const cur = await j<any>(`/api/slot/${s.id}/creative/current`)
          if (cur && cur.imgUrl) {
            setPreviews((m) => ({ ...m, [s.id]: { type: 'img', url: cur.imgUrl } }))
          } else if (cur && cur.meta && (cur.meta.type === 'html' || (!cur.meta.img_cid && (cur.meta.title || cur.meta.subtitle)))) {
            setPreviews((m) => ({ ...m, [s.id]: { type: 'html', title: cur.meta.title || 'Aquads', subtitle: cur.meta.subtitle || 'Fast. Simple Ads. Powered by SUI', bg: cur.meta.bg || 'linear-gradient(135deg,#0ea5e9,#7c3aed)' } }))
          } else {
            setPreviews((m) => ({ ...m, [s.id]: { type: 'img', url: '/placeholder.svg' } }))
          }
        } catch {
          setPreviews((m) => ({ ...m, [s.id]: { type: 'img', url: '/placeholder.svg' } }))
        }
        try {
          const st = await j<any>(`/api/slot/${s.id}/current`)
          setPages((m) => ({ ...m, [s.id]: st.pageUrl || null }))
        } catch { setPages((m) => ({ ...m, [s.id]: null })) }
      })
    } catch (e) {
      if (attempt < 5) {
        setTimeout(() => load(attempt + 1), 1000)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    load()
    j('/api/config').then((c: any) => setCfg({ packageId: c.packageId, moduleName: c.moduleName })).catch(() => {})
  }, [])

  const onBid = async (slot: Slot) => {
    const last = BigInt(slot.last_price || '0')
    const base = last > 0n ? last : 0n
    const min = base + (base * 10n) / 100n
    const amount = prompt('Bid amount (mist)', (min || 0n).toString())
    if (!amount) return
    if (!cfg) { alert('Config not loaded'); return }
    const tx = new TransactionBlock()
    const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(amount))])
    tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::bid`, arguments: [tx.object(slot.id), pay] })
    await signAndExecute({ transaction: tx.serialize() })
    await load()
  }

  const onUseInPreview = (slot: Slot) => {
    const url = pages[slot.id] || `http://localhost:5174?slotId=${slot.id}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-full font-[Inter]">
      <NavBar />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">Browse ad slots.</div>
          <div className="flex items-center gap-2">
            <button className="btn-primary" onClick={() => navigate('/wallet?tab=create')}>Create Slot</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {slots.map((s) => (
            <div key={s.id} className="card overflow-hidden cursor-pointer" onClick={() => navigate(`/slot/${s.id}`)}>
              <div className="aspect-video bg-white/5 flex items-center justify-center relative">
                {previews[s.id]?.type === 'html' ? (
                  <div className="w-full h-full flex items-center justify-center text-center text-white" style={{ background: previews[s.id]?.bg || 'linear-gradient(135deg,#0ea5e9,#7c3aed)' }}>
                    <div className="px-2">
                      <div className="font-semibold" style={{ fontSize: 18 }}>{previews[s.id]?.title || 'Aquads'}</div>
                      {previews[s.id]?.subtitle && (
                        <div className="opacity-90" style={{ fontSize: 12 }}>{previews[s.id]?.subtitle}</div>
                      )}
                    </div>
                    <div className="absolute right-1.5 bottom-1.5 text-[10px] px-1.5 py-0.5 bg-black/40 rounded">Ad by Aquads</div>
                    <div className="absolute left-1.5 bottom-1.5 text-[10px] px-1.5 py-0.5 bg-black/30 rounded font-mono max-w-[70%] truncate">{`Slot: ${shortSlot(s.id)}`}</div>
                  </div>
                ) : (
                  <img src={previews[s.id]?.url || '/placeholder.svg'} alt="creative" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-300 hover:underline">Slot • {s.width}×{s.height}</span>
                  <div className="text-sm text-slate-200">{fmtSui(s.last_price)}</div>
                </div>
                {s.rental_expiry ? (
                  <div className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-xs border border-amber-400/30">Locked</div>
                ) : null}
                <div className="text-xs text-slate-400">Advertiser: <span title={s.current_renter || ''} className="font-mono">{short(s.current_renter)}</span></div>
                <div className="text-xs text-slate-400">
                  Website: {pages[s.id]
                    ? <span className="text-brand-300">{hostFromUrl(pages[s.id] as string) || 'open'}</span>
                    : <span className="text-slate-500">—</span>}
                </div>
                {s.current_renter ? (
                  <div className="text-xs text-slate-400">Expiry: {expiryDate(s)}</div>
                ) : null}
                <div className="flex gap-2 pt-2 text-xs text-slate-500">Click card to view & purchase</div>
              </div>
            </div>
          ))}
          {slots.length === 0 && !loading && <div className="text-sm text-slate-400">No slots found</div>}
        </div>
      </main>
    </div>
  )
}
