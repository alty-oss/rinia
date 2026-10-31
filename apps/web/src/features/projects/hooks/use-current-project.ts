import { useLocation } from "react-router";
import { projectKeyOf } from "@/lib/urls";
import { useProjects } from "./use-projects";

/** The project key the current URL points into: `/project/RIN/...`, `/settings/project/RIN/...`, or `/issue/RIN-4/...`. */
export function useCurrentProjectKey(): string | null {
    const { pathname } = useLocation();
    const project = pathname.match(/^\/(?:settings\/)?project\/([^/]+)/);
    if (project) return decodeURIComponent(project[1]!).toUpperCase();
    const issue = pathname.match(/^\/issue\/([^/]+)/);
    return issue ? projectKeyOf(decodeURIComponent(issue[1]!)) : null;
}

/** The listed project the current URL belongs to, if any. */
export function useCurrentProject() {
    const key = useCurrentProjectKey();
    const { data: projects } = useProjects();
    return key ? projects?.find((project) => project.issueKey === key) ?? null : null;
}
