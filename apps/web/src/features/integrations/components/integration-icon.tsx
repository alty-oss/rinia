import { cx } from "@/utils/cx";
import type { Logo } from "../logos";

const tileSizes = { md: "size-9 rounded-lg", lg: "size-12 rounded-xl", xl: "size-16 rounded-2xl" } as const;
const logoSizes = { md: "size-6", lg: "size-8", xl: "size-11" } as const;

/**
 * The brand's logo on a white tile, as integration catalogs show them. A logo that is its own rounded square fills
 * the tile instead. Logos without colours of their own are drawn in near-black.
 */
export function IntegrationTile({ logo, size = "md" }: { logo: Logo; size?: keyof typeof tileSizes }) {
    if (logo.tile === false) return <IntegrationLogo logo={logo} className={cx("shrink-0 overflow-hidden", tileSizes[size])} />;
    return (
        <span className={cx("grid shrink-0 place-items-center bg-white text-[#111]", tileSizes[size])} aria-hidden="true">
            <IntegrationLogo logo={logo} className={logoSizes[size]} />
        </span>
    );
}

/** The logo alone. Its markup is trusted: it comes from `logos.ts`, never from user input. */
export function IntegrationLogo({ logo, className }: { logo: Logo; className?: string }) {
    return <svg viewBox={logo.viewBox} className={className} fill="currentColor" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logo.body }} />;
}
