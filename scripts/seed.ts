import 'dotenv/config'

async function main() {
  const base = process.env.SEED_BASE || 'http://localhost:' + (process.env.PORT || '8787')
  const slot = await fetch(base + '/api/tx/createSlot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ width: 300, height: 250, domainHash: '0x' + '11'.repeat(32), reservePrice: '100000000' })
  }).then(r => r.json())
  console.log('Created slot tx:', slot)
}

main().catch(e => { console.error(e); process.exit(1) })

