import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const positionsTable = pgTable("positions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  positionName: text("position_name").notNull(),
  jobDescription: text("job_description"),
  jobDescriptionLink: text("job_description_link"),
  location: text("location").notNull(),
  employmentType: text("employment_type").notNull().default("Permanent"),
  priority: text("priority").notNull().default("Medium"),
  openings: integer("openings").notNull().default(1),
  hiringManager: text("hiring_manager"),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPositionSchema = createInsertSchema(positionsTable).omit({ id: true, createdAt: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positionsTable.$inferSelect;
