import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { preorderState, selectPreorderWindows, type PreorderWindow } from "@workspace/api-zod/preorder-availability";
import { api } from "@/lib/api";

type PublicPreorder = PreorderWindow & {
  pickupDate: string;
  pickupEndDate: string | null;
  flavourName: string;
};

export function usePreorderAvailability(locationId?: number) {
  const query = useQuery<PublicPreorder[]>({
    queryKey: ["active-pre-orders", locationId ?? null],
    queryFn: () => api.getActivePreOrders(locationId),
    staleTime: 0,
    refetchInterval: 30_000,
  });
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const windows = selectPreorderWindows(query.data ?? [], now).map(window => ({
    ...window,
    acceptingOrders: preorderState(window, now) === "open",
  }));
  return { ...query, windows, ready: query.isSuccess && !query.isError };
}
