import type { TooltipRenderProps } from "react-joyride";

export function TourTooltip({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    size,
    isLastStep,
}: TooltipRenderProps) {
    return (
        <div
            {...tooltipProps}
            className="bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl max-w-sm p-0 text-white"
        >
            {step.title && (
                <div className="px-5 pt-4 pb-2">
                    <h3 className="text-sm font-semibold text-[#A1AB74]">{step.title}</h3>
                </div>
            )}
            <div className="px-5 pb-4 text-sm text-gray-300 leading-relaxed">
                {step.content}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/[0.02] rounded-b-xl">
                <div className="flex items-center gap-3">
                    <button
                        {...skipProps}
                        title="Tutorial will reappear in 7 days. Use the Tour button to open it anytime."
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
                    >
                        Hide for 7 days
                    </button>
                    <span className="text-xs text-gray-600">
                        {index + 1} / {size}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {index > 0 && (
                        <button
                            {...backProps}
                            className="px-3 py-1.5 text-xs rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            Back
                        </button>
                    )}
                    {continuous ? (
                        <button
                            {...primaryProps}
                            className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#A1AB74] text-[#111118] hover:bg-[#B5BF88] transition-colors"
                        >
                            {isLastStep ? "Done" : "Next"}
                        </button>
                    ) : (
                        <button
                            {...closeProps}
                            className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#A1AB74] text-[#111118] hover:bg-[#B5BF88] transition-colors"
                        >
                            Got it
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
