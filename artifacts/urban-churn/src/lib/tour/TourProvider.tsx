import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { Joyride, STATUS, type Step, type EventData } from "react-joyride";
import { TourTooltip } from "./TourTooltip";

interface TourContextValue {
    /** Register and start a tour for the current page */
    startTour: (tourId: string, steps: Step[]) => void;
    /** Replay a previously completed tour */
    restartTour: (tourId: string) => void;
    /** Check if a tour has been completed */
    isTourComplete: (tourId: string) => boolean;
    /** The currently-registered tour id (for the help button) */
    activeTourId: string | null;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext() {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error("useTourContext must be used within a TourProvider");
    return ctx;
}

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(tourId: string) {
    return `tour:${tourId}`;
}

/** True when the tour should not auto-start (snoozed or permanently completed). */
function isTourSuppressed(tourId: string): boolean {
    try {
        const val = localStorage.getItem(storageKey(tourId));
        if (!val) return false;
        if (val === "done") return true;
        const ts = parseInt(val, 10);
        if (isNaN(ts)) return false;
        return Date.now() - ts < SNOOZE_MS;
    } catch {
        return false;
    }
}

export function TourProvider({ children }: { children: ReactNode }) {
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [activeTourId, setActiveTourId] = useState<string | null>(null);

    const isTourComplete = useCallback((tourId: string) => isTourSuppressed(tourId), []);

    const markSnoozed = useCallback((tourId: string) => {
        try {
            localStorage.setItem(storageKey(tourId), String(Date.now()));
        } catch {
            // ignore
        }
    }, []);

    const markFinished = useCallback((tourId: string) => {
        try {
            localStorage.setItem(storageKey(tourId), "done");
        } catch {
            // ignore
        }
    }, []);

    const startTour = useCallback(
        (tourId: string, tourSteps: Step[]) => {
            setActiveTourId(tourId);
            setSteps(tourSteps);
            if (!isTourSuppressed(tourId)) {
                // Small delay so the DOM elements targeted by selectors have time to render
                setTimeout(() => setRun(true), 600);
            }
        },
        [],
    );

    const restartTour = useCallback(
        (tourId: string) => {
            // Clear snooze/completion so the tutorial opens immediately
            try { localStorage.removeItem(storageKey(tourId)); } catch { /* ignore */ }
            setRun(false);
            // Need a tick to reset Joyride before restarting
            setTimeout(() => setRun(true), 100);
        },
        [],
    );

    const handleEvent = useCallback(
        (data: EventData) => {
            const { status } = data;

            if (status === STATUS.SKIPPED) {
                setRun(false);
                if (activeTourId) markSnoozed(activeTourId);
            } else if (status === STATUS.FINISHED) {
                setRun(false);
                if (activeTourId) markFinished(activeTourId);
            }
        },
        [activeTourId, markSnoozed, markFinished],
    );

    const value = useMemo<TourContextValue>(
        () => ({ startTour, restartTour, isTourComplete, activeTourId }),
        [startTour, restartTour, isTourComplete, activeTourId],
    );

    return (
        <TourContext.Provider value={value}>
            {children}
            <Joyride
                steps={steps}
                run={run}
                continuous
                tooltipComponent={TourTooltip}
                onEvent={handleEvent}
                options={{
                    skipBeacon: true,
                    overlayColor: "rgba(0, 0, 0, 0.55)",
                    arrowColor: "#1a1a24",
                    zIndex: 10000,
                }}
                locale={{
                    back: "Back",
                    close: "Got it",
                    last: "Done",
                    next: "Next",
                    skip: "Hide for 7 days",
                }}
            />
        </TourContext.Provider>
    );
}
