export type YoutubeVideo = {
  videoId: string;
  title: string;
  url: string;
};

function extractPlaylistId(input: string): string {
  try {
    const url = new URL(input);
    const list = url.searchParams.get("list");
    if (list) return list;
  } catch {
    // URL이 아니면 그냥 ID 자체를 준 걸로 간주
  }
  return input;
}

/**
 * 유튜브 플레이리스트의 영상 목록(제목, videoId, URL)을 가져온다.
 * YOUTUBE_API_KEY 필요 (Google Cloud Console에서 YouTube Data API v3 활성화 후 발급).
 */
export async function fetchPlaylistVideos(playlistUrlOrId: string): Promise<YoutubeVideo[]> {
  const playlistId = extractPlaylistId(playlistUrlOrId);
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY가 설정되어 있지 않아요");

  const items: YoutubeVideo[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      throw new Error(`유튜브 플레이리스트를 못 읽었어요: ${data.error.message}`);
    }

    for (const item of data.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      items.push({
        videoId,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

// 곡 제목 매칭용 정규화 (공백/괄호/대소문자 차이를 무시하고 비교)
function normalizeForMatch(title: string) {
  return title
    .replace(/\s+/g, "")
    .replace(/[()[\]{}]/g, "")
    .toLowerCase();
}

/**
 * 콘티에서 뽑은 곡 제목과 유튜브 영상 제목들을 매칭. 영상 제목이 보통
 * "곡 제목 - 아티스트 (가사/Lyrics)" 같은 형태라, 정규화한 곡 제목이 정규화한
 * 영상 제목에 부분 문자열로 포함되면 매칭된 걸로 봄. 못 찾으면 null.
 */
export function matchSongToVideo(songTitle: string, videos: YoutubeVideo[]): YoutubeVideo | null {
  const normSong = normalizeForMatch(songTitle);
  if (!normSong) return null;

  for (const video of videos) {
    const normVideo = normalizeForMatch(video.title);
    if (normVideo.includes(normSong)) return video;
  }
  return null;
}
