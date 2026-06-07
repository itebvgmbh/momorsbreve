import { pgTable, serial, integer, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const supportConversations = pgTable("support_conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("sonstiges"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => supportConversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  isAdmin: boolean("is_admin").notNull().default(false),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSupportConversationSchema = createInsertSchema(supportConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export type SupportConversation = typeof supportConversations.$inferSelect;
export type InsertSupportConversation = z.infer<typeof insertSupportConversationSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
