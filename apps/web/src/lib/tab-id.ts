/** Identifies this browser tab to the API, which echoes it in realtime events so the tab can skip the changes it made itself. */
export const TAB_ID = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
