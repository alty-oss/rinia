import type { ReactNode } from "react";
import { updateProfileSchema } from "@rinia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { Alert } from "@/components/base/feedback/alert";
import { SettingsControl, SettingsGroup } from "@/components/settings/settings-layout";
import { AvatarUrlPicker } from "@/components/appearance/avatar-url-picker";
import { AUTH_QUERY_KEY, updateProfile } from "@/features/auth/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "react-i18next";

export const UserProfilePanel = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { control, handleSubmit, watch, reset, setError, formState } = useForm({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: { name: user?.name ?? "", avatarUrl: user?.avatarUrl ?? "" },
    });
    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(AUTH_QUERY_KEY, updatedUser);
            reset({ name: updatedUser.name, avatarUrl: updatedUser.avatarUrl ?? "" });
        },
        onError: (error) => setError("root", { message: error instanceof ApiError ? error.message : t("profile.couldNotSave") }),
    });
    if (!user) return null;
    const previewUrl = watch("avatarUrl");
    const initials = user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("");

    const field = "h-8 w-full max-w-xs rounded-md border border-subtle bg-transparent px-2 text-sm text-primary outline-none focus-visible:border-accent-strong disabled:text-tertiary";
    return (
        <div className="w-full">
            <form noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))}>
                <SettingsGroup>
                    <ProfileRow label={t("profile.profilePhoto")}>
                        <span data-profile-avatar className="relative">
                            <Avatar key={previewUrl} src={previewUrl || undefined} initials={initials} size="sm" />
                            <Controller control={control} name="avatarUrl" render={({ field: avatar }) => <AvatarUrlPicker value={avatar.value} initials={initials} onChange={avatar.onChange} disabled={mutation.isPending} />} />
                        </span>
                    </ProfileRow>
                    <ProfileRow label={t("profile.email")}>
                        <span className="truncate text-sm text-secondary">{user.email}</span>
                    </ProfileRow>
                    <ProfileRow label={t("profile.fullName")}>
                        <Controller control={control} name="name" render={({ field: name }) => (
                            <input {...name} required disabled={mutation.isPending} aria-label={t("profile.fullName")} className={field} />
                        )} />
                    </ProfileRow>
                    <ProfileRow label={t("profile.username")} hint={t("profile.usernameHint")}>
                        <input value={user.username} disabled aria-label={t("profile.username")} className={field} />
                    </ProfileRow>
                </SettingsGroup>
                {formState.errors.root && <Alert tone="error">{formState.errors.root.message}</Alert>}
                {mutation.isSuccess && !formState.isDirty && <Alert tone="success">{t("profile.profileSaved")}</Alert>}
                <Button className="mt-4" type="submit" isLoading={mutation.isPending} isDisabled={!formState.isDirty}>
                    {t("common.saveChanges")}
                </Button>
            </form>
            {user.isAdmin && (
                <div className="mt-10">
                    <SettingsControl
                        title={t("profile.databaseBackup")}
                        description={t("profile.backupDescription")}
                    >
                        <Button href="/api/admin/backup" download color="secondary" size="lg" iconLeading={Download}>
                            {t("profile.downloadBackup")}
                        </Button>
                    </SettingsControl>
                </div>
            )}
        </div>
    );
};

function ProfileRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-sm text-primary">{label}</p>
                {hint && <p className="text-xs text-tertiary">{hint}</p>}
            </div>
            {children}
        </div>
    );
}
