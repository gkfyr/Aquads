import type { InferBcsInput } from '@mysten/bcs';
export declare const zkLoginSignature: import("@mysten/bcs").BcsStruct<{
    inputs: import("@mysten/bcs").BcsStruct<{
        proofPoints: import("@mysten/bcs").BcsStruct<{
            a: import("@mysten/bcs").BcsType<string[], Iterable<string> & {
                length: number;
            }, string>;
            b: import("@mysten/bcs").BcsType<string[][], Iterable<Iterable<string> & {
                length: number;
            }> & {
                length: number;
            }, string>;
            c: import("@mysten/bcs").BcsType<string[], Iterable<string> & {
                length: number;
            }, string>;
        }, string>;
        issBase64Details: import("@mysten/bcs").BcsStruct<{
            value: import("@mysten/bcs").BcsType<string, string, "string">;
            indexMod4: import("@mysten/bcs").BcsType<number, number, "u8">;
        }, string>;
        headerBase64: import("@mysten/bcs").BcsType<string, string, "string">;
        addressSeed: import("@mysten/bcs").BcsType<string, string, "string">;
    }, string>;
    maxEpoch: import("@mysten/bcs").BcsType<string, string | number | bigint, "u64">;
    userSignature: import("@mysten/bcs").BcsType<number[], Iterable<number> & {
        length: number;
    }, string>;
}, string>;
export type ZkLoginSignature = InferBcsInput<typeof zkLoginSignature>;
export type ZkLoginSignatureInputs = ZkLoginSignature['inputs'];
