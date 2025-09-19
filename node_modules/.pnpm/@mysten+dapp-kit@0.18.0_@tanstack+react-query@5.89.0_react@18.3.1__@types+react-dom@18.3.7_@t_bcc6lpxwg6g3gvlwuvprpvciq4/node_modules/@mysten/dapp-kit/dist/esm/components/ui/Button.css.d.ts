import type { RecipeVariants } from '@vanilla-extract/recipes';
export declare const buttonVariants: import("@vanilla-extract/recipes").RuntimeFn<{
    variant: {
        primary: {
            backgroundColor: `var(--${string})`;
            color: `var(--${string})`;
            boxShadow: `var(--${string})`;
            ':hover': {
                backgroundColor: `var(--${string})`;
            };
        };
        outline: {
            borderWidth: number;
            borderStyle: "solid";
            borderColor: `var(--${string})`;
            color: `var(--${string})`;
            ':hover': {
                backgroundColor: `var(--${string})`;
            };
        };
    };
    size: {
        md: {
            borderRadius: `var(--${string})`;
            padding: "8px 16px";
        };
        lg: {
            borderRadius: `var(--${string})`;
            padding: "16px 24px ";
        };
    };
}>;
export type ButtonVariants = RecipeVariants<typeof buttonVariants>;
