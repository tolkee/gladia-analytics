import * as z from "zod";

export const createTodoSchema = z.object({
  content: z.string().min(1),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const updateTodoSchema = z.object({
  content: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
