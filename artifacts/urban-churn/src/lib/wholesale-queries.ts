import type { QueryClient } from "@tanstack/react-query";

/** Invalidate wholesale dashboard and related summary queries after mutations. */
export function invalidateWholesaleSummaries(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ["wholesale-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["wholesale-order-stats"] });
}
