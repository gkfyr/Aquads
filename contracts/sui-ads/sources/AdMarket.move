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
    // NOTE(hackathon): legacy constant; real fee logic below uses 6%
    const PROTOCOL_FEE_BPS: u64 = 200; // 2%
    const BPS_DENOM: u64 = 10000;

    // --- Hackathon AQT token + simple swap (fixed rate) ---
    /// Shared protocol state holding a simple SUI pool and protocol fee vault.
    public struct Protocol has key {
        id: UID,
        sui_pool: Coin<SUI>,        // accumulated SUI from swaps/fees (hackathon)
        fee_vault: Coin<SUI>,       // 4% protocol fee vault (hackathon)
    }

    /// Module init (auto-invoked on publish). Create shared Protocol with empty pools. (hackathon)
    fun init(ctx: &mut TxContext) {
        let prot = Protocol { id: object::new(ctx), sui_pool: coin::zero<SUI>(ctx), fee_vault: coin::zero<SUI>(ctx) };
        transfer::share_object(prot);
    }

    /// Fixed rate: 1 SUI = 10,000 AQT (hackathon simplification)
    const AQT_PER_SUI: u64 = 10000;

    /// Swap SUI -> AQT at fixed rate. Adds SUI to pool. (Hackathon: AQT accounting off-chain)
    public entry fun swap_sui_to_aqt(prot: &mut Protocol, payment: Coin<SUI>, _ctx: &mut TxContext) {
        let sui_in = coin::value(&payment);
        // add SUI to pool
        coin::join(&mut prot.sui_pool, payment);
        // AQT mint skipped for hackathon
    }

    /// Hackathon deposit: allow users to deposit SUI or AQT into pools (no LP accounting, for demo only)
    public entry fun deposit_sui(prot: &mut Protocol, payment: Coin<SUI>) {
        coin::join(&mut prot.sui_pool, payment);
    }

    /// Bid with protocol accounting (hackathon):
    /// - 6% fee: 4% to protocol fee vault, 2% used to mint+burn AQT and SUI added to pool.
    public entry fun bid_with_protocol(
        prot: &mut Protocol,
        slot: &mut AdSlot,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(slot.rental_expiry == 0, 10001);
        let amount = coin::value(&payment);
        let base = if (slot.last_price == 0) { slot.reserve_price } else { slot.last_price };
        let min_required = base + (base * MIN_INC_PCT) / 100;
        assert!(amount >= min_required, E_BID_TOO_LOW);

        let new_addr_actual = tx_context::sender(ctx);
        slot.current_renter = option::some<address>(new_addr_actual);
        slot.rental_expiry = 0;
        slot.last_price = amount;

        let fee6 = (amount * 6) / 100; // 6%
        let fee2 = (amount * 2) / 100; // 2%
        let fee4 = fee6 - fee2;       // 4%
        let publisher_take = amount - fee6;
        let payout = coin::split(&mut payment, publisher_take, ctx);
        let four = coin::split(&mut payment, fee4, ctx);
        let two = payment;
        // Publisher payout
        transfer::public_transfer(payout, slot.publisher);
        // 4% to fee vault
        coin::join(&mut prot.fee_vault, four);
        // 2%: add SUI to pool (simulate AQT burn off-chain)
        coin::join(&mut prot.sui_pool, two);

        let sid = object::uid_to_inner(&slot.id);
        event::emit(Rented { slot: sid, renter: new_addr_actual, price: amount, expiry: 0 });
    }

    /// Lock rental with protocol accounting (hackathon 6% fee split as above)
    public entry fun lock_rental_with_protocol(
        prot: &mut Protocol,
        slot: &mut AdSlot,
        mut payment: Coin<SUI>,
        lock_secs: u64,
        ctx: &mut TxContext,
    ) {
        let addr = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        slot.current_renter = option::some<address>(addr);
        slot.rental_expiry = lock_secs;
        slot.last_price = amount;

        let fee6 = (amount * 6) / 100;
        let fee2 = (amount * 2) / 100;
        let fee4 = fee6 - fee2;
        let publisher_take = amount - fee6;
        let payout = coin::split(&mut payment, publisher_take, ctx);
        let four = coin::split(&mut payment, fee4, ctx);
        let two = payment;
        transfer::public_transfer(payout, slot.publisher);
        coin::join(&mut prot.fee_vault, four);
        coin::join(&mut prot.sui_pool, two);

        event::emit(BuyoutLocked { slot: object::uid_to_inner(&slot.id), renter: addr, lock_until: slot.rental_expiry, amount });
    }

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
        reserve_price: u64,
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

    /// Hackathon: cancellation event (no on-chain refund logic here)
    public struct Cancelled has copy, drop {
        slot: ID,
        caller: address,
        kind: u8, // 1=publisher, 2=advertiser
        amount: u64,
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
        event::emit(SlotCreated { slot: slot_id, publisher: pub_addr, width, height, domain_hash: dh, reserve_price });

        // Share the slot so it can be mutated by public entry functions.
        transfer::share_object(slot);
    }

    /// Place a bid; amount must exceed last by MIN_INC_PCT.
    public entry fun bid(
        slot: &mut AdSlot,
        payment: Coin<SUI>,
        _ctx: &mut TxContext,
    ) {
        // Prevent bids while locked (simple hackathon rule: any non-zero expiry means locked)
        assert!(slot.rental_expiry == 0, 10001);
        let amount = coin::value(&payment);
        let base = if (slot.last_price == 0) { slot.reserve_price } else { slot.last_price };
        let min_required = base + (base * MIN_INC_PCT) / 100;
        assert!(amount >= min_required, E_BID_TOO_LOW);

        let new_addr_actual = tx_context::sender(_ctx);

        // Update slot state
        slot.current_renter = option::some<address>(new_addr_actual);
        slot.rental_expiry = 0;
        slot.last_price = amount;
        // Simple payout to publisher (no fee on legacy entry)
        transfer::public_transfer(payment, slot.publisher);

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

    /// Publisher can cancel: resets renter/expiry/creative. (Hackathon: refund off-chain)
    public entry fun cancel_by_publisher(slot: &mut AdSlot, ctx: &mut TxContext) {
        let caller = tx_context::sender(ctx);
        assert!(caller == slot.publisher, 10002);
        let last = slot.last_price;
        slot.current_renter = option::none<address>();
        slot.rental_expiry = 0;
        slot.last_price = 0;
        slot.latest_meta_cid = vector::empty<u8>();
        event::emit(Cancelled { slot: object::uid_to_inner(&slot.id), caller, kind: 1, amount: last });
    }

    /// Advertiser (current renter) can cancel: resets state. (Hackathon: refund off-chain)
    public entry fun cancel_by_advertiser(slot: &mut AdSlot, ctx: &mut TxContext) {
        let caller = tx_context::sender(ctx);
        let is_some = option::is_some(&slot.current_renter);
        assert!(is_some, 10003);
        let cur_ref = option::borrow(&slot.current_renter);
        let cur = *cur_ref;
        assert!(caller == cur, 10003);
        let last = slot.last_price;
        slot.current_renter = option::none<address>();
        slot.rental_expiry = 0;
        slot.last_price = 0;
        slot.latest_meta_cid = vector::empty<u8>();
        event::emit(Cancelled { slot: object::uid_to_inner(&slot.id), caller, kind: 2, amount: last });
    }

    /// Publisher reset to placeholder without deleting slot (hackathon)
    public entry fun reset_to_placeholder(slot: &mut AdSlot, ctx: &mut TxContext) {
        let caller = tx_context::sender(ctx);
        assert!(caller == slot.publisher, 10004);
        slot.latest_meta_cid = vector::empty<u8>();
    }
}
