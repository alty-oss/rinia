import type { ReactNode } from "react";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { AppIcons } from "@/components/foundations/icons";
import { useAppNavigation } from "@/components/layout/app-shell";
import { useTranslation } from "react-i18next";

export function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
    const { toggleSidebar } = useAppNavigation();
    const { t } = useTranslation();
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-11 items-center px-3 md:hidden">
                <ButtonUtility icon={AppIcons.Menu} color="tertiary" tooltip={t("nav.expand")} onClick={toggleSidebar} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-3xl px-8 py-8">
                    <h1 className="text-xl font-semibold text-primary">{title}</h1>
                    {children}
                </div>
            </div>
        </div>
    );
}

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
    return (
        <section className="mt-8">
            {title && <h2 className="mb-3 text-sm font-medium text-primary">{title}</h2>}
            <div className="divide-y divide-subtle overflow-hidden rounded-lg border border-subtle">{children}</div>
        </section>
    );
}

export function SettingsHeading({ title, description, control }: { title: string; description?: string; control?: ReactNode }) {
    return (
        <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div className="flex flex-col gap-1">
                <h1 className="text-h3-medium text-primary">{title}</h1>
                {description && <p className="text-body-xs-regular text-tertiary">{description}</p>}
            </div>
            {control}
        </header>
    );
}

export function SettingsControl({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0 space-y-1.5">
                <h2 className="text-body-sm-medium text-primary">{title}</h2>
                <p className="text-caption-md-regular text-tertiary">{description}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </section>
    );
}
