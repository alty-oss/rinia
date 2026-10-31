import { projectGradientKeys, type ProjectCover, type ProjectGradientKey } from "@rinia/shared";
import { parseProjectCover } from "@rinia/shared";
import { cx } from "@/utils/cx";
import { PROJECT_GRADIENT_STYLES } from "@/features/projects/lib/project-gradients";
import { useTranslation } from "react-i18next";

const GRADIENT_LABELS: Record<ProjectGradientKey, "gradientAurora" | "gradientDusk" | "gradientEmber" | "gradientLagoon" | "gradientMidnight" | "gradientOrchid" | "gradientPine" | "gradientSlate"> = {
    aurora: "gradientAurora",
    dusk: "gradientDusk",
    ember: "gradientEmber",
    lagoon: "gradientLagoon",
    midnight: "gradientMidnight",
    orchid: "gradientOrchid",
    pine: "gradientPine",
    slate: "gradientSlate",
};

export function GradientPicker({
    cover,
    onChange,
    disabled,
}: {
    cover: ProjectCover | null | undefined;
    onChange: (cover: ProjectCover | null) => void;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    const selected = parseProjectCover(cover)?.key ?? null;
    return (
        <div>
            <p className="mb-2 text-xs font-medium text-tertiary">{t("appearance.projectBanner")}</p>
            <div className="grid grid-cols-4 gap-1.5" role="listbox" aria-label={t("appearance.projectBanner")}>
                <button
                    type="button"
                    role="option"
                    aria-selected={!selected}
                    aria-label={t("appearance.noBanner")}
                    disabled={disabled}
                    onClick={() => onChange(null)}
                    className={cx(
                        "h-9 rounded-md border bg-surface-2 disabled:opacity-50",
                        !selected ? "border-accent-strong ring-2 ring-accent-strong/40" : "border-subtle hover:border-strong",
                    )}
                />
                {projectGradientKeys.map((key) => (
                    <button
                        key={key}
                        type="button"
                        role="option"
                        aria-selected={selected === key}
                        aria-label={t(`appearance.${GRADIENT_LABELS[key]}`)}
                        disabled={disabled}
                        onClick={() => onChange({ type: "gradient", key })}
                        className={cx(
                            "h-9 rounded-md border disabled:opacity-50",
                            selected === key ? "border-accent-strong ring-2 ring-accent-strong/40" : "border-subtle hover:border-strong",
                        )}
                        style={{ backgroundImage: PROJECT_GRADIENT_STYLES[key] }}
                    />
                ))}
            </div>
        </div>
    );
}
