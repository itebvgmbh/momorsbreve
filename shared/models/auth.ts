import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export type TourState = {
  welcomeSeen?: boolean;
  welcomeAnswer?: "yes" | "no" | "later";
  completedTours?: string[];
  dismissedTours?: string[];
  lastSeenAt?: string;
};

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Adresse
  street: varchar("street"),
  postalCode: varchar("postal_code"),
  city: varchar("city"),
  country: varchar("country"),
  // Rechnungsanschrift
  billingName: varchar("billing_name"),
  billingStreet: varchar("billing_street"),
  billingPostalCode: varchar("billing_postal_code"),
  billingCity: varchar("billing_city"),
  billingCountry: varchar("billing_country"),
  newsletterOptIn: boolean("newsletter_opt_in").default(true),
  tourState: jsonb("tour_state").$type<TourState>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
