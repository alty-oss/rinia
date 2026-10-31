import type { ProjectCover } from "@rinia/shared";
import { parseProjectCover } from "@rinia/shared";
import { cx } from "@/utils/cx";
import { PROJECT_GRADIENT_STYLES } from "@/features/projects/lib/project-gradients";

export function GradientCover({ cover, className }: { cover: ProjectCover | null | undefined; className?: string }) {
    const parsed = parseProjectCover(cover);
    return (
        <div
            className={cx("overflow-hidden bg-surface-2", className)}
            style={parsed ? { backgroundImage: PROJECT_GRADIENT_STYLES[parsed.key] } : undefined}
        />
    );
}
