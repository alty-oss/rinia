import { Popover } from "@base-ui/react/popover";
import type { EntityIcon, ProjectCover, UpdateProjectInput } from "@rinia/shared";
import { useState } from "react";
import { AppearancePicker } from "@/components/appearance/appearance-picker";
import { GradientPicker } from "@/components/appearance/gradient-picker";
import { parseProjectCover } from "@rinia/shared";
import { useUpdateProject } from "../hooks/use-projects";
import { DEFAULT_PROJECT_ICON, ProjectIcon } from "./project-icon";
import { useTranslation } from "react-i18next";

function asEntityIcon(icon: EntityIcon | string | null | undefined): EntityIcon {
    if (icon && typeof icon === "object") return icon;
    return { type: "icon", key: (typeof icon === "string" && icon) || DEFAULT_PROJECT_ICON };
}

export function ProjectIconControl({
    projectId,
    icon,
    isProjectOwner,
    className,
    iconClassName,
}: {
    projectId: string;
    icon: EntityIcon | string | null | undefined;
    isProjectOwner: boolean;
    className?: string;
    iconClassName?: string;
}) {
    const { t } = useTranslation();
    const update = useUpdateProject(projectId);
    const [open, setOpen] = useState(false);
    const appearance = asEntityIcon(icon);
    const disabled = !isProjectOwner || update.isPending;

    if (!isProjectOwner) {
        return (
            <span className={className}>
                <ProjectIcon icon={appearance} className={iconClassName} />
            </span>
        );
    }

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger disabled={disabled} aria-label={t("settings.changeProjectIcon")} className={className}>
                <ProjectIcon icon={appearance} className={iconClassName} />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={12} className="z-[60]">
                    <Popover.Popup className="max-h-[calc(100dvh-1.5rem)] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-subtle bg-layer-2 p-3 shadow-overlay-200 outline-none">
                        <Popover.Title className="sr-only">{t("settings.projectIcon")}</Popover.Title>
                        <AppearancePicker
                            value={icon && typeof icon === "object" ? icon : undefined}
                            onChange={(iconAppearance) => update.mutate({ iconAppearance: iconAppearance as UpdateProjectInput["iconAppearance"] })}
                            onComplete={() => setOpen(false)}
                        />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

export function ProjectCoverControl({
    projectId,
    cover,
    isProjectOwner,
    triggerClassName,
}: {
    projectId: string;
    cover: ProjectCover | null | undefined;
    isProjectOwner: boolean;
    triggerClassName?: string;
}) {
    const { t } = useTranslation();
    const update = useUpdateProject(projectId);
    const [open, setOpen] = useState(false);
    if (!isProjectOwner) return null;
    const hasBanner = !!parseProjectCover(cover);
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
                disabled={update.isPending}
                className={triggerClassName ?? "inline-flex h-8 items-center gap-2 rounded px-2 text-xs font-medium text-tertiary hover:bg-layer-1-hover hover:text-secondary disabled:opacity-50"}
            >
                {hasBanner ? t("appearance.changeBanner") : t("appearance.addBanner")}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner sideOffset={8} collisionPadding={12} className="z-[60]">
                    <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-subtle bg-layer-2 p-3 shadow-overlay-200 outline-none">
                        <Popover.Title className="sr-only">{t("appearance.projectBanner")}</Popover.Title>
                        <GradientPicker cover={cover} onChange={(next) => update.mutate({ cover: next })} disabled={update.isPending} />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
