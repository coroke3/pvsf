const DEFAULT_FLAMENODE_ORIGIN = "https://flamenode.net";
const DEFAULT_EVENT_ID = "pvsf2026s";
const SHEETS_LEGACY_RELEASE_API_URL = "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec";
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

// Pages export invokes getStaticPaths first and then getStaticProps once per
// release item. Keep one immutable build snapshot so a 500-item event does
// not fan out into 501 identical API requests (and so every generated page
// is based on the same release generation). Custom fetch implementations are
// intentionally not cached; they are used by tests and local probes.
let cachedReleaseUrl = null;
let cachedReleasePromise = null;
let cachedLegacyReleaseUrl = null;
let cachedLegacyReleasePromise = null;
let cachedSheetsLegacyReleasePromise = null;

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function flameNodeOrigin() {
  // Browser overrides must use NEXT_PUBLIC_. FLAMENODE_RELEASE_API_ORIGIN
  // remains a server/test fallback so release and staff share the same origin.
  const configured = process.env.NEXT_PUBLIC_FLAMENODE_API_ORIGIN
    || process.env.FLAMENODE_RELEASE_API_ORIGIN
    || DEFAULT_FLAMENODE_ORIGIN;
  return configured.replace(/\/+$/, "");
}

/**
 * Normalize the different YouTube URL shapes used by the old spreadsheet and
 * the FlameNode DTO. Returning null instead of slicing a URL keeps malformed
 * data from producing links to /undefined or broken thumbnails.
 */
export function extractYouTubeVideoId(value) {
  const input = asString(value);
  if (!input) return null;
  if (YOUTUBE_ID_PATTERN.test(input)) return input;

  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let candidate = parsed.searchParams.get("v");
    if (!candidate && host === "youtu.be") {
      candidate = parsed.pathname.split("/").filter(Boolean)[0];
    }
    if (!candidate && (host === "youtube.com" || host === "youtube-nocookie.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live", "v"].includes(parts[0])) candidate = parts[1];
    }
    return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * Convert a Drive URL, a Drive id, a FlameNode relative media path
 * (e.g. /api/media/video-icons/...), or a direct HTTPS image URL to a safe
 * absolute image URL.
 */
export function getReleaseIconUrl(value) {
  const input = asString(value);
  if (!input) return null;
  if (/^[A-Za-z0-9_-]{20,}$/.test(input)) {
    return `https://lh3.googleusercontent.com/d/${input}`;
  }
  try {
    // Absolute URLs parse as-is; relative paths resolve against FlameNode.
    const parsed = new URL(input, `${flameNodeOrigin()}/`);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    const driveId = parsed.pathname.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1]
      || parsed.searchParams.get("id");
    if ((host === "drive.google.com" || host.endsWith("googleusercontent.com")) && driveId) {
      return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function releasePath(value) {
  const id = asString(value);
  return id ? `/release/${encodeURIComponent(id)}` : null;
}

export function profilePath(base, value) {
  const id = asString(value).replace(/^@+/, "");
  return id ? `${base}${encodeURIComponent(id)}` : null;
}

/** Normalize "18時00分" / "18:00" / "8:5" into zero-padded "HH:mm". */
export function normalizeReleaseTime(value) {
  const input = asString(value);
  if (!input) return "";
  const jp = input.match(/^(\d{1,2})\s*時\s*(\d{1,2})\s*分$/);
  if (jp) {
    return `${jp[1].padStart(2, "0")}:${jp[2].padStart(2, "0")}`;
  }
  const colon = input.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colon) {
    return `${colon[1].padStart(2, "0")}:${colon[2].padStart(2, "0")}`;
  }
  return input;
}

function releaseApiUrl() {
  const origin = (process.env.FLAMENODE_RELEASE_API_ORIGIN || DEFAULT_FLAMENODE_ORIGIN).replace(/\/$/, "");
  const eventId = process.env.FLAMENODE_RELEASE_EVENT_ID || DEFAULT_EVENT_ID;
  return `${origin}/api/event-endpoints/${encodeURIComponent(eventId)}/release`;
}

function legacyReleaseApiUrl() {
  const origin = (process.env.FLAMENODE_RELEASE_API_ORIGIN || DEFAULT_FLAMENODE_ORIGIN).replace(/\/$/, "");
  const eventId = process.env.FLAMENODE_RELEASE_EVENT_ID || DEFAULT_EVENT_ID;
  return `${origin}/api/event-endpoints/${encodeURIComponent(eventId)}?update=scheduled&format=legacy&refresh=15`;
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
  return { data: `${get("year")}/${get("month")}/${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function legacyReleaseId(row) {
  const videoId = asString(row?.id);
  const stamp = asString(row?.timestamp);
  // FlameNode legacy rows use id=v_… and timestamp=ISO submission time.
  if (videoId.startsWith("v_")) return videoId;
  if (stamp && !ISO_TIMESTAMP_PATTERN.test(stamp)) return stamp;
  return videoId || stamp;
}

export function adaptFlameNodeRelease(payload) {
  if (!payload || typeof payload !== "object" || !payload.event || !Array.isArray(payload.videos)) {
    throw new Error("invalid_flamenode_release_payload");
  }
  const event = payload.event;
  const release = payload.videos.map((video) => {
    if (!video || video.id == null || asString(video.id) === "") return null;
    const date = formatDate(video.scheduled_time);
    const members = Array.isArray(video.members) ? video.members : [];
    const youtubeId = extractYouTubeVideoId(video.youtube_video_id);
    return {
      id: asString(video.id), timestamp: asString(video.id), title: asString(video.title),
      creator: asString(video.creator_display_name), tlink: asString(video.creator_x_user_id),
      ylink: youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "",
      data: date.data, time: date.time,
      type1: video.collaboration_type === "collab" ? "複数人" : "個人",
      type2: asString(video.part), comment: asString(video.intro_comment),
      member: members.map((member) => asString(member?.name)).filter(Boolean).join(","),
      memberid: members.map((member) => asString(member?.x_user_id)).join(","),
      icon: asString(video.creator_icon_url), eventid: asString(event.id), eventTitle: asString(event.title),
      music: "", credit: "", ychlink: "", othersns: "", soft: "", hitokoto: "",
      small: "", largeThumbnail: "",
    };
  }).filter(Boolean);
  return { release, usernames: release.map((item) => item.creator).filter(Boolean), event };
}

/** Adapt FlameNode `format=legacy` rows (and older spreadsheet snapshots). */
export function adaptLegacyRelease(payload) {
  if (!Array.isArray(payload)) throw new Error("invalid_legacy_release_payload");
  const release = payload.map((row) => {
    const id = legacyReleaseId(row);
    if (!id) return null;
    const section = asString(row?.type || row?.fu || row?.type2);
    return {
      id,
      timestamp: id,
      title: asString(row?.title),
      creator: asString(row?.creator),
      tlink: asString(row?.tlink),
      ylink: asString(row?.ylink),
      data: asString(row?.data),
      time: normalizeReleaseTime(row?.time),
      type1: asString(row?.type1),
      type2: section,
      comment: asString(row?.comment || row?.beforecomment),
      member: asString(row?.member),
      memberid: asString(row?.memberid),
      icon: asString(row?.icon),
      eventid: asString(row?.eventid),
      eventTitle: asString(row?.eventTitle),
      music: asString(row?.music),
      credit: asString(row?.credit),
      ychlink: asString(row?.ychlink),
      othersns: typeof row?.othersns === "string" ? row.othersns : (row?.othersns ? JSON.stringify(row.othersns) : ""),
      soft: asString(row?.soft),
      hitokoto: asString(row?.hitokoto || row?.ycomment),
      small: asString(row?.small),
      largeThumbnail: asString(row?.largeThumbnail),
    };
  }).filter(Boolean);
  return { release, usernames: [...new Set(release.map((item) => item.creator).filter(Boolean))], event: null };
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`flamenode_release_http_${response.status}`);
  return response.json();
}

export async function fetchFlameNodeRelease(fetchImpl = fetch) {
  const url = releaseApiUrl();
  if (fetchImpl !== fetch || process.env.NODE_ENV !== "production") {
    return adaptFlameNodeRelease(await fetchJson(url, fetchImpl));
  }
  if (cachedReleasePromise && cachedReleaseUrl === url) {
    return cachedReleasePromise;
  }
  cachedReleaseUrl = url;
  cachedReleasePromise = (async () => adaptFlameNodeRelease(await fetchJson(url, fetchImpl)))();
  return cachedReleasePromise;
}

export async function fetchFlameNodeLegacyRelease(fetchImpl = fetch) {
  const url = legacyReleaseApiUrl();
  if (fetchImpl !== fetch || process.env.NODE_ENV !== "production") {
    return adaptLegacyRelease(await fetchJson(url, fetchImpl));
  }
  if (cachedLegacyReleasePromise && cachedLegacyReleaseUrl === url) {
    return cachedLegacyReleasePromise;
  }
  cachedLegacyReleaseUrl = url;
  cachedLegacyReleasePromise = (async () => adaptLegacyRelease(await fetchJson(url, fetchImpl)))()
    .catch((error) => {
      cachedLegacyReleasePromise = null;
      throw error;
    });
  return cachedLegacyReleasePromise;
}

/**
 * Prefer FlameNode's scheduled legacy payload (icons / music / SNS), then the
 * structured /release DTO, then the older Google Sheets snapshot.
 */
export async function fetchReleaseSnapshot(fetchImpl = fetch) {
  try {
    return await fetchFlameNodeLegacyRelease(fetchImpl);
  } catch (legacyError) {
    try {
      return await fetchFlameNodeRelease(fetchImpl);
    } catch (primaryError) {
      if (process.env.PVSF_DISABLE_LEGACY_RELEASE_FALLBACK === "1") throw primaryError;
      if (fetchImpl !== fetch && process.env.PVSF_ALLOW_TEST_LEGACY_FALLBACK !== "1") throw primaryError;

      const loadSheetsLegacy = async () => {
        const response = await fetchImpl(SHEETS_LEGACY_RELEASE_API_URL, { headers: { Accept: "application/json" } });
        if (!response.ok) throw primaryError;
        return adaptLegacyRelease(await response.json());
      };
      if (fetchImpl !== fetch || process.env.NODE_ENV !== "production") return loadSheetsLegacy();
      if (!cachedSheetsLegacyReleasePromise) {
        cachedSheetsLegacyReleasePromise = loadSheetsLegacy().catch((error) => {
          cachedSheetsLegacyReleasePromise = null;
          throw error;
        });
      }
      return cachedSheetsLegacyReleasePromise;
    }
  }
}

export function getFlameNodeReleaseApiUrlForTests() { return releaseApiUrl(); }
export function getFlameNodeLegacyReleaseApiUrlForTests() { return legacyReleaseApiUrl(); }
