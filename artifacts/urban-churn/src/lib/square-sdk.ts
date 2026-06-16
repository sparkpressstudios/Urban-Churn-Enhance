const SQUARE_SCRIPT_ID = "square-web-payments-sdk";

function squareSdkUrl(environment: string): string {
    return environment === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
}

/** Load Square Web Payments SDK, reloading if environment changed. */
export async function loadSquareSdk(environment: string): Promise<void> {
    const url = squareSdkUrl(environment);
    const existing = document.getElementById(SQUARE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
        const loadedEnv = existing.dataset.squareEnv;
        if (loadedEnv === environment && (window as any).Square) {
            return;
        }
        existing.remove();
        delete (window as any).Square;
    }

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = SQUARE_SCRIPT_ID;
        script.src = url;
        script.dataset.squareEnv = environment;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Square SDK"));
        document.head.appendChild(script);
    });
}

/** Wait until a ref is attached to the DOM (fixes card.attach race). */
export function waitForElement(
    getEl: () => HTMLElement | null,
    timeoutMs = 5000,
): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
        const started = Date.now();

        const tick = () => {
            const el = getEl();
            if (el) {
                resolve(el);
                return;
            }
            if (Date.now() - started > timeoutMs) {
                reject(new Error("Payment form container not ready"));
                return;
            }
            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });
}
