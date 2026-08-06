export type UploadStep =
  | 'session'
  | 'profile'
  | 'file-read'
  | 'storage'
  | 'database'
  | 'validation';

type ErrorLike = {
  message?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

export class UploadStepError extends Error {
  detail: string;
  originalError: unknown;
  statusCode?: string;
  step: UploadStep;

  constructor(step: UploadStep, fallbackMessage: string, originalError?: unknown) {
    const detail = getErrorDetail(originalError, fallbackMessage);
    super(`${formatStep(step)} failed: ${detail}`);
    this.name = 'UploadStepError';
    this.detail = detail;
    this.originalError = originalError;
    this.statusCode = getStatusCode(originalError);
    this.step = step;
  }
}

export function formatUploadError(error: unknown) {
  if (error instanceof UploadStepError) {
    return `step: ${error.step}\nstatusCode: ${
      error.statusCode ?? 'unavailable'
    }\nmessage: ${error.detail}`;
  }

  return `step: unknown\nstatusCode: ${getStatusCode(error) ?? 'unavailable'}\nmessage: ${getErrorDetail(
    error,
    'Upload failed.',
  )}`;
}

function formatStep(step: UploadStep) {
  return step.replace('-', ' ');
}

function getErrorDetail(error: unknown, fallbackMessage: string) {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  const errorLike = error as ErrorLike;
  if (typeof errorLike.message === 'string' && errorLike.message) {
    return errorLike.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return fallbackMessage;
  }
}

function getStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const errorLike = error as ErrorLike;
  const statusCode = errorLike.statusCode ?? errorLike.status;

  if (typeof statusCode === 'string') {
    return statusCode;
  }

  if (typeof statusCode === 'number') {
    return String(statusCode);
  }

  return undefined;
}
