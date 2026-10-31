import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";
import { RiniaIcon } from "./rinia-icon";

export const RiniaLogo = (props: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div {...props} className={cx("flex items-center gap-2", props.className)}>
            <RiniaIcon className="size-6 shrink-0 text-primary" />
            <span className="text-md font-semibold whitespace-nowrap text-primary">Rinia</span>
        </div>
    );
};
