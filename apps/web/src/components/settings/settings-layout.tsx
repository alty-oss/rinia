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

/** Linear-style settings page: an optional back link, then a narrow centered column. */
export function SettingsPage({ title, description, aside, back, children }: { title?: string; description?: ReactNode; aside?: ReactNode; back?: SettingsBackLink; children: ReactNode }) {
    const { toggleSidebar } = useAppNavigation();
    const { t } = useTranslation();
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-11 shrink-0 items-center gap-1 px-3">
                <span className="md:hidden">
                    <ButtonUtility icon={AppIcons.Menu} color="tertiary" tooltip={t("nav.expand")} onClick={toggleSidebar} />
                </span>
                {back && (
                    <Link to={back.to} className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-[13px] text-secondary hover:bg-layer-transparent-hover hover:text-primary">
                        <ChevronLeft className="size-3.5 shrink-0 text-tertiary" aria-hidden="true" />
                        {back.icon}
                        <span className="truncate">{back.label}</span>
                    </Link>
                )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[42rem] px-6 pt-6 pb-16">
                    {title && (
                        <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
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
        </div>
    );
}

/** A titled card of rows. Consecutive groups are spaced like sections. */
export function SettingsGroup({ title, description, children }: { title?: string; description?: ReactNode; children: ReactNode }) {
    return (
        <section className="mt-10 first:mt-0">
            {title && (
                <div className="mb-3 px-1">
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
            <div className="flex min-w-0 flex-col gap-2">
                <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-primary">{title}</h1>
                {description && <p className="text-[13px] text-tertiary">{description}</p>}
            </div>
            {control}
        </header>
    );
}

/** One row inside a SettingsGroup: label and hint on the left, the control on the right. */
export function SettingsControl({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 space-y-0.5">
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
        <Link to={to} className="group -mx-4 flex items-center gap-3.5 px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl hover:bg-layer-transparent-hover">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-layer-2 text-secondary">
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

/** Text input sized for the right side of a settings row. */
export const settingsFieldClass =
    "h-9 w-full rounded-lg border border-subtle bg-transparent px-3 text-[13px] text-primary outline-none placeholder:text-placeholder focus-visible:border-accent-strong disabled:text-tertiary sm:w-64";
