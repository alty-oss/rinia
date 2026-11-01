/**
 * How long things take to arrive and to leave, in milliseconds. Leaving is quicker. These mirror `--motion-enter`
 * and `--motion-exit` in globals.css, for timers that wait for an animation to finish before unmounting.
 */
export const MOTION = { enter: 200, exit: 120 } as const;

/**
 * How long something stays mounted once it starts leaving. A transition starts a frame or two after the state
 * change that sets its timer, so unmounting at exactly `MOTION.exit` cut the last part of the fade.
 */
export const UNMOUNT_AFTER = MOTION.exit + 100;

/** Transition timing for something that is arriving (`open`) or leaving. */
export function motionTiming(open: boolean) {
    return open ? "duration-(--motion-enter) ease-(--motion-ease-enter)" : "duration-(--motion-exit) ease-(--motion-ease-exit)";
}
