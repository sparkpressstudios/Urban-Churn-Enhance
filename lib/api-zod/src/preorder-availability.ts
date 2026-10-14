export type PreorderWindow = {
    id: number;
    flavourId: number | null;
    status: string;
    preOrderStart: string | Date;
    preOrderEnd: string | Date;
};

/** Stored timestamps are instants (including their UTC offset), never local wall time. */
export function preorderState(window: PreorderWindow | undefined, now = Date.now()) {
    if (!window) return "ordinary";
    const start = new Date(window.preOrderStart).getTime();
    const end = new Date(window.preOrderEnd).getTime();
    if (!["open", "scheduled"].includes(window.status) || !Number.isFinite(start) ||
        !Number.isFinite(end) || now >= end) return "closed";
    return now < start ? "upcoming" : "open";
}

/** Keep preorder identity after ordering AND pickup end. A new open cycle can reopen it. */
export function selectPreorderWindows<T extends PreorderWindow>(windows: T[], now = Date.now()): T[] {
    const byFlavour = new Map<number, T[]>();
    for (const window of windows) {
        if (window.flavourId === null || window.status === "draft") continue;
        const group = byFlavour.get(window.flavourId) ?? [];
        group.push(window);
        byFlavour.set(window.flavourId, group);
    }
    return [...byFlavour.values()].map(group => {
        const open = group.filter(window => preorderState(window, now) === "open");
        const started = group.filter(window => new Date(window.preOrderStart).getTime() <= now);
        const candidates = open.length ? open : started.length ? started : group;
        return candidates.sort((a, b) => {
            const delta = new Date(b.preOrderStart).getTime() - new Date(a.preOrderStart).getTime();
            return (open.length || started.length ? delta : -delta) || b.id - a.id;
        })[0];
    });
}

export function preorderUnavailableMessage(window: PreorderWindow | undefined, now = Date.now()) {
    const state = preorderState(window, now);
    return state === "closed" ? "Preorders closed" : state === "upcoming" ? "Preorders not yet open" : null;
}
