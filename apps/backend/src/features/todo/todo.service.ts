import type { Db } from "#lib/db";
import { todosTable, type Todo } from "./todo.schema";
import type { CreateTodoInput, UpdateTodoInput } from "./todo.dto";
import type { User } from "#features/auth";
import { and, asc, desc, eq } from "drizzle-orm";
import { InvariantError } from "#lib/errors";
import { TodoNotFoundError } from "./errors";

export class TodoService {
  constructor(private readonly db: Db) {}

  async getTodos(userId: User["id"]): Promise<Todo[]> {
    const todos = this.db
      .select()
      .from(todosTable)
      .where(eq(todosTable.userId, userId))
      .orderBy(asc(todosTable.isCompleted), desc(todosTable.createdAt));

    return todos;
  }

  async createTodo(userId: User["id"], todo: CreateTodoInput): Promise<Todo> {
    const [createdTodo] = await this.db
      .insert(todosTable)
      .values({
        userId,
        ...todo,
      })
      .returning();

    if (!createdTodo) {
      throw new InvariantError("Todo insert returned no row");
    }

    return createdTodo;
  }

  async removeTodo(userId: User["id"], id: Todo["id"]): Promise<void> {
    await this.db
      .delete(todosTable)
      .where(and(eq(todosTable.userId, userId), eq(todosTable.id, id)));
  }

  async updateTodo(userId: User["id"], id: Todo["id"], updates: UpdateTodoInput): Promise<Todo> {
    const [updatedTodo] = await this.db
      .update(todosTable)
      .set(updates)
      .where(and(eq(todosTable.userId, userId), eq(todosTable.id, id)))
      .returning();

    if (!updatedTodo) {
      throw new TodoNotFoundError();
    }

    return updatedTodo;
  }
}
