import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { Joyride, EVENTS, STATUS, type Step, type EventData, type Controls } from "react-joyride";
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

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function storageKey(tourId: string) {
    return `tour:${tourId}`;
}

export function TourProvider({ children }: { children: ReactNode }) {
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [activeTourId, setActiveTourId] = useState<string | null>(null);

    const isTourComplete = useCallback((tourId: string) => {
        try {
            const val = localStorage.getItem(storageKey(tourId));
            if (!val) return false;
            const ts = parseInt(val, 10);
            if (isNaN(ts)) return false; // old "done" strings treated as expired
            return Date.now() - ts < TWO_DAYS_MS;
        } catch {
            return false;
        }
    }, []);

    const markComplete = useCallback((tourId: string) => {
        try {
            localStorage.setItem(storageKey(tourId), String(Date.now()));
        } catch {
            // ignore
        }
    }, []);

    const startTour = useCallback(
        (tourId: string, tourSteps: Step[]) => {
            setActiveTourId(tourId);
            setSteps(tourSteps);
            if (!isTourComplete(tourId)) {
                // Small delay so the DOM elements targeted by selectors have time to render
                setTimeout(() => setRun(true), 600);
            }
        },
        [isTourComplete],
    );

    const restartTour = useCallback(
        (tourId: string) => {
            // Clear snooze so the tour auto-shows again after this session
            try { localStorage.removeItem(storageKey(tourId)); } catch { /* ignore */ }
            setRun(false);
            // Need a tick to reset Joyride before restarting
            setTimeout(() => setRun(true), 100);
        },
        [],
    );

    const handleEvent = useCallback(
        (data: EventData, controls: Controls) => {
            const { status, type } = data;

            if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
                setRun(false);
                if (activeTourId) markComplete(activeTourId);
            }
        },
        [activeTourId, markComplete],
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
                    skip: "Skip tour",
                }}
            />
        </TourContext.Provider>
    );
}
