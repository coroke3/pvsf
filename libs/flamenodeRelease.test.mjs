import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptFlameNodeRelease,
  adaptLegacyRelease,
  extractYouTubeVideoId,
  fetchFlameNodeRelease,
  getReleaseIconUrl,
  normalizeReleaseTime,
  releasePath,
} from "./flamenodeRelease.js";

test("release URL helpers reject malformed values without creating broken links", () => {
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=12"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeVideoId("https://example.test/video"), null);
  assert.equal(getReleaseIconUrl("javascript:alert(1)"), null);
  assert.equal(getReleaseIconUrl("https://drive.google.com/open?id=drive_id"), "https://lh3.googleusercontent.com/d/drive_id");
  assert.equal(
    getReleaseIconUrl("/api/media/video-icons/biroudo0402/v_c1020271-e63e-4eb8-a8c0-a40e5f9e400c/827f2452-1aa0-423b-8830-04a3b23d1404.webp"),
    "https://flamenode.net/api/media/video-icons/biroudo0402/v_c1020271-e63e-4eb8-a8c0-a40e5f9e400c/827f2452-1aa0-423b-8830-04a3b23d1404.webp",
  );
  assert.equal(
    getReleaseIconUrl("https://flamenode.net/api/media/video-icons/biroudo0402/v_c1020271-e63e-4eb8-a8c0-a40e5f9e400c/827f2452-1aa0-423b-8830-04a3b23d1404.webp"),
    "https://flamenode.net/api/media/video-icons/biroudo0402/v_c1020271-e63e-4eb8-a8c0-a40e5f9e400c/827f2452-1aa0-423b-8830-04a3b23d1404.webp",
  );
  assert.equal(normalizeReleaseTime("18時00分"), "18:00");
  assert.equal(normalizeReleaseTime("18:12"), "18:12");
  assert.equal(releasePath("work/a"), "/release/work%2Fa");
  assert.equal(releasePath(""), null);
});

test("legacy fallback adapter drops rows without a stable release id", () => {
  const result = adaptLegacyRelease([{ timestamp: "work-1", title: "作品" }, { title: "invalid" }]);
  assert.equal(result.release.length, 1);
  assert.equal(result.release[0].id, "work-1");
});

test("FlameNode legacy rows prefer video id and keep display fields", () => {
  const result = adaptLegacyRelease([{
    id: "v_c1020271-e63e-4eb8-a8c0-a40e5f9e400c",
    timestamp: "2026-08-22T06:39:03.000Z",
    type1: "個人",
    type2: "個人",
    type: "1日目第1部",
    creator: "biroudo",
    tlink: "biroudo0402",
    icon: "/api/media/video-icons/biroudo0402/v_c1020271-e63e-4eb8-a8c0-a40e5f9e400c/827f2452-1aa0-423b-8830-04a3b23d1404.webp",
    data: "08/27",
    time: "18:24",
    title: "いますぐ輪廻",
    music: "なきそ-いますぐ輪廻",
    credit: "",
    comment: "コメント",
    othersns: "[{\"type\":\"X\",\"url\":\"https://x.com/Biroudo0402\"}]",
    ylink: "https://www.youtube.com/watch?v=-qZYSGuv480",
    eventid: "pvsf2026s",
    soft: "AviUtl2,Blender,MMD",
    hitokoto: "見どころ",
    small: "https://i.ytimg.com/vi/-qZYSGuv480/mqdefault.jpg",
    largeThumbnail: "https://i.ytimg.com/vi/-qZYSGuv480/maxresdefault.jpg",
  }]);
  assert.equal(result.release[0].id, "v_c1020271-e63e-4eb8-a8c0-a40e5f9e400c");
  assert.equal(result.release[0].time, "18:24");
  assert.equal(result.release[0].type2, "1日目第1部");
  assert.equal(result.release[0].music, "なきそ-いますぐ輪廻");
  assert.equal(result.release[0].soft, "AviUtl2,Blender,MMD");
  assert.match(result.release[0].othersns, /Biroudo0402/);
});

test("FlameNode release payload maps to the legacy PVSF view model", () => {
  const result = adaptFlameNodeRelease({
    event: { id: "pvsf2026s", title: "PVSF2026S" },
    videos: [{
      id: "video-1",
      title: "作品",
      youtube_video_id: "abcdefghijk",
      scheduled_time: 1787821200,
      collaboration_type: "collab",
      part: "1日目第1部",
      intro_comment: "紹介",
      creator_display_name: "Alice",
      creator_x_user_id: "alice_x",
      creator_icon_url: "https://example.test/icon.png",
      members: [{ name: "Bob", x_user_id: "bob_x" }],
    }],
  });
  assert.equal(result.event.id, "pvsf2026s");
  assert.equal(result.release[0].id, "video-1");
  assert.equal(result.release[0].time, "18:00");
  assert.equal(result.release[0].data, "2026/08/27");
  assert.equal(result.release[0].type1, "複数人");
  assert.equal(result.release[0].type2, "1日目第1部");
  assert.equal(result.release[0].ylink, "https://www.youtube.com/watch?v=abcdefghijk");
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
