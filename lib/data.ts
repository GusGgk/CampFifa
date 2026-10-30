import { unstable_cache } from "next/cache";
import { CONFIG_ERROR, listMatches, listPhotoVersions } from "./db";
import type { Match } from "./types";

export type AppData = { matches: Match[]; photos: Record<string, string>; error: string | null };

/** Everything that changes the data calls revalidateTag(DATA_TAG), so cached pages refresh right away. */
export const DATA_TAG = "app-data";

// Safety net in case a change happens outside the app (e.g. editing the database by hand).
export const REVALIDATE_SECONDS = 60;

const cachedData = unstable_cache(
  async () => {
    const [matches, photos] = await Promise.all([listMatches(), listPhotoVersions()]);
    return { matches, photos };
  },
  [DATA_TAG],
  { tags: [DATA_TAG], revalidate: REVALIDATE_SECONDS },
);

export async function loadData(): Promise<AppData> {
  try {
    return { ...(await cachedData()), error: null };
  } catch (e) {
    // Missing database setup is shown on the page. Any other failure is thrown on purpose:
    // Next keeps serving the last good version instead of caching an error page.
    if (e instanceof Error && e.message === CONFIG_ERROR) return { matches: [], photos: {}, error: e.message };
    throw e;
  }
}
