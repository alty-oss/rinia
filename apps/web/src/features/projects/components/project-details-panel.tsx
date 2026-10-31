import { updateProjectSchema } from "@rinia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/base/buttons/button";
import { Alert } from "@/components/base/feedback/alert";
import { ErrorMessage } from "@/components/feedback/error-message";
import { LoadingState } from "@/components/feedback/loading-state";
import { ControlledSettingsInput as ControlledInput, ControlledSettingsDescription } from "@/components/settings/settings-input";
import { SettingsControl } from "@/components/settings/settings-layout";
import { ApiError } from "@/lib/api-client";
import { useProject } from "../hooks/use-project";
import { useUpdateProject } from "../hooks/use-projects";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectCoverControl, ProjectIconControl } from "./project-appearance-controls";
import { useTranslation } from "react-i18next";

export const ProjectDetailsPanel = ({ projectId, isProjectOwner }: { projectId: string; isProjectOwner: boolean }) => {
    const { t } = useTranslation();
    const { data: project, isLoading, isError } = useProject(projectId);
    const mutation = useUpdateProject(projectId);
    const { control, handleSubmit, setError, formState } = useForm({
        resolver: zodResolver(updateProjectSchema),
        values: project
            ? {
                  name: project.name,
                  issueKey: project.issueKey,
                  description: project.description ?? "",
                  repositoryUrl: project.repositoryUrl ?? "",
              }
            : undefined,
        resetOptions: { keepDirtyValues: true },
    });
    if (isLoading) return <LoadingState label={t("settings.loadingProject")} />;
    if (isError || !project) return <ErrorMessage message={t("settings.couldNotLoadProject")} />;
    const disabled = !isProjectOwner || mutation.isPending;

    return (
        <div>
            <div className="mt-6 flex items-center gap-3">
                <ProjectIconControl
                    projectId={projectId}
                    icon={project.iconAppearance ?? project.icon}
                    isProjectOwner={isProjectOwner}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-primary text-white outline-accent-strong"
                    iconClassName="size-4"
                />
                <ProjectCoverControl projectId={projectId} cover={project.cover} isProjectOwner={isProjectOwner} />
            </div>
            <form
                noValidate
                onSubmit={handleSubmit((data) =>
                    mutation.mutate(data, {
                        onError: (error) => setError("root", { message: error instanceof ApiError ? error.message : t("settings.couldNotSaveProject") }),
                    }),
                )}
            >
                <div className="mt-8 flex flex-col gap-8">
                    <ControlledInput control={control} name="name" label={t("projects.projectName")} isRequired isDisabled={disabled} />
                    <ControlledSettingsDescription control={control} name="description" isDisabled={disabled} />
                    <div className="grid gap-6 md:grid-cols-2">
                        <ControlledInput
                            control={control}
                            name="issueKey"
                            label={t("projects.projectId")}
                            isDisabled={disabled || project.nextIssueNumber > 1}
                            hint={
                                project.nextIssueNumber > 1 ? t("settings.projectIdLocked") : t("projects.projectIssueKeyHint")
                            }
                        />
                        <ControlledInput
                            control={control}
                            name="repositoryUrl"
                            label={t("projects.repository")}
                            isDisabled={disabled}
                            placeholder="https://github.com/..."
                        />
                    </div>
                    {formState.errors.root && <Alert tone="error">{formState.errors.root.message}</Alert>}
                    {mutation.isSuccess && !formState.isDirty && <Alert tone="success">{t("settings.projectDetailsSaved")}</Alert>}
                    {isProjectOwner && (
                        <div className="py-2">
                            <Button type="submit" size="lg" isLoading={mutation.isPending} isDisabled={!formState.isDirty}>
                                {t("common.saveChanges")}
                            </Button>
                        </div>
                    )}
                </div>
            </form>
            {isProjectOwner && (
                <div className="mt-10">
                    <SettingsControl
                        title={t("projects.deleteProject")}
                        description={t("settings.deleteProjectDescription")}
                    >
                        <DeleteProjectDialog project={project} />
                    </SettingsControl>
                </div>
            )}
        </div>
    );
};
