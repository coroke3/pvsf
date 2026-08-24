const DEFAULT_FLAMENODE_ORIGIN = "https://flamenode.net";
const PUBLIC_EVENT_STAFF_SCHEMA_VERSION = 1;
const PUBLIC_EVENT_STAFF_MAX_ITEMS = 100;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function safeHttpsUrl(value) {
  const input = asString(value);
  if (!input) return null;
  try {
    const parsed = new URL(input, `${flameNodeOrigin()}/`);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function flameNodeOrigin() {
  // Browser overrides must use NEXT_PUBLIC_. The release-only variable remains
  // a server/test fallback so both integrations share the same origin setting.
  const configured = process.env.NEXT_PUBLIC_FLAMENODE_API_ORIGIN
    || process.env.FLAMENODE_RELEASE_API_ORIGIN
    || DEFAULT_FLAMENODE_ORIGIN;
  return configured.replace(/\/+$/, "");
}

export function eventStaffApiUrl(value) {
  const eventId = asString(value);
  if (!EVENT_ID_PATTERN.test(eventId)) {
    throw new Error("invalid_flamenode_staff_event_id");
  }
  return `${flameNodeOrigin()}/api/public/events/${encodeURIComponent(eventId)}/staff`;
}

export function adaptFlameNodeStaff(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || payload.schema_version !== PUBLIC_EVENT_STAFF_SCHEMA_VERSION
    || !Number.isSafeInteger(payload.generated_at)
    || payload.generated_at <= 0
    || typeof payload.event_id !== "string"
    || !Array.isArray(payload.staff)
    || payload.staff.length > PUBLIC_EVENT_STAFF_MAX_ITEMS
  ) {
    throw new Error("invalid_flamenode_staff_payload");
  }

  const eventId = asString(payload.event_id);
  if (!EVENT_ID_PATTERN.test(eventId)) {
    throw new Error("invalid_flamenode_staff_payload");
  }

  const staff = payload.staff.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error("invalid_flamenode_staff_payload");
      }
      const displayName = asString(row.display_name);
      if (!displayName) throw new Error("invalid_flamenode_staff_payload");

      const xId = asString(row.x_id).replace(/^@+/, "");
      const suppliedIconUrl = asString(row.icon_url);
      if (typeof row.has_public_profile !== "boolean") {
        throw new Error("invalid_flamenode_staff_payload");
      }
      const xUrl = row.has_public_profile && xId
        ? `https://x.com/${encodeURIComponent(xId)}`
        : null;
      const iconUrl = safeHttpsUrl(suppliedIconUrl);

      return {
        displayName,
        roleLabel: asString(row.role_label),
        xId,
        xName: asString(row.x_name),
        xUrl,
        iconUrl,
        hasPublicProfile: row.has_public_profile,
      };
    });

  return {
    generatedAt: payload.generated_at,
    eventId,
    staff,
  };
}

export async function fetchFlameNodeStaff(
  eventId,
  { fetchImpl = fetch, signal } = {},
) {
  const normalizedEventId = asString(eventId);
  const response = await fetchImpl(eventStaffApiUrl(normalizedEventId), {
    headers: { Accept: "application/json" },
    credentials: "omit",
    signal,
  });
  if (!response.ok) {
    throw new Error(`flamenode_staff_http_${response.status}`);
  }

  const result = adaptFlameNodeStaff(await response.json());
  if (result.eventId !== normalizedEventId) {
    throw new Error("flamenode_staff_event_mismatch");
  }
  return result;
}
