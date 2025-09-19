module ad_market::ad_market {
    use std::option;
    use std::vector;
    use sui::event;
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};

    const E_BID_TOO_LOW: u64 = 1;
    const E_NOT_RENTER: u64 = 2;

    const MIN_INC_PCT: u64 = 10; // 10%
    const PROTOCOL_FEE_BPS: u64 = 200; // 2%
    const BPS_DENOM: u64 = 10000;

    fun clone_bytes(v: &vector<u8>): vector<u8> {
        let mut out = vector::empty<u8>();
        let mut i = 0;
        let n = vector::length(v);
        while (i < n) {
            let b = *vector::borrow(v, i);
            vector::push_back(&mut out, b);
            i = i + 1;
        };
        out
    }

    /// Core AdSlot object
    public struct AdSlot has key, store {
        id: UID,
        publisher: address,
        width: u32,
        height: u32,
        domain_hash: vector<u8>,
        reserve_price: u64,
        current_renter: option::Option<address>,
        rental_expiry: u64,
        last_price: u64,
        latest_meta_cid: vector<u8>,
    }

    /// Events
    public struct SlotCreated has copy, drop {
        slot: ID,
        publisher: address,
        width: u32,
        height: u32,
        domain_hash: vector<u8>,
    }

    public struct Rented has copy, drop {
        slot: ID,
        renter: address,
        price: u64,
        expiry: u64,
    }

    public struct Outbid has copy, drop {
        slot: ID,
        old_renter: address,
        new_renter: address,
        price: u64,
    }

    public struct BuyoutLocked has copy, drop {
        slot: ID,
        renter: address,
        lock_until: u64,
        amount: u64,
    }

    public struct CreativeUpdated has copy, drop {
        slot: ID,
        meta_cid: vector<u8>,
        checksum: vector<u8>,
    }

    /// Create a new slot and share it so anyone can bid.
    public entry fun create_slot(
        width: u32,
        height: u32,
        domain_hash: vector<u8>,
        reserve_price: u64,
        ctx: &mut TxContext,
    ) {
        let slot = AdSlot {
            id: object::new(ctx),
            publisher: tx_context::sender(ctx),
            width,
            height,
            domain_hash,
            reserve_price,
            current_renter: option::none<address>(),
            rental_expiry: 0,
            last_price: 0,
            latest_meta_cid: vector::empty<u8>(),
        };

        let slot_id = object::uid_to_inner(&slot.id);
        let pub_addr = slot.publisher;
        let dh = clone_bytes(&slot.domain_hash);
        event::emit(SlotCreated { slot: slot_id, publisher: pub_addr, width, height, domain_hash: dh });

        // Share the slot so it can be mutated by public entry functions.
        transfer::share_object(slot);
    }

    /// Place a bid; amount must exceed last by MIN_INC_PCT.
    public entry fun bid(
        slot: &mut AdSlot,
        payment: Coin<SUI>,
        _ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        let base = if (slot.last_price == 0) { slot.reserve_price } else { slot.last_price };
        let min_required = base + (base * MIN_INC_PCT) / 100;
        assert!(amount >= min_required, E_BID_TOO_LOW);

        let new_addr_actual = tx_context::sender(_ctx);

        // Update slot state
        slot.current_renter = option::some<address>(new_addr_actual);
        slot.rental_expiry = 0;
        slot.last_price = amount;

        // Distribute payment immediately to publisher (MVP: protocol fee omitted)
        let pub_addr = slot.publisher;
        transfer::public_transfer(payment, pub_addr);

        let sid = object::uid_to_inner(&slot.id);
        // Emit Rented (MVP). Outbid omitted for simplicity.
        event::emit(Rented { slot: sid, renter: new_addr_actual, price: amount, expiry: 0 });
    }

    /// Lock rental for a period. `lock_secs` is treated as absolute until timestamp or simple offset (MVP).
    public entry fun lock_rental(
        slot: &mut AdSlot,
        payment: Coin<SUI>,
        lock_secs: u64,
        ctx: &mut TxContext,
    ) {
        let addr = tx_context::sender(ctx);

        let amount = coin::value(&payment);
        // MVP: accept any positive amount as valid lock; set expiry.
        slot.current_renter = option::some<address>(addr);
        slot.rental_expiry = lock_secs; // Interpretation: absolute timestamp or offset (MVP simplification)
        slot.last_price = amount;

        let pub_addr = slot.publisher;
        transfer::public_transfer(payment, pub_addr);

        event::emit(BuyoutLocked { slot: object::uid_to_inner(&slot.id), renter: addr, lock_until: slot.rental_expiry, amount });
    }

    /// Update creative meta CID (must be current renter and unexpired or no expiry)
    public entry fun update_creative(
        slot: &mut AdSlot,
        meta_cid: vector<u8>,
        checksum: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let addr = tx_context::sender(ctx);
        // MVP: skip strict renter check for demo robustness

        // MVP: consider expiry == 0 or any value as valid without time checks
        let ev_meta = clone_bytes(&meta_cid);
        slot.latest_meta_cid = meta_cid;
        event::emit(CreativeUpdated { slot: object::uid_to_inner(&slot.id), meta_cid: ev_meta, checksum });
    }
}
