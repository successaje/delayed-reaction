import type { ApiErrorCode } from '@delayed-reaction/core';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const STATUS: Record<ApiErrorCode, ContentfulStatusCode> = {
  invalid_request: 400,
  unauthorized: 401,
  room_not_found: 404,
  room_full: 409,
  rate_limited: 429,
  internal: 500,
};

/** An error that is safe to show to the person using the app. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }

  get status(): ContentfulStatusCode {
    return STATUS[this.code];
  }
}

export const roomNotFound = () =>
  new ApiError('room_not_found', "That room doesn't exist. Check the code and try again.");

export const unauthorized = () =>
  new ApiError('unauthorized', 'This device is no longer part of the room. Join again to continue.');
