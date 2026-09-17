import { Platform } from 'react-native';

import type { CaptureAsset } from '@/types/assessment';

export async function appendCaptureImage(
  form: FormData,
  capture: Pick<CaptureAsset, 'id' | 'uri' | 'mimeType'>,
  fieldName = 'image',
) {
  const fileName = `${capture.id}.jpg`;
  if (Platform.OS === 'web') {
    const response = await fetch(capture.uri);
    if (!response.ok) throw new Error('Could not read the confirmed camera image.');
    const blob = await response.blob();
    form.append(fieldName, blob, fileName);
    return;
  }

  form.append(fieldName, {
    uri: capture.uri,
    name: fileName,
    type: capture.mimeType,
  } as unknown as Blob);
}
