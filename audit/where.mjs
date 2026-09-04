/**
 * Where a screenshot goes.
 *
 * Every run wrote `audit/whatever.png`, which is relative to whatever
 * directory the process happened to start in. That is fine when a run is
 * launched from the project root and silently wrong when it is not: two
 * screenshots from these probes ended up inside an unrelated repository
 * checked out beside this one, where they were noticed only because a git
 * hook complained about untracked files.
 *
 * Resolved against this file instead, so a run writes next to its own probe
 * no matter where it was started from.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

/** An absolute path inside `audit/`, whatever the working directory is. */
export function shot(name) {
  return join(HERE, name);
}
