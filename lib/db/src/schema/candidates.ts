import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { positionsTable } from "./positions";
import { usersTable } from "./users";

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull().references(() => positionsTable.id),
  candidateName: text("candidate_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  currentCompany: text("current_company"),
  experience: text("experience"),
  currentCtc: text("current_ctc"),
  expectedCtc: text("expected_ctc"),
  noticePeriod: text("notice_period"),
  source: text("source").notNull().default("LinkedIn"),
  status: text("status").notNull().default("Submitted"),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  resumeFileName: text("resume_file_name"),
  recruiterId: integer("recruiter_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({ id: true, createdAt: true });
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
