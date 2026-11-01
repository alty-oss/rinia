import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { urls } from "@/lib/urls";

export type ProjectHomeTab = "overview" | "documents" | "members";

/** Pill tabs shared by the project's home screens: overview, documents, and members. */
export function ProjectHomeTabs({ projectKey, current, actions }: { projectKey: string; current: ProjectHomeTab; actions?: ReactNode }) {
    const { t } = useTranslation();
    const tabs: Array<[ProjectHomeTab, string, string]> = [
        ["overview", t("nav.overview"), urls.project(projectKey)],
        ["documents", t("nav.documents"), urls.documents(projectKey)],
        ["members", t("settings.members"), urls.members(projectKey)],
    ];
    return (
        <nav aria-label={t("nav.projectSections")} className="flex h-12 shrink-0 select-none items-center gap-1.5 px-3">
            {tabs.map(([id, label, to]) => (
                <Link
                    key={id}
                    to={to}
                    aria-current={current === id ? "page" : undefined}
                    className={`flex h-7 items-center rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
                        current === id ? "border-transparent bg-layer-1-selected text-primary" : "border-subtle text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
                    }`}
                >
                    {label}
                </Link>
            ))}
            {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </nav>
    );
}
