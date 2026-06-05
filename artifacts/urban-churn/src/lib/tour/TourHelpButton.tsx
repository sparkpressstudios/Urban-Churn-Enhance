import { HelpCircle } from "lucide-react";
import { useTourContext } from "./TourProvider";

export function TourHelpButton() {
    const { activeTourId, restartTour } = useTourContext();

    if (!activeTourId) return null;

    return (
        <button
            onClick={() => restartTour(activeTourId)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md text-gray-400 hover:text-[#A1AB74] hover:bg-white/10 transition-colors"
            title="Open tutorial"
        >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Tutorial</span>
        </button>
    );
}
