import { del, get, set } from 'idb-keyval';

const PREFIX = 'obra-engep-media:';

export async function saveMedia(key: string, blob: Blob): Promise<void> {
  await set(`${PREFIX}${key}`, blob);
}

export async function loadMediaBlob(key: string): Promise<Blob | null> {
  const value = await get<Blob>(`${PREFIX}${key}`);
  return value ?? null;
}

export async function loadMediaUrl(key: string): Promise<string | null> {
  const blob = await loadMediaBlob(key);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteMedia(key: string): Promise<void> {
  await del(`${PREFIX}${key}`);
}
