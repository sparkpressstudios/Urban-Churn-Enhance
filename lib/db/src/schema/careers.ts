import {
    pgTable,
    serial,
    text,
    boolean,
    integer,
    timestamp,
    pgEnum,
    json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Enums ──

export const jobTypeEnum = pgEnum("job_type", [
    "full_time",
    "part_time",
    "seasonal",
]);

// ── Tables ──

export const jobPostingsTable = pgTable("job_postings", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    locations: text("locations").notNull().default(""),
    type: jobTypeEnum("type").notNull().default("part_time"),
    description: text("description").notNull().default(""),
    highlights: json("highlights").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const careerBenefitsTable = pgTable("career_benefits", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    iconName: text("icon_name").notNull().default("star"),
    iconColor: text("icon_color").notNull().default("#d4a853"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Insert Schemas ──

export const insertJobPostingSchema = createInsertSchema(jobPostingsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertCareerBenefitSchema = createInsertSchema(careerBenefitsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// ── Types ──

export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobPosting = typeof jobPostingsTable.$inferSelect;

export type InsertCareerBenefit = z.infer<typeof insertCareerBenefitSchema>;
export type CareerBenefit = typeof careerBenefitsTable.$inferSelect;
