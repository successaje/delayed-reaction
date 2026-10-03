import type {
  ApiErrorCode,
  ApiErrorDto,
  CreateRoomRequest,
  JoinRoomRequest,
  PostReactionRequest,
  ProgramDto,
  Recap,
  ReactionDto,
  ReactionPageDto,
  RoomStateDto,
  SessionDto,
  SyncRequest,
} from '@delayed-reaction/core';

export type ClientErrorCode = ApiErrorCode | 'offline' | 'timeout';

/** A failure the UI can explain: `message` is written for people, `code` drives recovery. */
export class ApiClientError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  /** Worth retrying automatically: the same request may succeed if sent again. */
  get retryable(): boolean {
    return (
      this.code === 'offline' ||
      this.code === 'timeout' ||
      this.code === 'rate_limited' ||
      this.code === 'internal'
    );
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof Error && error.name === 'ApiClientError';
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetch ?? ((...args) => fetch(...args));
    this.timeoutMs = options.timeoutMs ?? 8_000;
  }

  programs(): Promise<{ programs: ProgramDto[] }> {
    return this.request('GET', '/v1/programs');
  }

  createRoom(body: CreateRoomRequest): Promise<SessionDto> {
    return this.request('POST', '/v1/rooms', { body });
  }

  getRoom(code: string): Promise<RoomStateDto> {
    return this.request('GET', `/v1/rooms/${encodeURIComponent(code)}`);
  }

  joinRoom(code: string, body: JoinRoomRequest): Promise<SessionDto> {
    return this.request('POST', `/v1/rooms/${encodeURIComponent(code)}/viewers`, { body });
  }

  me(code: string, token: string): Promise<Omit<SessionDto, 'token'>> {
    return this.request('GET', `/v1/rooms/${encodeURIComponent(code)}/me`, { token });
  }

  sync(code: string, token: string, body: SyncRequest): Promise<ReactionPageDto> {
    return this.request('POST', `/v1/rooms/${encodeURIComponent(code)}/sync`, { body, token });
  }

  recap(code: string, token: string): Promise<Recap> {
    return this.request('GET', `/v1/rooms/${encodeURIComponent(code)}/recap`, { token });
  }

  postReaction(
    code: string,
    token: string,
    body: PostReactionRequest,
  ): Promise<{ reaction: ReactionDto }> {
    return this.request('POST', `/v1/rooms/${encodeURIComponent(code)}/reactions`, {
      body,
      token,
    });
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    options: { body?: unknown; token?: string } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new ApiClientError('timeout', 'The connection is slow. Still trying…');
      }
      throw new ApiClientError('offline', "You're offline. We'll reconnect when you're back.");
    } finally {
      clearTimeout(timer);
    }

    const payload: unknown = await response.json().catch(() => null);
    if (response.ok) return payload as T;
    const error = (payload as ApiErrorDto | null)?.error;
    throw new ApiClientError(
      error?.code ?? 'internal',
      error?.message ?? 'Something went wrong. Try again.',
      response.status,
    );
  }
}
