export type ServiceErrorCode =
  | 'IMAGE_QUALITY_LOW'
  | 'NO_INTERNET'
  | 'REQUEST_TIMEOUT'
  | 'SERVER_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'MODEL_UNAVAILABLE'
  | 'ASSESSMENT_FAILED'
  | 'CONFIGURATION_ERROR';

export class AppServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly recoverable = true,
  ) {
    super(message);
    this.name = 'AppServiceError';
  }
}

export const toAppServiceError = (error: unknown): AppServiceError => {
  if (error instanceof AppServiceError) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new AppServiceError('REQUEST_TIMEOUT', 'The request timed out.');
  }
  return new AppServiceError('NO_INTERNET', 'The service could not be reached.');
};

