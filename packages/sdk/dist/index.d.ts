import type { SlotMeta } from "@aquads/shared/src/types";
export declare function setApiBase(base: string): void;
export declare function mount(el: HTMLElement, slotId: string): Promise<void>;
export declare function renderPlaceholder(el: HTMLElement, text: string): void;
export declare function enforceSize(el: HTMLElement, w: number, h: number): void;
export declare function walrusToHttp(cid: string): string;
export declare function fetchWalrusJSON(metaCid: string): Promise<SlotMeta>;
export declare function verifySeal(meta: SlotMeta): boolean;
declare global {
    interface Window {
        Aquads: any;
        SuiAds: any;
        __SEAL_DISABLE?: boolean;
        WALRUS_HTTP_GATEWAY?: string;
    }
}
type ViewabilityOpts = {
    slotId: string;
    thresholdPct?: number;
    minDurationMs?: number;
};
export declare function startViewability(el: HTMLElement, opts: ViewabilityOpts): {
    stop: () => void;
};
export {};
