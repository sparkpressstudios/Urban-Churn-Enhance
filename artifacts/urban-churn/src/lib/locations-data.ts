export type Hour = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };

export type VendorCategory =
  | "scoop_shop"
  | "grocery"
  | "restaurant"
  | "cafe"
  | "market"
  | "other";

export interface LocationInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  accentColor: string;
  mapUrl: string;
  menuUrl: string;
  hours: Hour[];
  type: "shop" | "vendor";
  hideHours: boolean;
  vendorCategory: VendorCategory | null;
}

function buildHours(spec: Record<number, [string, string] | null>): Hour[] {
  return Array.from({ length: 7 }, (_, d) => {
    const s = spec[d];
    return s
      ? { dayOfWeek: d, openTime: s[0], closeTime: s[1], isClosed: false }
      : { dayOfWeek: d, openTime: "00:00", closeTime: "00:00", isClosed: true };
  });
}

export const LOCATIONS: LocationInfo[] = [
  {
    name: "Carlisle Pike, Mech PA",
    address: "6391 Carlisle Pike",
    city: "Mechanicsburg",
    state: "PA",
    zip: "17050",
    phone: "717-884-9396",
    accentColor: "#d4a853",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=6391%20Carlisle%20Pike%2C%20Mechanicsburg%2C%20PENNSYLVANIA%2017050",
    menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMThuT25TNXZGWEJSZFVoUno3VkpqWnowYkdHYUUxM1MvVVNuNUEydjBXeDZHNmtVM3N4aUZPSGxkMG83NnUzZzBWTVJxbXRNdHN0TUE9PQ==",
    hours: buildHours({
      0: ["12:00", "20:00"],
      1: ["14:00", "21:00"],
      2: ["14:00", "21:00"],
      3: ["14:00", "21:00"],
      4: ["14:00", "21:00"],
      5: ["14:00", "22:00"],
      6: ["12:00", "22:00"],
    }),
    type: "shop",
    hideHours: false,
    vendorCategory: null,
  },
  {
    name: "Carlisle Shop",
    address: "258 Westminster Drive",
    city: "South Middleton Township",
    state: "PA",
    zip: "17013",
    phone: "717-884-9396",
    accentColor: "#A1AB74",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=258%20Westminster%20Drive%2C%20South%20Middleton%20Township%2C%20PENNSYLVANIA%2017013",
    menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMTliUmJ1N2Y4Y3o1WkxPeFNaVjRYZVRrZGo1cXhJR0ZxMHZNMWpFcjlyY2VROTM3UkNDcXcvdUtYaEV0NU5NRGJwT21WNnBlWHY2blE9PQ==",
    hours: buildHours({
      0: ["12:00", "20:00"],
      1: ["14:00", "21:00"],
      2: ["14:00", "21:00"],
      3: ["14:00", "21:00"],
      4: ["14:00", "21:00"],
      5: ["14:00", "22:00"],
      6: ["12:00", "22:00"],
    }),
    type: "shop",
    hideHours: false,
    vendorCategory: null,
  },
  {
    name: "Louise Drive, Mech PA",
    address: "4902 Louise Drive",
    city: "Mechanicsburg",
    state: "PA",
    zip: "17055",
    phone: "717-884-9396",
    accentColor: "#C4886D",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=4902%20Louise%20Drive%2C%20Mechanicsburg%2C%20PENNSYLVANIA%2017055",
    menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMStqMUNlcUlzY1g4bThNTVlKVnpyZVFuUW82cDdHTXh0R1FOV3ZsOElxY2tGSjczMVFPSlhGcmllMTlicUFQQTU1b3g1Skp0eXhsb0E9PQ==",
    hours: buildHours({
      0: null,
      1: ["07:30", "21:00"],
      2: ["07:30", "21:00"],
      3: ["07:30", "21:00"],
      4: ["07:30", "21:00"],
      5: ["07:30", "21:00"],
      6: ["09:00", "21:00"],
    }),
    type: "shop",
    hideHours: false,
    vendorCategory: null,
  },
  {
    name: "UC Harrisburg",
    address: "1004 N 3rd Street",
    city: "Harrisburg",
    state: "PA",
    zip: "17104",
    phone: "717-884-9396",
    accentColor: "#8B5E3C",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=1004%20N%203rd%20Street%2C%20Harrisburg%2C%20PA%2017104",
    menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMThleG5Gd2llcEdRaFdaSUV6bzJHemxmK0MyQ2Q2L1FoeUt2M2luRmx2bmhmWGZYSVR5OGdQSlVJSWxBdTZ0blFqaFBWTXZFQURSN2c9PQ==",
    hours: buildHours({
      0: null,
      1: null,
      2: null,
      3: ["14:00", "20:00"],
      4: ["14:00", "20:00"],
      5: ["12:00", "21:00"],
      6: ["12:00", "21:00"],
    }),
    type: "shop",
    hideHours: false,
    vendorCategory: null,
  },
];

// Map API slug → LOCATIONS index (including legacy slugs)
export const FALLBACK_BY_SLUG: Record<string, number> = {
  "carlisle-pike": 0,
  mechanicsburg: 0,
  carlisle: 1,
  "louise-drive": 2,
  harrisburg: 3,
};

/** Use API locations when available; fall back to static list only if API returned nothing. */
export function mergeLocations(apiLocations: any[] | undefined): LocationInfo[] {
  if (!apiLocations || apiLocations.length === 0) return LOCATIONS;

  return apiLocations.map((a) => {
    // Try to find a matching static fallback for any missing fields
    const fallbackIdx = FALLBACK_BY_SLUG[a.slug as string];
    const fb = fallbackIdx !== undefined ? LOCATIONS[fallbackIdx] : undefined;

    return {
      name: a.name || fb?.name || "",
      address: a.address || fb?.address || "",
      city: a.city || fb?.city || "",
      state: a.state || fb?.state || "",
      zip: a.zip || fb?.zip || "",
      phone: a.phone || fb?.phone || "",
      accentColor: a.accentColor || fb?.accentColor || "#A1AB74",
      mapUrl: a.mapUrl || fb?.mapUrl || "",
      menuUrl: a.menuUrl || fb?.menuUrl || "",
      hours: a.hours?.length ? a.hours : (fb?.hours || []),
      type: a.type || "shop",
      hideHours: a.hideHours ?? false,
      vendorCategory: (a.vendorCategory ?? null) as VendorCategory | null,
    };
  });
}
