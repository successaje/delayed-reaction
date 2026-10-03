import { roomCodeSchema, type ApiErrorDto } from '@delayed-reaction/core';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { ApiError, roomNotFound } from './lib/errors';
import { RateLimiter } from './lib/rate-limit';
import { RoomService, type ServiceDeps } from './service';

export interface AppOptions extends ServiceDeps {
  /** Origins allowed to call the API from a browser. Defaults to any (auth is header-based). */
  readonly corsOrigins?: readonly string[];
}

/** Builds the HTTP API. Shared by the Node server, the Lambda handler and the tests. */
export function createApp(options: AppOptions) {
  const service = new RoomService(options);
  const reactionLimit = new RateLimiter(12, 10_000, options.now);
  const syncLimit = new RateLimiter(30, 10_000, options.now);
  const createLimit = new RateLimiter(10, 60_000, options.now);

  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: options.corsOrigins?.length ? [...options.corsOrigins] : '*',
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      maxAge: 600,
    }),
  );

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json(errorBody(err.code, err.message), err.status);
    if (isZodError(err)) {
      const message = err.issues[0]?.message ?? 'Some of that information looks wrong.';
      return c.json(errorBody('invalid_request', message), 400);
    }
    if (err instanceof SyntaxError) {
      return c.json(errorBody('invalid_request', 'The request body must be valid JSON.'), 400);
    }
    console.error(err);
    return c.json(errorBody('internal', 'Something went wrong on our side. Try again.'), 500);
  });

  app.notFound((c) => c.json(errorBody('invalid_request', 'Not found.'), 404));

  app.get('/health', (c) => c.json({ ok: true }));

  const v1 = new Hono();

  v1.get('/programs', (c) => c.json({ programs: service.listPrograms() }));

  v1.post('/rooms', async (c) => {
    limit(createLimit, clientKey(c));
    return c.json(await service.createRoom(await c.req.json()), 201);
  });

  v1.get('/rooms/:code', async (c) => c.json(await service.getRoomState(roomCode(c))));

  v1.post('/rooms/:code/viewers', async (c) => {
    limit(createLimit, clientKey(c));
    return c.json(await service.joinRoom(roomCode(c), await c.req.json()), 201);
  });

  v1.get('/rooms/:code/me', async (c) => {
    const authed = await service.authenticate(roomCode(c), c.req.header('Authorization'));
    return c.json(service.session(authed));
  });

  v1.post('/rooms/:code/sync', async (c) => {
    const authed = await service.authenticate(roomCode(c), c.req.header('Authorization'));
    limit(syncLimit, authed.viewer.id);
    return c.json(await service.sync(authed, await c.req.json()));
  });

  v1.get('/rooms/:code/recap', async (c) => {
    const authed = await service.authenticate(roomCode(c), c.req.header('Authorization'));
    limit(syncLimit, authed.viewer.id);
    return c.json(await service.recap(authed));
  });

  v1.post('/rooms/:code/reactions', async (c) => {
    const authed = await service.authenticate(roomCode(c), c.req.header('Authorization'));
    limit(reactionLimit, authed.viewer.id);
    const { reaction, created } = await service.postReaction(authed, await c.req.json());
    return c.json({ reaction }, created ? 201 : 200);
  });

  app.route('/v1', v1);
  return app;
}

function roomCode(c: Context): string {
  const parsed = roomCodeSchema.safeParse(c.req.param('code')?.toUpperCase());
  if (!parsed.success) throw roomNotFound();
  return parsed.data;
}

function limit(limiter: RateLimiter, key: string): void {
  if (!limiter.take(key)) {
    throw new ApiError('rate_limited', "You're going a bit fast. Give it a second.");
  }
}

function clientKey(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

/**
 * Each workspace may resolve its own copy of zod, so `instanceof ZodError` is unreliable
 * across package boundaries. Match on shape instead.
 */
function isZodError(err: unknown): err is { issues: { message: string }[] } {
  return err instanceof Error && err.name === 'ZodError' && Array.isArray((err as any).issues);
}

function errorBody(code: ApiErrorDto['error']['code'], message: string): ApiErrorDto {
  return { error: { code, message } };
}
