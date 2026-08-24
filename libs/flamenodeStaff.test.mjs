import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptFlameNodeStaff,
  eventStaffApiUrl,
  fetchFlameNodeStaff,
} from "./flamenodeStaff.js";

test("FlameNode public staff maps to the PVSF view model", () => {
  const result = adaptFlameNodeStaff({
    schema_version: 1,
    event_id: "pvsf2026s",
    generated_at: 1_700_000_000,
    staff: [{
      display_name: "Alice",
      role_label: "主催",
      x_id: "alice_x",
      x_name: "Alice on X",
      icon_url: "https://example.test/alice.png",
      has_public_profile: true,
    }],
  });

  assert.deepEqual(result, {
    generatedAt: 1_700_000_000,
    eventId: "pvsf2026s",
    staff: [{
      displayName: "Alice",
      roleLabel: "主催",
      xId: "alice_x",
      xName: "Alice on X",
      xUrl: "https://x.com/alice_x",
      iconUrl: "https://example.test/alice.png",
      hasPublicProfile: true,
    }],
  });
});

test("staff adapter rejects malformed payloads and unsafe URLs", () => {
  assert.throws(
    () => adaptFlameNodeStaff({ event: { id: "event-1" } }),
    /invalid_flamenode_staff_payload/,
  );

  const result = adaptFlameNodeStaff({
    schema_version: 1,
    event_id: "event-1",
    generated_at: 1_700_000_000,
    staff: [{
      display_name: "Alice",
      x_id: "alice_name",
      icon_url: "http://example.test/icon.png",
      has_public_profile: false,
    }],
  });
  assert.equal(result.staff[0].xUrl, null);
  assert.equal(result.staff[0].iconUrl, null);
});

test("staff API URL uses the public browser origin and encodes the event id", () => {
  const previous = process.env.NEXT_PUBLIC_FLAMENODE_API_ORIGIN;
  process.env.NEXT_PUBLIC_FLAMENODE_API_ORIGIN = "https://flamenode.example///";
  try {
    assert.equal(
      eventStaffApiUrl("event-a"),
      "https://flamenode.example/api/public/events/event-a/staff",
    );
    const relativeIcon = adaptFlameNodeStaff({
      schema_version: 1,
      event_id: "event-a",
      generated_at: 1_700_000_000,
      staff: [{
        display_name: "Alice",
        icon_url: "/api/public/icons/alice",
        has_public_profile: false,
      }],
    });
    assert.equal(
      relativeIcon.staff[0].iconUrl,
      "https://flamenode.example/api/public/icons/alice",
    );
    assert.throws(() => eventStaffApiUrl("  "), /invalid_flamenode_staff_event_id/);
    assert.throws(() => eventStaffApiUrl("event/a"), /invalid_flamenode_staff_event_id/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_FLAMENODE_API_ORIGIN;
    else process.env.NEXT_PUBLIC_FLAMENODE_API_ORIGIN = previous;
  }
});

test("staff fetch stays abortable and keeps HTTP failures explicit", async () => {
  const controller = new AbortController();
  const payload = {
    schema_version: 1,
    event_id: "event-1",
    generated_at: 1_700_000_000,
    staff: [],
  };
  let requestOptions;
  const result = await fetchFlameNodeStaff("event-1", {
    signal: controller.signal,
    fetchImpl: async (_url, options) => {
      requestOptions = options;
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });
  assert.deepEqual(result.staff, []);
  assert.equal(requestOptions.signal, controller.signal);
  assert.equal(requestOptions.credentials, "omit");
  assert.equal(requestOptions.headers.Accept, "application/json");

  await assert.rejects(
    () => fetchFlameNodeStaff("event-1", {
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    }),
    /flamenode_staff_http_503/,
  );
});

test("staff fetch rejects a payload for a different event", async () => {
  await assert.rejects(
    () => fetchFlameNodeStaff("event-1", {
      fetchImpl: async () => new Response(JSON.stringify({
        schema_version: 1,
        event_id: "event-2",
        generated_at: 1_700_000_000,
        staff: [],
      }), { status: 200 }),
    }),
    /flamenode_staff_event_mismatch/,
  );
});
