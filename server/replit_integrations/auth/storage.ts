import { users, type User, type UpsertUser } from "@shared/models/auth";
import { userCredits, transcriptionJobs, paymentOrders } from "@shared/models/transcription";
import { supportConversations, supportMessages } from "@shared/models/chat";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // DSGVO/GDPR: Neue Nutzer starten ohne Newsletter-Einwilligung (der Spalten-
    // Default in der DB ist historisch true). Gilt nur für die Neuanlage – beim
    // Update (onConflictDoUpdate-set) ist newsletterOptIn nicht enthalten, der
    // gespeicherte Wert bestehender Nutzer bleibt also unangetastet.
    const insertData: UpsertUser = { newsletterOptIn: false, ...userData };

    if (userData.email) {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));

      if (existing && existing.id !== userData.id) {
        const oldId = existing.id;
        const newId = userData.id!;

        const [user] = await db.transaction(async (tx) => {
          await tx
            .insert(users)
            .values(insertData)
            .onConflictDoUpdate({
              target: users.id,
              set: { ...userData, updatedAt: new Date() },
            });

          await tx.update(userCredits).set({ userId: newId }).where(eq(userCredits.userId, oldId));
          await tx.update(transcriptionJobs).set({ userId: newId }).where(eq(transcriptionJobs.userId, oldId));
          await tx.update(paymentOrders).set({ userId: newId }).where(eq(paymentOrders.userId, oldId));
          await tx.update(supportMessages).set({ senderId: newId }).where(eq(supportMessages.senderId, oldId));
          await tx.update(supportConversations).set({ userId: newId }).where(eq(supportConversations.userId, oldId));

          await tx.delete(users).where(eq(users.id, oldId));

          return tx.select().from(users).where(eq(users.id, newId));
        });
        return user;
      }
    }

    const [user] = await db
      .insert(users)
      .values(insertData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
