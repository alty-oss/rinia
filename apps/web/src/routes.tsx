import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppShell } from "@/components/layout/app-shell";
import { AuthLayout } from "@/components/layout/auth-layout";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { useTranslation } from "react-i18next";

const ProjectSettingsPage = lazy(() => import("@/pages/project-settings-page").then((module) => ({ default: module.ProjectSettingsPage })));
const AdminSettingsPage = lazy(() => import("@/pages/admin-settings-page").then((module) => ({ default: module.AdminSettingsPage })));
const ProfileSettingsPage = lazy(() => import("@/pages/profile-settings-page").then((module) => ({ default: module.ProfileSettingsPage })));
const DesignSystemPage = lazy(() => import("@/pages/design-system-page").then((module) => ({ default: module.default })));

const IssueView = lazy(() => import("@/features/issues/components/issue-view").then((module) => ({ default: module.IssueView })));
const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })));
const NotFound = lazy(() => import("@/pages/not-found").then((module) => ({ default: module.NotFound })));
const ProjectDocumentPage = lazy(() => import("@/pages/project-documents-page").then((module) => ({ default: module.ProjectDocumentPage })));
const ProjectDocumentsPage = lazy(() => import("@/pages/project-documents-page").then((module) => ({ default: module.ProjectDocumentsPage })));
const ProjectMembersPage = lazy(() => import("@/pages/project-members-page").then((module) => ({ default: module.ProjectMembersPage })));
const ProjectIssuesPage = lazy(() => import("@/pages/project-issues-page").then((module) => ({ default: module.ProjectIssuesPage })));
const ProjectOverviewPage = lazy(() => import("@/pages/project-overview-page").then((module) => ({ default: module.ProjectOverviewPage })));
const PreferencesSettingsPage = lazy(() => import("@/pages/preferences-settings-page").then((module) => ({ default: module.PreferencesSettingsPage })));
const ProjectsPage = lazy(() => import("@/pages/projects-page").then((module) => ({ default: module.ProjectsPage })));
const RegisterPage = lazy(() => import("@/pages/register-page").then((module) => ({ default: module.RegisterPage })));

function IssuesListRedirect() {
    const { projectId } = useParams();
    const [params] = useSearchParams();
    const search = params.toString();
    return <Navigate replace to={`/projects/${projectId}/issues${search ? `?${search}` : ""}`} />;
}

function BoardRedirect() {
    const { projectId } = useParams();
    const [params] = useSearchParams();
    const next = new URLSearchParams(params);
    next.set("view", "board");
    return <Navigate replace to={`/projects/${projectId}/issues?${next.toString()}`} />;
}

export const AppRoutes = () => {
    const { t } = useTranslation();

    return (
        <Suspense fallback={<div className="min-h-dvh bg-canvas" aria-hidden="true" />}>
            <Routes>
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>

                <Route
                    element={
                        <RequireAuth>
                            <AppShell />
                        </RequireAuth>
                    }
                >
                    <Route path="/" element={<ProjectsPage />} />
                    <Route path="/settings/profile" element={<ProfileSettingsPage />} />
                    <Route path="/settings/preferences" element={<PreferencesSettingsPage />} />
                    <Route path="/settings/admin" element={<AdminSettingsPage />} />
                    <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
                    <Route path="/projects/:projectId/settings/:section" element={<ProjectSettingsPage />} />
                    <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
                    <Route path="/projects/:projectId/issues" element={<ProjectIssuesPage />} />
                    <Route path="/projects/:projectId/issues/list" element={<IssuesListRedirect />} />
                    <Route path="/projects/:projectId/issues/:issueIdentifier" element={<IssueView />} />
                    <Route path="/projects/:projectId/board" element={<BoardRedirect />} />
                    <Route path="/projects/:projectId/members" element={<ProjectMembersPage />} />
                    <Route path="/projects/:projectId/documents" element={<ProjectDocumentsPage />} />
                    <Route path="/projects/:projectId/documents/:documentId" element={<ProjectDocumentPage />} />
                    <Route path="/projects/:projectId/page" element={<Navigate replace to="../documents" />} />
                </Route>

                {import.meta.env.DEV && (
                    <Route
                        path="/__design-system"
                        element={
                            <Suspense fallback={<LoadingState label={t("common.loadingPage")} className="p-6" />}>
                                <DesignSystemPage />
                            </Suspense>
                        }
                    />
                )}
                <Route
                    path="*"
                    element={
                        <Suspense fallback={<LoadingState label={t("common.loadingPage")} className="p-6" />}>
                            <NotFound />
                        </Suspense>
                    }
                />
            </Routes>

        </Suspense>
    );
};
