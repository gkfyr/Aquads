import 'dotenv/config'
import { execSync } from 'node:child_process'
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { fromB64 } from '@mysten/sui.js/utils'
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography'

function keypairFromEnv(secret: string) {
  // Accept formats:
  // - ed25519:<base64>
  // - ed25519:<hex>
  // - 0x<hex>
  // - <base64>
  let raw = secret
  if (secret.includes(':')) {
    const [scheme, rest] = secret.split(':', 2)
    // If rest looks like hex, parse directly; otherwise try decodeSuiPrivateKey (base64 form)
    const isHex = /^[0-9a-fA-F]+$/.test(rest.replace(/^0x/, ''))
    if (isHex) raw = rest
    else {
      const { secretKey } = decodeSuiPrivateKey(secret)
      return Ed25519Keypair.fromSecretKey(secretKey)
    }
  }
  let bytes: Uint8Array
  if (/^[0-9a-fA-Fx]+$/.test(raw)) {
    bytes = Uint8Array.from(Buffer.from(raw.replace(/^0x/, ''), 'hex'))
  } else {
    bytes = fromB64(raw)
  }
  // Normalize known encodings to 32-byte seed
  if (bytes.length === 33) bytes = bytes.slice(1)
  if (bytes.length === 65) bytes = bytes.slice(1, 33)
  if (bytes.length === 64) bytes = bytes.slice(0, 32)
  if (bytes.length === 48) bytes = bytes.slice(-32)
  if (bytes.length !== 32) throw new Error(`Unsupported secret key length ${bytes.length}`)
  return Ed25519Keypair.fromSecretKey(bytes)
}

async function main() {
  const rpc = process.env.SUI_RPC_URL || getFullnodeUrl('testnet')
  const priv = process.env.PUBLISHER_PRIVATE_KEY
  if (!priv) throw new Error('PUBLISHER_PRIVATE_KEY missing in .env')

  console.log('[deploy] Building Move package...')
  const out = execSync('sui move build --dump-bytecode-as-base64 --path contracts/sui-ads', { stdio: ['ignore', 'pipe', 'inherit'] })
  const build = JSON.parse(out.toString())
  const modules: string[] = build.modules
  const dependencies: string[] = build.dependencies

  const client = new SuiClient({ url: rpc })
  const kp = keypairFromEnv(priv)
  const tx = new TransactionBlock()
  tx.setGasBudget(100000000)
  const [upgradeCap] = tx.publish({ modules, dependencies }) as any
  const addr = kp.getPublicKey().toSuiAddress()
  tx.transferObjects([upgradeCap], tx.pure(addr))

  console.log('[deploy] Publishing...')
  const result = await client.signAndExecuteTransactionBlock({ signer: kp, transactionBlock: tx, options: { showEffects: true, showEvents: true } })
  console.log(JSON.stringify(result, null, 2))

  const pkg = (result.effects as any)?.created?.find((o: any) => o.owner === 'Immutable')?.reference?.objectId
  if (pkg) {
    console.log('\n[deploy] Package ID:', pkg)
    console.log('Set SUI_PACKAGE_ID in .env to this value.')
  } else {
    console.log('[deploy] Could not automatically detect package id. Check transaction events for Published event.')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
