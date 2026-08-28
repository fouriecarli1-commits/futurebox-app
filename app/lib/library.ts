/**
 * Your channel — the tracks you have made, kept on your device.
 *
 * Audio is far too big for localStorage, so the files live in IndexedDB and the
 * details that describe them live alongside. Everything is per-device: there is
 * no account behind this, which the UI tells you rather than letting you find
 * out when you open the app on your phone.
 */

export interface Track {
  readonly id: string;
  readonly title: string;
  readonly genre: string;
  readonly bpm: number;
  readonly key: string;
  readonly lyrics: string;
  readonly style: string;
  readonly models: readonly string[];
  /** 'sketch' was made here in the browser; 'engine' came from a music engine. */
  readonly source: 'sketch' | 'engine';
  readonly seconds: number;
  readonly createdAt: string;
  /** Set when this came from remixing another track. */
  readonly remixOf?: string;
  readonly seed: number;
  /**
   * The composition plan this song was made from: which words are in which
   * section, and how long each section was asked to be.
   *
   * Kept because it is the only reliable timing information that exists — the
   * app wrote it, so it knows where the chorus starts without asking anybody.
   * It is what makes the words follow the music while it plays.
   */
  readonly parts?: readonly { name: string; lines: readonly string[]; seconds: number }[];
  /** What those parts added up to when they were sent, for spotting a preview. */
  readonly plannedSeconds?: number;
}

const META_KEY = 'futurebox.tracks.v1';
const DB_NAME = 'futurebox';
const STORE = 'audio';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putAudio(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAudio(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve((request.result as Blob) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

export async function deleteAudio(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function loadTracks(): Track[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as Track[]) : [];
  } catch {
    return [];
  }
}

export function saveTracks(tracks: readonly Track[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(tracks));
  } catch {
    // Storage full or blocked. The track still plays for this visit.
  }
}

/** Triggers a real file download from a blob already in memory. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the download has taken the handle.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(title: string, extension: string): string {
  const base = title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${base || 'futurebox-track'}.${extension}`;
}
