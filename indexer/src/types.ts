export type EventType =
  | "SlotCreated"
  | "Rented"
  | "Outbid"
  | "BuyoutLocked"
  | "CreativeUpdated";

export interface CurrentSlotResponse {
  slot: any;
  renter: string | null;
  expiry: number;
  lastPrice: string;
  latestMetaCid: string | null;
}

