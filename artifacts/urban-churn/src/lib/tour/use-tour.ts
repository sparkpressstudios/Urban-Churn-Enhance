import { useEffect, useRef } from "react";
import type { Step } from "react-joyride";
import { useTourContext } from "./TourProvider";

/**
 * Register and auto-start a page-level tour.
 * Call once per page component, passing a stable tourId and steps array.
 */
export function useTour(tourId: string, steps: Step[]) {
    const { startTour, restartTour, isTourComplete, activeTourId } = useTourContext();
    const registered = useRef(false);

    useEffect(() => {
        if (!registered.current) {
            registered.current = true;
            startTour(tourId, steps);
        }
        // Re-register if tourId changes (e.g. navigating between pages)
        return () => {
            registered.current = false;
        };
    }, [tourId]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        replay: () => restartTour(tourId),
        isComplete: isTourComplete(tourId),
        isActive: activeTourId === tourId,
    };
}
