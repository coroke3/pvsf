import assert from "node:assert/strict";
import test from "node:test";
import { adaptFlameNodeRelease, fetchFlameNodeRelease } from "./flamenodeRelease.js";

test("FlameNode release payload maps to the legacy PVSF view model", () => {
  const result = adaptFlameNodeRelease({
    event: { id: "pvsf2026s", title: "PVSF2026S" },
    videos: [{
      id: "video-1",
      title: "作品",
      youtube_video_id: "abcdefghijk",
      scheduled_time: 1787821200,
      collaboration_type: "collab",
      part: "1",
      intro_comment: "紹介",
      creator_display_name: "Alice",
      creator_x_user_id: "alice_x",
      creator_icon_url: "https://example.test/icon.png",
      members: [{ name: "Bob", x_user_id: "bob_x" }],
    }],
  });
  assert.equal(result.event.id, "pvsf2026s");
  assert.deepEqual(result.release[0], {
    id: "video-1",
    timestamp: "video-1",
    title: "作品",
    creator: "Alice",
    tlink: "alice_x",
    ylink: "https://www.youtube.com/watch?v=abcdefghijk",
    data: "2026/08/27",
    time: "18時00分",
    type1: "複数人",
    type2: "1",
    comment: "紹介",
    member: "Bob",
    memberid: "bob_x",
    icon: "https://example.test/icon.png",
    eventid: "pvsf2026s",
    eventTitle: "PVSF2026S",
  });
});

test("FlameNode API failures stay explicit instead of publishing an empty archive", async () => {
  await assert.rejects(
    () => fetchFlameNodeRelease(async () => new Response("not found", { status: 404 })),
    /flamenode_release_http_404/,
  );
});

test("build snapshot is reused only for the default production fetch", async () => {
  const payload = { event: { id: "event-1", title: "Event" }, videos: [] };
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  // Custom fetches intentionally bypass the build cache and are independent
  // probes, so this test documents the isolation contract.
  await fetchFlameNodeRelease(fetchImpl);
  await fetchFlameNodeRelease(fetchImpl);
  assert.equal(calls, 2);
});
