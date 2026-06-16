import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { loadSquareSdk, waitForElement } from "@/lib/square-sdk";

type PaymentsState = "loading" | "ready" | "unavailable" | "error";

export function useSquareCard(active: boolean) {
    const cardRef = useRef<any>(null);
    const cardContainerRef = useRef<HTMLDivElement>(null);
    const [retryKey, setRetryKey] = useState(0);
    const [paymentsState, setPaymentsState] = useState<PaymentsState>("loading");
    const [paymentError, setPaymentError] = useState("");

    const retry = useCallback(() => {
        if (cardRef.current) {
            cardRef.current.destroy?.();
            cardRef.current = null;
        }
        setPaymentError("");
        setPaymentsState("loading");
        setRetryKey((k) => k + 1);
    }, []);

    useEffect(() => {
        if (!active) return;

        let cancelled = false;

        (async () => {
            setPaymentsState("loading");
            setPaymentError("");

            try {
                let data: Awaited<ReturnType<typeof api.getSquareAppId>>;
                try {
                    data = await api.getSquareAppId();
                } catch (e) {
                    if (cancelled) return;
                    setPaymentsState("unavailable");
                    setPaymentError(
                        e instanceof Error
                            ? e.message
                            : "Card payments are temporarily unavailable. Please try again later or contact us.",
                    );
                    return;
                }
                if (cancelled) return;

                if (!data?.configured || !data.appId || !data.locationId) {
                    setPaymentsState("unavailable");
                    setPaymentError(
                        data?.error ||
                            "Card payments are temporarily unavailable. Please try again later or contact us.",
                    );
                    return;
                }

                const env = data.environment || "sandbox";
                await loadSquareSdk(env);
                if (cancelled) return;

                const container = await waitForElement(() => cardContainerRef.current);
                if (cancelled) return;

                const payments = (window as any).Square.payments(data.appId, data.locationId);
                const card = await payments.card();
                if (cancelled) return;

                await card.attach(container);
                cardRef.current = card;
                setPaymentsState("ready");
            } catch (e) {
                console.error("[SQUARE] Failed to initialize payment form:", e);
                if (!cancelled) {
                    setPaymentsState("error");
                    setPaymentError(
                        "Payment system unavailable. Please try again or refresh the page.",
                    );
                }
            }
        })();

        return () => {
            cancelled = true;
            if (cardRef.current) {
                cardRef.current.destroy?.();
                cardRef.current = null;
            }
        };
    }, [active, retryKey]);

    return {
        cardRef,
        cardContainerRef,
        squareReady: paymentsState === "ready",
        paymentsRequired: active && paymentsState !== "unavailable",
        paymentsLoading: active && paymentsState === "loading",
        paymentError,
        retry,
    };
}

/** Stable idempotency key for a checkout session (survives refresh, cleared on success). */
const CHECKOUT_ID_STORAGE = "uc-checkout-id";

export function getCheckoutId(): string {
    let id = sessionStorage.getItem(CHECKOUT_ID_STORAGE);
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(CHECKOUT_ID_STORAGE, id);
    }
    return id;
}

export function clearCheckoutId(): void {
    sessionStorage.removeItem(CHECKOUT_ID_STORAGE);
}
