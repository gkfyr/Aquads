import type { RecipeVariants } from '@vanilla-extract/recipes';
export declare const headingVariants: import("@vanilla-extract/recipes").RuntimeFn<{
    size: {
        sm: {
            fontSize: `var(--${string})`;
        };
        md: {
            fontSize: `var(--${string})`;
        };
        lg: {
            fontSize: `var(--${string})`;
        };
        xl: {
            fontSize: `var(--${string})`;
        };
    };
    weight: {
        normal: {
            fontWeight: `var(--${string})`;
        };
        bold: {
            fontWeight: `var(--${string})`;
        };
    };
    truncate: {
        true: {
            overflow: "hidden";
            textOverflow: "ellipsis";
            whiteSpace: "nowrap";
        };
    };
}>;
export type HeadingVariants = RecipeVariants<typeof headingVariants>;
