import type { ComponentType, SVGProps } from "react";
import {
    ArrowNarrowLeftOutline, BoardOutline, ChevronDownOutline, CloseOutline,
    GeneralOutline, InboxOutline, UserOutline, ListOutline, LogOutOutline, NewTabArrowOutline, OverviewOutline, PagesOutline,
    ProjectsOutline, SearchOutline, SettingsOutline, LeftSidePaneOutline,
} from "@makeplane/propel/icons";

export type AppIcon = ComponentType<SVGProps<SVGSVGElement>>;
export const AppIcons = {
    ChevronDown: ChevronDownOutline, Close: CloseOutline, Back: ArrowNarrowLeftOutline,
    Board: BoardOutline, Documents: PagesOutline, ExternalLink: NewTabArrowOutline,
    Issues: ListOutline, Menu: LeftSidePaneOutline, Overview: OverviewOutline,
    Projects: ProjectsOutline, Search: SearchOutline, Settings: SettingsOutline,
    SignOut: LogOutOutline, General: GeneralOutline, Inbox: InboxOutline, MyIssues: UserOutline,
} satisfies Record<string, AppIcon>;
