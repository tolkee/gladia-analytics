import {
  createTodoSchema,
  TodoNotFoundError,
  updateTodoSchema,
  type TodoService,
} from "#features/todo";
import { Hono } from "hono";
import { type ApiEnv } from "./types";
import { authGuardMiddleware } from "./middlewares/auth-guard";
import { ApiErrorCode } from "@gladia-analytics/common/errors";
import { apiError } from "#lib/errors";
import { requestValidator } from "./middlewares/request-validator";

export function createTodoRoutes(todoService: TodoService) {
  const routes = new Hono<ApiEnv>()
    .get("/", authGuardMiddleware, async (ctx) => {
      const userId = ctx.get("user").id;

      const todos = await todoService.getTodos(userId);

      return ctx.json(todos, 200);
    })
    .post("/", authGuardMiddleware, requestValidator("json", createTodoSchema), async (ctx) => {
      const userId = ctx.get("user").id;
      const body = ctx.req.valid("json");

      const todo = await todoService.createTodo(userId, body);
      return ctx.json(todo, 201);
    })
    .patch("/:id", authGuardMiddleware, requestValidator("json", updateTodoSchema), async (ctx) => {
      const userId = ctx.get("user").id;
      const body = ctx.req.valid("json");
      const id = ctx.req.param("id");

      try {
        const todo = await todoService.updateTodo(userId, id, body);
        return ctx.json(todo, 200);
      } catch (err) {
        if (err instanceof TodoNotFoundError) {
          return apiError(ctx, 404, ApiErrorCode.TODO_NOT_FOUND, "Todo not found");
        }

        throw err;
      }
    })
    .delete("/:id", authGuardMiddleware, async (ctx) => {
      const userId = ctx.get("user").id;
      const id = ctx.req.param("id");

      await todoService.removeTodo(userId, id);
      return ctx.body(null, 204);
    });

  return routes;
}
