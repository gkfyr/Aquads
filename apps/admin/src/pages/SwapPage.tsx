import { useState } from 'react'
import NavBar from '../components/NavBar'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import { TransactionBlock } from '@mysten/sui.js/transactions'

export default function SwapPage() {
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const [amountSui, setAmountSui] = useState('1')
  const [amountAqt, setAmountAqt] = useState('10000')
  const [cfg, setCfg] = useState<{ packageId: string; moduleName: string; protocolId?: string } | null>(null)
  const rateInfo = 'Hackathon fixed rate: 1 SUI = 10,000 AQT'

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(c => setCfg({ packageId: c.packageId, moduleName: c.moduleName, protocolId: c.protocolId || '' })).catch(() => {})
  }, [])

  async function onSwapSuiToAqt() {
    if (!cfg?.protocolId) { alert('Protocol not initialized'); return }
    const sui = Number(amountSui || '0');
    if (!(sui > 0)) { alert('Amount must be > 0'); return }
    const tx = new TransactionBlock()
    const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(BigInt(Math.floor(sui * 1_000_000_000))))])
    tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::swap_sui_to_aqt`, arguments: [tx.object(cfg.protocolId), pay] })
    await signAndExecute({ transaction: tx.serialize(), options: { showEffects: true } })
  }
  async function onSwapAqtToSui() {
    alert('AQT → SUI swap requires selecting AQT coin; simplified UI not implemented in hackathon stub.')
  }
  async function onDeposit() {
    if (!cfg?.protocolId) { alert('Protocol not initialized'); return }
    const tx = new TransactionBlock()
    // For demo: deposit fixed 1 SUI
    const [pay] = tx.splitCoins(tx.gas, [tx.pure(String(1_000_000_000))])
    tx.moveCall({ target: `${cfg.packageId}::${cfg.moduleName}::deposit_sui`, arguments: [tx.object(cfg.protocolId), pay] })
    await signAndExecute({ transaction: tx.serialize(), options: { showEffects: true } })
  }

  return (
    <div className="min-h-full font-[Inter]">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5 space-y-3">
          <div className="text-base font-semibold">Swap</div>
          <div className="text-xs text-slate-400">{rateInfo}</div>
          <div>
            <label className="label">SUI → AQT</label>
            <div className="flex gap-2">
              <input className="input" value={amountSui} onChange={(e) => setAmountSui(e.target.value.replace(/[^0-9.]/g, ''))} />
              <button className="btn-primary" onClick={onSwapSuiToAqt} disabled={!account}>Swap</button>
            </div>
          </div>
          <div>
            <label className="label">AQT → SUI</label>
            <div className="flex gap-2">
              <input className="input" value={amountAqt} onChange={(e) => setAmountAqt(e.target.value.replace(/[^0-9]/g, ''))} />
              <button className="btn-outline" onClick={onSwapAqtToSui} disabled={!account}>Swap</button>
            </div>
          </div>
        </section>

        <section className="card p-5 space-y-3">
          <div className="text-base font-semibold">Deposit</div>
          <div className="text-xs text-slate-400">Provide liquidity (hackathon)</div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={onDeposit} disabled={!account}>Deposit AQT</button>
            <button className="btn-outline" onClick={onDeposit} disabled={!account}>Deposit SUI</button>
          </div>
        </section>
      </main>
    </div>
  )
}
