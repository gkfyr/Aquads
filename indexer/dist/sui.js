import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { fromB64 } from "@mysten/sui.js/utils";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { upsertSlot, addEvent } from "./db.js";
// Read env at runtime inside poll to pick up .env loaded in index.ts
export function getClient() {
    const url = process.env.SUI_RPC_URL || getFullnodeUrl("testnet");
    return new SuiClient({ url });
}
function evTypeName(ev) {
    return ev.type?.split("::").pop() || "";
}
function decodeBytesToString(v) {
    try {
        if (typeof v === "string") {
            if (v.startsWith("0x")) {
                return Buffer.from(v.slice(2), "hex").toString("utf8");
            }
            // assume base64
            return Buffer.from(v, "base64").toString("utf8");
        }
        if (Array.isArray(v)) {
            return Buffer.from(v).toString("utf8");
        }
    }
    catch { }
    return String(v ?? "");
}
export async function startIndexer(prisma) {
    const client = getClient();
    let cursor = null;
    async function poll() {
        try {
            const packageId = process.env.SUI_PACKAGE_ID || "";
            const moduleName = process.env.SUI_MODULE_NAME || "ad_market";
            if (!packageId) {
                console.warn("[indexer] SUI_PACKAGE_ID is empty; skip polling");
                setTimeout(poll, 3000);
                return;
            }
            const filter = { MoveModule: { package: packageId, module: moduleName } };
            const resp = await client.queryEvents({
                query: filter,
                cursor: cursor,
                limit: 50,
                order: "ascending",
            });
            for (const e of resp.data) {
                await handleEvent(e);
                cursor = e.id;
            }
        }
        catch (err) {
            console.error("Indexer poll error", err);
        }
        finally {
            setTimeout(poll, 2000);
        }
    }
    async function handleEvent(e) {
        const typeName = evTypeName(e);
        const data = e.parsedJson || {};
        const slotId = data.slot ?? data.slot_id ?? "";
        const ts = BigInt(Math.floor(Date.now() / 1000));
        // Persist generic event record
        await addEvent({
            id: `${e.id.txDigest}-${e.id.eventSeq}`,
            slot_id: String(slotId),
            type: typeName,
            data,
            ts,
        });
        // Update slot table based on event
        if (typeName === "SlotCreated") {
            await upsertSlot({
                id: String(slotId),
                publisher: String(data.publisher),
                width: Number(data.width),
                height: Number(data.height),
                domain_hash: String(data.domain_hash),
                // reserve_price not emitted by event in current Move; keep existing
                created_at: ts,
            });
        }
        else if (typeName === "Rented") {
            await upsertSlot({
                id: String(slotId),
                current_renter: String(data.renter),
                rental_expiry: BigInt(data.expiry ?? 0),
                last_price: BigInt(data.price ?? 0),
            });
        }
        else if (typeName === "Outbid") {
            await upsertSlot({
                id: String(slotId),
                current_renter: String(data.new_renter),
                last_price: BigInt(data.price ?? 0),
            });
        }
        else if (typeName === "BuyoutLocked") {
            await upsertSlot({
                id: String(slotId),
                current_renter: String(data.renter),
                rental_expiry: BigInt(data.lock_until ?? 0),
                last_price: BigInt(data.amount ?? 0),
            });
        }
        else if (typeName === "CreativeUpdated") {
            await upsertSlot({
                id: String(slotId),
                latest_meta_cid: decodeBytesToString(data.meta_cid),
            });
        }
    }
    poll();
}
export function keypairFromEnv(secret) {
    let raw = secret;
    if (secret.includes(":")) {
        const [_, rest] = secret.split(":", 2);
        const isHex = /^[0-9a-fA-F]+$/.test(rest.replace(/^0x/, ""));
        if (isHex)
            raw = rest;
        else {
            const { secretKey } = decodeSuiPrivateKey(secret);
            return Ed25519Keypair.fromSecretKey(secretKey);
        }
    }
    let bytes;
    if (/^[0-9a-fA-Fx]+$/.test(raw)) {
        bytes = Uint8Array.from(Buffer.from(raw.replace(/^0x/, ""), "hex"));
    }
    else {
        bytes = fromB64(raw);
    }
    if (bytes.length === 33)
        bytes = bytes.slice(1);
    if (bytes.length === 65)
        bytes = bytes.slice(1, 33);
    if (bytes.length === 64)
        bytes = bytes.slice(0, 32);
    if (bytes.length === 48)
        bytes = bytes.slice(-32);
    if (bytes.length !== 32)
        throw new Error(`Unsupported secret key length ${bytes.length}`);
    return Ed25519Keypair.fromSecretKey(bytes);
}
