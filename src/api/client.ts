import { API_BASE_URL } from '@/services/config';
import { AppServiceError, toAppServiceError } from '@/services/errors';

const REQUEST_TIMEOUT_MS = 20_000;

export async function requestJson(path: string, init: RequestInit): Promise<unknown> {
  if (!API_BASE_URL || API_BASE_URL.includes('localhost-placeholder')) {
    throw new AppServiceError(
      'CONFIGURATION_ERROR',
      'EXPO_PUBLIC_API_BASE_URL must be configured when mock mode is disabled.',
      false,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    });

    const data: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const errorData = data as { code?: string; message?: string } | undefined;
      if (errorData?.code === 'IMAGE_QUALITY_LOW') {
        throw new AppServiceError('IMAGE_QUALITY_LOW', errorData.message ?? 'Image quality is low.');
      }
      if (response.status >= 500) {
        throw new AppServiceError('SERVER_UNAVAILABLE', 'The server is unavailable.');
      }
      throw new AppServiceError('INVALID_RESPONSE', 'The server rejected the request.');
    }
    return data;
  } catch (error) {
    throw toAppServiceError(error);
  } finally {
    clearTimeout(timeout);
  }
}

