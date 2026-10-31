import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";
import { RiniaIcon } from "./rinia-icon";

export const RiniaLogo = (props: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div {...props} className={cx("flex items-center gap-2", props.className)}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary p-1.5 text-white">
                <RiniaIcon className="size-full" />
            </span>
            <span className="text-md font-semibold whitespace-nowrap text-primary">Rinia</span>
        </div>
    );
};
