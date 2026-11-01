import { useState, type FormEvent } from "react";
import { createApiTokenSchema } from "@rinia/shared";
import { CopyOutline, DeleteOutline, KeyOutline } from "@makeplane/propel/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Alert } from "@/components/base/feedback/alert";
import { ConfirmDialog } from "@/components/overlay/confirm-dialog";
import { SettingsControl, SettingsGroup, settingsFieldClass } from "@/components/settings/settings-layout";
import { API_TOKENS_QUERY_KEY, createApiToken, fetchApiTokens, revokeApiToken, type ApiToken } from "@/features/auth/api";
import { useClipboard } from "@/hooks/use-clipboard";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "react-i18next";

/** Personal tokens for tools such as Claude Code. A new token is shown once, right after it is created. */
export const ApiTokensPanel = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data: tokens, isError } = useQuery({ queryKey: API_TOKENS_QUERY_KEY, queryFn: fetchApiTokens });
    const [name, setName] = useState("");
    const [secret, setSecret] = useState<string | null>(null);
    const { copied, copy } = useClipboard();

    const create = useMutation({
        mutationFn: createApiToken,
        onSuccess: (created) => {
            setSecret(created.secret);
            setName("");
            queryClient.setQueryData<ApiToken[]>(API_TOKENS_QUERY_KEY, (current) => [created.token, ...(current ?? [])]);
        },
    });
    const revoke = useMutation({
        mutationFn: revokeApiToken,
        onSuccess: (_result, tokenId) => queryClient.setQueryData<ApiToken[]>(API_TOKENS_QUERY_KEY, (current) => current?.filter((token) => token.id !== tokenId)),
    });

    const parsed = createApiTokenSchema.safeParse({ name });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (parsed.success) create.mutate(parsed.data);
    };
    const failure = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

    return (
        <SettingsGroup title={t("profile.apiTokens")} description={t("profile.apiTokensDescription")}>
            <form noValidate onSubmit={submit}>
                <SettingsControl title={t("profile.tokenName")} description={t("profile.tokenNameHint")}>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={80}
                        placeholder={t("profile.tokenNamePlaceholder")}
                        aria-label={t("profile.tokenName")}
                        disabled={create.isPending}
                        className={settingsFieldClass}
                    />
                    <Button type="submit" size="sm" color="secondary" isLoading={create.isPending} isDisabled={!parsed.success}>
                        {t("profile.createToken")}
                    </Button>
                </SettingsControl>
            </form>

            {secret && (
                <div className="flex flex-col gap-3 py-3.5">
                    <div className="space-y-0.5">
                        <h3 className="text-[13px] font-medium text-primary">{t("profile.newToken")}</h3>
                        <p className="text-[13px] text-tertiary">{t("profile.newTokenHint")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <code data-api-token className="min-w-0 flex-1 truncate rounded-lg border border-subtle bg-layer-2 px-3 py-2 font-mono text-[12px] text-primary select-all">
                            {secret}
                        </code>
                        <ButtonUtility icon={CopyOutline} color="secondary" tooltip={copied ? t("profile.tokenCopied") : t("profile.copyToken")} onClick={() => void copy(secret)} />
                    </div>
                    <div className="flex justify-end">
                        <Button size="sm" color="secondary" onClick={() => setSecret(null)}>
                            {t("profile.hideToken")}
                        </Button>
                    </div>
                </div>
            )}

            {(create.isError || revoke.isError || isError) && (
                <div className="py-3.5">
                    <Alert tone="error">
                        {create.isError ? failure(create.error, t("profile.couldNotCreateToken")) : revoke.isError ? failure(revoke.error, t("profile.couldNotRevokeToken")) : t("profile.couldNotLoadTokens")}
                    </Alert>
                </div>
            )}

            {tokens?.length === 0 && !secret && <p className="py-3.5 text-[13px] text-tertiary">{t("profile.noApiTokens")}</p>}
            {tokens?.map((token) => <ApiTokenRow key={token.id} token={token} isRevoking={revoke.isPending && revoke.variables === token.id} onRevoke={() => revoke.mutate(token.id)} />)}
        </SettingsGroup>
    );
};

function ApiTokenRow({ token, isRevoking, onRevoke }: { token: ApiToken; isRevoking: boolean; onRevoke: () => void }) {
    const { t, i18n } = useTranslation();
    const date = (value: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
    return (
        <div className="flex items-center gap-3 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-layer-3 text-secondary">
                <KeyOutline className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-primary">{token.name}</p>
                <p className="truncate text-[13px] text-tertiary">
                    <span className="font-mono text-[12px]">{token.prefix}…</span>
                    {" · "}
                    {t("profile.tokenCreatedOn", { date: date(token.createdAt) })}
                    {" · "}
                    {token.lastUsedAt ? t("profile.tokenLastUsed", { date: date(token.lastUsedAt) }) : t("profile.tokenNeverUsed")}
                </p>
            </div>
            <ConfirmDialog
                trigger={<ButtonUtility icon={DeleteOutline} size="sm" color="tertiary" tooltip={t("profile.revokeTokenNamed", { name: token.name })} isDisabled={isRevoking} />}
                title={t("profile.revokeToken")}
                description={t("profile.revokeTokenDescription", { name: token.name })}
                confirmLabel={t("profile.revokeToken")}
                isPending={isRevoking}
                onConfirm={onRevoke}
            />
        </div>
    );
}
