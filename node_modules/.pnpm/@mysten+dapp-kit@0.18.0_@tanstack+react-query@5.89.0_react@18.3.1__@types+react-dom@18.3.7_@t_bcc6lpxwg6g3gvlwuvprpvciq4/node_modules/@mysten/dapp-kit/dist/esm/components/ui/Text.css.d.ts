import type { RecipeVariants } from '@vanilla-extract/recipes';
export declare const textVariants: import("@vanilla-extract/recipes").RuntimeFn<{
    size: {
        sm: {
            fontSize: `var(--${string})`;
        };
    };
    weight: {
        normal: {
            fontWeight: `var(--${string})`;
        };
        medium: {
            fontWeight: `var(--${string})`;
        };
        bold: {
            fontWeight: `var(--${string})`;
        };
    };
    color: {
        muted: {
            color: `var(--${string})`;
        };
        danger: {
            color: `var(--${string})`;
        };
    };
    mono: {
        true: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace";
        };
    };
}>;
export type TextVariants = RecipeVariants<typeof textVariants>;
