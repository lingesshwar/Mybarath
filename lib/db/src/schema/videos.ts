import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const videosTable = pgTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  ecoFilename: text("eco_filename"),
  thumbnailFilename: text("thumbnail_filename"),
  ecoReady: boolean("eco_ready").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({
  createdAt: true,
  ecoReady: true,
});
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
