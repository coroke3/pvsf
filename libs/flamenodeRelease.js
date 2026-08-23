const DEFAULT_FLAMENODE_ORIGIN = "https://flamenode.net";
const DEFAULT_EVENT_ID = "pvsf2026s";

// Pages export invokes getStaticPaths first and then getStaticProps once per
// release item. Keep one immutable build snapshot so a 500-item event does
// not fan out into 501 identical API requests (and so every generated page
// is based on the same release generation). Custom fetch implementations are
// intentionally not cached; they are used by tests and local probes.
let cachedReleaseUrl = null;
let cachedReleasePromise = null;

function releaseApiUrl() {
  const origin = (process.env.FLAMENODE_RELEASE_API_ORIGIN || DEFAULT_FLAMENODE_ORIGIN).replace(/\/$/, "");
  const eventId = process.env.FLAMENODE_RELEASE_EVENT_ID || DEFAULT_EVENT_ID;
  return `${origin}/api/event-endpoints/${encodeURIComponent(eventId)}/release`;
}

function formatDate(timestamp) {
  if (timestamp == null || timestamp === "") return { data: "", time: "" };
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return { data: "", time: "" };
  const date = new Date(seconds * 1000);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return { data: `${get("year")}/${get("month")}/${get("day")}`, time: `${get("hour")}時${get("minute")}分` };
}

export function adaptFlameNodeRelease(payload) {
  if (!payload || typeof payload !== "object" || !payload.event || !Array.isArray(payload.videos)) {
    throw new Error("invalid_flamenode_release_payload");
  }
  const event = payload.event;
  const release = payload.videos.map((video) => {
    const date = formatDate(video.scheduled_time);
    const members = Array.isArray(video.members) ? video.members : [];
    return {
      id: video.id, timestamp: video.id, title: video.title || "",
      creator: video.creator_display_name || "", tlink: video.creator_x_user_id || "",
      ylink: video.youtube_video_id ? `https://www.youtube.com/watch?v=${video.youtube_video_id}` : "",
      data: date.data, time: date.time,
      type1: video.collaboration_type === "collab" ? "複数人" : "個人",
      type2: video.part || "", comment: video.intro_comment || "",
      member: members.map((member) => member.name).join(","),
      memberid: members.map((member) => member.x_user_id || "").join(","),
      icon: video.creator_icon_url || "", eventid: event.id, eventTitle: event.title,
    };
  });
  return { release, usernames: release.map((item) => item.creator).filter(Boolean), event };
}

export async function fetchFlameNodeRelease(fetchImpl = fetch) {
  const url = releaseApiUrl();
  const options = { headers: { Accept: "application/json" } };
  if (fetchImpl !== fetch || process.env.NODE_ENV !== "production") {
    const response = await fetchImpl(url, options);
    if (!response.ok) throw new Error(`flamenode_release_http_${response.status}`);
    return adaptFlameNodeRelease(await response.json());
  }
  if (cachedReleasePromise && cachedReleaseUrl === url) {
    return cachedReleasePromise;
  }
  cachedReleaseUrl = url;
  cachedReleasePromise = (async () => {
    const response = await fetchImpl(url, options);
    if (!response.ok) throw new Error(`flamenode_release_http_${response.status}`);
    return adaptFlameNodeRelease(await response.json());
  })();
  return cachedReleasePromise;
}

export function getFlameNodeReleaseApiUrlForTests() { return releaseApiUrl(); }
