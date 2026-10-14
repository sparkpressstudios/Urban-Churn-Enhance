export const customerEditFields = [
    "firstName", "lastName", "email", "phone",
    "address", "city", "state", "zip", "country",
] as const;

export type CustomerEditField = typeof customerEditFields[number];
export type CustomerEditData = Partial<Record<CustomerEditField, string>>;

/**
 * Accept only customer contact/profile fields. Never accept account/security,
 * Square, spend, or order-stat fields from an administrative form.
 */
export function parseCustomerEdit(input: unknown): { data?: CustomerEditData; error?: string } {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return { error: "Customer details are required" };
    }
    const body = input as Record<string, unknown>;
    const keys = Object.keys(body);
    if (keys.length === 0 || keys.some((key) => !customerEditFields.includes(key as CustomerEditField))) {
        return { error: "Only customer contact and address fields can be edited" };
    }

    const data: CustomerEditData = {};
    for (const key of keys as CustomerEditField[]) {
        if (typeof body[key] !== "string") return { error: `${key} must be text` };
        const value = (body[key] as string).trim();
        const max = key === "email" ? 254 : key === "address" ? 300 : key === "phone" ? 40 : 120;
        if (value.length > max) return { error: `${key} is too long` };
        data[key] = key === "email" ? value.toLowerCase() : value;
    }

    if ("email" in data && (!data.email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email))) {
        return { error: "Enter a valid email address" };
    }
    return { data };
}
