import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
export async function upsertSlot(slot) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const updateData = {};
    if (slot.publisher !== undefined)
        updateData.publisher = slot.publisher;
    if (slot.width !== undefined)
        updateData.width = slot.width;
    if (slot.height !== undefined)
        updateData.height = slot.height;
    if (slot.domain_hash !== undefined)
        updateData.domain_hash = slot.domain_hash;
    if (slot.reserve_price !== undefined)
        updateData.reserve_price = slot.reserve_price;
    if (slot.current_renter !== undefined)
        updateData.current_renter = slot.current_renter;
    if (slot.rental_expiry !== undefined)
        updateData.rental_expiry = slot.rental_expiry;
    if (slot.last_price !== undefined)
        updateData.last_price = slot.last_price;
    if (slot.latest_meta_cid !== undefined)
        updateData.latest_meta_cid = slot.latest_meta_cid;
    const createData = {
        id: slot.id,
        publisher: slot.publisher ?? "",
        width: slot.width ?? 0,
        height: slot.height ?? 0,
        domain_hash: slot.domain_hash ?? "",
        reserve_price: slot.reserve_price ?? 0n,
        current_renter: slot.current_renter ?? null,
        rental_expiry: slot.rental_expiry ?? 0n,
        last_price: slot.last_price ?? 0n,
        latest_meta_cid: slot.latest_meta_cid ?? null,
        created_at: slot.created_at ?? now,
    };
    return prisma.slot.upsert({ where: { id: slot.id }, update: updateData, create: createData });
}
export async function addEvent(e) {
    return prisma.event.upsert({
        where: { id: e.id },
        update: {},
        create: { ...e, data: JSON.stringify(e.data) },
    });
}
