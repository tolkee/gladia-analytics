import { usersTable } from "#schemas/auth";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const todosTable = pgTable(
  "todos",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    content: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    isCompleted: boolean().default(false).notNull(),
  },
  (table) => [index("todos_createdAt_idx").on(table.createdAt)],
);

export type Todo = typeof todosTable.$inferSelect;
