import { useMemo } from "react";
import type { PresenceViewer } from "@rinia/shared";
import { Avatar } from "@/components/base/avatar/avatar";
import { getInitials } from "@/components/base/avatar/utils";
import { Presence, usePresence } from "@/components/base/presence";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { useTranslation } from "react-i18next";

const MAX_SHOWN = 3;

/** The other people on this issue or document, as in Linear's header: a few stacked avatars, then a count. */
export function PresenceAvatars({ viewers }: { viewers: PresenceViewer[] }) {
    const { t } = useTranslation();
    // `usePresence` diffs by identity, so the shown list only changes when the viewers do.
    const shown = useMemo(() => viewers.slice(0, MAX_SHOWN), [viewers]);
    const hidden = viewers.slice(MAX_SHOWN);
    const rows = usePresence(shown, (viewer) => viewer.user.id);
    if (rows.length === 0) return null;
    return (
        <div className="flex items-center -space-x-1" role="group" aria-label={t("realtime.alsoHere")}>
            {rows.map(({ key, item, leaving, entering }) => (
                <Presence key={key} axis="x" leaving={leaving} entering={entering}>
                    <Tooltip title={item.user.name} description={item.editing ? t("realtime.editing") : t("realtime.viewing")} placement="bottom">
                        <span className="relative flex rounded-full" tabIndex={0} aria-label={`${item.user.name}, ${item.editing ? t("realtime.editing") : t("realtime.viewing")}`}>
                            <Avatar src={item.user.avatarUrl ?? undefined} initials={getInitials(item.user.name)} size="xs" className="ring-2 ring-[var(--bg-surface-1)]" />
                            {item.editing && <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-fg-brand-primary ring-2 ring-[var(--bg-surface-1)]" aria-hidden="true" />}
                        </span>
                    </Tooltip>
                </Presence>
            ))}
            {hidden.length > 0 && (
                <Tooltip title={hidden.map((viewer) => viewer.user.name).join(", ")} placement="bottom">
                    <span className="grid size-6 place-items-center rounded-full bg-surface-2 text-[10px] text-tertiary ring-2 ring-[var(--bg-surface-1)]" tabIndex={0} aria-label={t("realtime.more", { count: hidden.length })}>
                        +{hidden.length}
                    </span>
                </Tooltip>
            )}
        </div>
    );
}
