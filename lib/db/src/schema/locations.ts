import {
    pgTable,
    serial,
    text,
    boolean,
    integer,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const locationTypeEnum = pgEnum("location_type", ["shop", "vendor"]);

export const vendorCategoryEnum = pgEnum("vendor_category", [
    "scoop_shop",
    "grocery",
    "restaurant",
    "cafe",
    "market",
    "other",
]);

export const locationsTable = pgTable("locations", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    type: locationTypeEnum("type").notNull().default("shop"),
    vendorCategory: vendorCategoryEnum("vendor_category"),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("PA"),
    zip: text("zip").notNull(),
    phone: text("phone").notNull().default(""),
    mapUrl: text("map_url"),
    imageUrl: text("image_url"),
    accentColor: text("accent_color").default("#A1AB74"),
    menuUrl: text("menu_url"),
    menuEmbedCode: text("menu_embed_code"),
    squareLocationId: text("square_location_id"),
    hideHours: boolean("hide_hours").notNull().default(false),
    showOnPublicPage: boolean("show_on_public_page").notNull().default(true),
    allowPreorderPickup: boolean("allow_preorder_pickup").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const locationHoursTable = pgTable("location_hours", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id")
        .notNull()
        .references(() => locationsTable.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday .. 6=Saturday
    setNumber: integer("set_number").notNull().default(1), // 1=primary, 2=second set (split hours)
    openTime: text("open_time").notNull().default("12:00"),
    closeTime: text("close_time").notNull().default("21:00"),
    isClosed: boolean("is_closed").notNull().default(false),
});

export const locationsRelations = relations(locationsTable, ({ many }) => ({
    hours: many(locationHoursTable),
}));

export const locationHoursRelations = relations(
    locationHoursTable,
    ({ one }) => ({
        location: one(locationsTable, {
            fields: [locationHoursTable.locationId],
            references: [locationsTable.id],
        }),
    }),
);

export const insertLocationSchema = createInsertSchema(locationsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertLocationHoursSchema = createInsertSchema(
    locationHoursTable,
).omit({
    id: true,
});

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locationsTable.$inferSelect;
export type InsertLocationHours = z.infer<typeof insertLocationHoursSchema>;
export type LocationHours = typeof locationHoursTable.$inferSelect;
