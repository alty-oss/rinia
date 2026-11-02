import type { ComponentType, ReactNode, SVGProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { AppIcons } from "@/components/foundations/icons";
import { useAppNavigation } from "@/components/layout/app-shell";
import { useTranslation } from "react-i18next";

export interface SettingsBackLink {
    to: string;
    label: string;
    icon?: ReactNode;
}

/**
 * Linear-style settings page: a narrow centered column, or a wider one for grids of cards. Everything scrolls as one:
 * there is no bar above the content to clip it, and the back link sits in the column, above the title.
 */
export function SettingsPage({ title, description, aside, back, wide = false, children }: { title?: string; description?: ReactNode; aside?: ReactNode; back?: SettingsBackLink; wide?: boolean; children: ReactNode }) {
    const { openNavigation } = useAppNavigation();
    const { t } = useTranslation();
    return (
        <div className="h-full min-h-0 overflow-y-auto">
            <div className={`mx-auto w-full px-6 pt-4 pb-16 md:pt-12 ${wide ? "max-w-[56rem]" : "max-w-[42rem]"}`}>
                {/* Phones have no sidebar, so the page opens it there. Without a back link, wider screens show nothing here. */}
                <div className={`flex items-center gap-1 select-none ${back ? "mb-4 md:mb-6" : "mb-4 md:hidden"}`}>
                    <span className="-ml-2 md:hidden">
                        <ButtonUtility icon={AppIcons.Menu} color="tertiary" tooltip={t("nav.expand")} onClick={openNavigation} />
                    </span>
                    {back && (
                        <Link to={back.to} className="-ml-1.5 flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-[13px] text-secondary hover:bg-layer-transparent-hover hover:text-primary">
                            <ChevronLeft className="size-3.5 shrink-0 text-tertiary" aria-hidden="true" />
                            {back.icon}
                            <span className="truncate">{back.label}</span>
                        </Link>
                    )}
                </div>
                {title && (
                    <header className="mb-8 flex select-none flex-wrap items-end justify-between gap-x-6 gap-y-2">
                        <div className="min-w-0">
                            <h1 className="truncate text-[26px] leading-8 font-semibold tracking-tight text-primary">{title}</h1>
                            {description && <p className="mt-2 text-[13px] text-tertiary">{description}</p>}
                        </div>
                        {aside}
                    </header>
                )}
                {children}
            </div>
        </div>
    );
}

/** A titled card of rows. Consecutive groups are spaced like sections. */
export function SettingsGroup({ title, description, children }: { title?: string; description?: ReactNode; children: ReactNode }) {
    return (
        <section className="mt-10 first:mt-0">
            {title && (
                <div className="mb-3 select-none px-1">
                    <h2 className="text-[15px] font-medium text-primary">{title}</h2>
                    {description && <p className="mt-1 text-[13px] text-tertiary">{description}</p>}
                </div>
            )}
            <div className="rounded-xl border border-subtle bg-layer-1 px-4 [&>*+*]:border-t [&>*+*]:border-subtle">{children}</div>
        </section>
    );
}

/** Page heading for panels that render their own title and actions. */
export function SettingsHeading({ title, description, control }: { title: string; description?: string; control?: ReactNode }) {
    return (
        <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div className="flex min-w-0 flex-col gap-2 select-none">
                <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-primary">{title}</h1>
                {description && <p className="text-[13px] text-tertiary">{description}</p>}
            </div>
            {control}
        </header>
    );
}

/**
 * One row inside a SettingsGroup: label and hint on the left, the control on the right. `stacked` puts the control
 * under the label at full width, for values worth reading whole, such as names, addresses and commands.
 */
export function SettingsControl({ title, description, stacked = false, children }: { title: string; description?: ReactNode; stacked?: boolean; children: ReactNode }) {
    if (stacked)
        return (
            <div className="flex flex-col gap-2.5 py-3.5">
                <div className="min-w-0 space-y-0.5 select-none">
                    <h3 className="text-[13px] font-medium text-primary">{title}</h3>
                    {description && <p className="text-[13px] text-tertiary">{description}</p>}
                </div>
                <div className="flex w-full items-start gap-2">{children}</div>
            </div>
        );
    return (
        <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 space-y-0.5 select-none">
                <h3 className="text-[13px] font-medium text-primary">{title}</h3>
                {description && <p className="text-[13px] text-tertiary">{description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">{children}</div>
        </div>
    );
}

/** A row that opens another settings page, with an optional summary value before the chevron. */
export function SettingsLinkRow({ to, icon: Icon, title, description, value }: { to: string; icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; description: string; value?: ReactNode }) {
    return (
        <Link to={to} className="group -mx-4 flex select-none items-center gap-3.5 px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl hover:bg-layer-transparent-hover">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-layer-3 text-secondary">
                <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-primary">{title}</span>
                <span className="block truncate text-[13px] text-tertiary">{description}</span>
            </span>
            {value !== undefined && <span className="shrink-0 text-[13px] text-tertiary">{value}</span>}
            <ChevronRight className="size-4 shrink-0 text-tertiary group-hover:text-secondary" aria-hidden="true" />
        </Link>
    );
}

/** The same height as a `lg` button, so a field and the button beside it line up. */
const settingsFieldBase =
    "h-8 w-full rounded-lg border border-subtle bg-transparent px-3 text-[13px] text-primary outline-none placeholder:text-placeholder focus-visible:border-accent-strong disabled:text-tertiary";

/** Text input sized for the right side of a settings row. */
export const settingsFieldClass = `${settingsFieldBase} sm:w-64`;

/** Text input that fills a stacked row, next to at most a button. */
export const settingsWideFieldClass = `${settingsFieldBase} min-w-0 flex-1`;
