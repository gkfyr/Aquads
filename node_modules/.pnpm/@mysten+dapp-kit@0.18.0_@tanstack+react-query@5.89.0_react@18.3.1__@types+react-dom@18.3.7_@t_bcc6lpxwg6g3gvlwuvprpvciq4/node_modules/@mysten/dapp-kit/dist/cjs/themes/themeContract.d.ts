declare const themeContractValues: {
    blurs: {
        modalOverlay: string;
    };
    backgroundColors: {
        primaryButton: string;
        primaryButtonHover: string;
        outlineButtonHover: string;
        walletItemHover: string;
        walletItemSelected: string;
        modalOverlay: string;
        modalPrimary: string;
        modalSecondary: string;
        iconButton: string;
        iconButtonHover: string;
        dropdownMenu: string;
        dropdownMenuSeparator: string;
    };
    borderColors: {
        outlineButton: string;
    };
    colors: {
        primaryButton: string;
        outlineButton: string;
        body: string;
        bodyMuted: string;
        bodyDanger: string;
        iconButton: string;
    };
    radii: {
        small: string;
        medium: string;
        large: string;
        xlarge: string;
    };
    shadows: {
        primaryButton: string;
        walletItemSelected: string;
    };
    fontWeights: {
        normal: string;
        medium: string;
        bold: string;
    };
    fontSizes: {
        small: string;
        medium: string;
        large: string;
        xlarge: string;
    };
    typography: {
        fontFamily: string;
        fontStyle: string;
        lineHeight: string;
        letterSpacing: string;
    };
};
export type ThemeVars = typeof themeContractValues;
/**
 * A custom theme that is enabled when various conditions are
 */
export type DynamicTheme = {
    /**
     * An optional media query required for the given theme to be enabled. This is useful
     * when you want the theme of your application to automatically switch depending on
     * a media feature.
     *
     * @example '(prefers-color-scheme: dark)'
     */
    mediaQuery?: string;
    /**
     * An optional CSS selector required for the given theme to be enabled. This is useful
     * when you have a manual theme switcher on your application that sets a top-level
     * class name or data-attribute to control the current theme.
     *
     * @example '.data-dark'
     */
    selector?: string;
    /** The theme definitions that will be set when the selector and mediaQuery criteria are matched. */
    variables: ThemeVars;
};
export type Theme = ThemeVars | DynamicTheme[];
export declare const themeVars: {
    blurs: {
        modalOverlay: `var(--${string})`;
    };
    backgroundColors: {
        primaryButton: `var(--${string})`;
        primaryButtonHover: `var(--${string})`;
        outlineButtonHover: `var(--${string})`;
        walletItemHover: `var(--${string})`;
        walletItemSelected: `var(--${string})`;
        modalOverlay: `var(--${string})`;
        modalPrimary: `var(--${string})`;
        modalSecondary: `var(--${string})`;
        iconButton: `var(--${string})`;
        iconButtonHover: `var(--${string})`;
        dropdownMenu: `var(--${string})`;
        dropdownMenuSeparator: `var(--${string})`;
    };
    borderColors: {
        outlineButton: `var(--${string})`;
    };
    colors: {
        primaryButton: `var(--${string})`;
        outlineButton: `var(--${string})`;
        body: `var(--${string})`;
        bodyMuted: `var(--${string})`;
        bodyDanger: `var(--${string})`;
        iconButton: `var(--${string})`;
    };
    radii: {
        small: `var(--${string})`;
        medium: `var(--${string})`;
        large: `var(--${string})`;
        xlarge: `var(--${string})`;
    };
    shadows: {
        primaryButton: `var(--${string})`;
        walletItemSelected: `var(--${string})`;
    };
    fontWeights: {
        normal: `var(--${string})`;
        medium: `var(--${string})`;
        bold: `var(--${string})`;
    };
    fontSizes: {
        small: `var(--${string})`;
        medium: `var(--${string})`;
        large: `var(--${string})`;
        xlarge: `var(--${string})`;
    };
    typography: {
        fontFamily: `var(--${string})`;
        fontStyle: `var(--${string})`;
        lineHeight: `var(--${string})`;
        letterSpacing: `var(--${string})`;
    };
};
export {};
