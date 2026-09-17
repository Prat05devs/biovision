/** Optional hosted API (web eye screening and research retention). The iOS app runs fully on device. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
