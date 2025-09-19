export interface SlotMeta {
  slot_id: string;
  img_cid?: string; // optional for HTML creatives
  landing_url: string;
  checksum: string; // sha256:abcd...
  policy_sig?: string; // 0x...
  width: number;
  height: number;
  updated_at: number; // unix seconds
  // Optional HTML creative fields
  type?: 'image' | 'html';
  title?: string;
  subtitle?: string;
  bg?: string;
}
