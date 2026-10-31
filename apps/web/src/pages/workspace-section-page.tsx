import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { NotFound } from "./not-found";

const sections = {
    inbox: "nav.inbox",
    "my-issues": "nav.myIssues",
    reviews: "nav.reviews",
    agent: "nav.agent",
    views: "nav.views",
    loops: "nav.loops",
    more: "nav.more",
    import: "nav.importIssues",
    repository: "nav.connectRepository",
} as const;

export function WorkspaceSectionPage() {
    const { section = "" } = useParams();
    const { t } = useTranslation();
    const key = sections[section as keyof typeof sections];
    if (!key) return <NotFound />;
    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex h-11 shrink-0 items-center border-b border-subtle px-4 text-sm font-medium">{t(key)}</header>
            <div className="flex flex-1 items-center justify-center px-6 text-sm text-tertiary">{t("nav.nothingHere")}</div>
        </div>
    );
}
