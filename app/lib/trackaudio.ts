/**
 * Reading a track's audio, wherever it happens to live.
 *
 * A song made on this device is in IndexedDB. A song made on your phone has a
 * row on the account but no file here yet, so it is fetched once and kept, and
 * every screen after that finds it locally.
 */

import { getAudio, putAudio } from './library';
import { pullAudio } from './cloud';

export async function readAudio(id: string): Promise<Blob | null> {
  const local = await getAudio(id);
  if (local) return local;
  const remote = await pullAudio(id);
  if (remote) await putAudio(id, remote);
  return remote;
}
