import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkSocialPost,
  hashtagCount,
  socialEngagementRate,
  socialLength,
  socialReady,
  summarizeSocialMetrics,
} from "../src/components/social-composer/social-composer-logic.ts";

test("X weighs every link as 23 characters, others count code points", () => {
  const text = "Launch day https://example.com/a/very/long/path?with=query";
  assert.equal(socialLength("x", text), "Launch day ".length + 23);
  assert.equal(socialLength("bluesky", text), Array.from(text).length);
  assert.equal(socialLength("x", "a https://a.co b https://b.co"), 5 + 23 * 2);
});

test("counts emoji and Arabic by code point, not UTF-16 units", () => {
  assert.equal(socialLength("threads", "\u{1F680}\u{1F680}"), 2);
  assert.equal(socialLength("threads", "مرحبا"), 5);
});

test("hashtags, including Arabic ones", () => {
  assert.equal(hashtagCount("#one two #ثلاثة not#tag"), 2);
});

test("checks every chosen platform with its own limit", () => {
  const body = "x".repeat(290);
  const checks = checkSocialPost({ body, platforms: ["x", "bluesky", "linkedin"] });
  const by = Object.fromEntries(checks.map((c) => [c.platform, c]));
  assert.equal(by.x.level, "over");
  assert.deepEqual(by.x.problems, ["over"]);
  assert.equal(by.x.remaining, -10);
  assert.equal(by.bluesky.level, "near");
  assert.deepEqual(by.bluesky.problems, []);
  assert.equal(by.linkedin.level, "ok");
});

test("a platform's own version replaces the shared text", () => {
  const checks = checkSocialPost({ body: "y".repeat(400), variants: { x: "short one" }, platforms: ["x", "threads"] });
  assert.equal(checks[0].usesVariant, true);
  assert.deepEqual(checks[0].problems, []);
  assert.equal(checks[1].usesVariant, false);
  assert.equal(checks[1].level, "ok");
  assert.equal(checks[1].length, 400);
});

test("Instagram needs an image and TikTok a video", () => {
  const post = { body: "hello", platforms: ["instagram", "tiktok"] };
  assert.deepEqual(checkSocialPost(post).map((c) => c.problems), [["media"], ["media"]]);
  const withImage = checkSocialPost({ ...post, media: [{ id: "1", kind: "image", name: "a.jpg" }] });
  assert.deepEqual(withImage.map((c) => c.problems), [[], ["media"]]);
});

test("empty text and too many hashtags are problems", () => {
  assert.deepEqual(checkSocialPost({ body: "  ", platforms: ["x"] })[0].problems, ["empty"]);
  const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" ");
  const media = [{ id: "1", kind: "image", name: "a.jpg" }];
  assert.deepEqual(checkSocialPost({ body: tags, platforms: ["instagram"], media })[0].problems, ["hashtags"]);
});

test("ready needs a platform and no problems", () => {
  assert.equal(socialReady([]), false);
  assert.equal(socialReady(checkSocialPost({ body: "ok", platforms: ["x"] })), true);
  assert.equal(socialReady(checkSocialPost({ body: "ok", platforms: ["x", "instagram"] })), false);
});

test("metrics summary counts published rows only", () => {
  const rows = [
    { status: "published", impressions: 1000, likes: 40, replies: 5, reposts: 5, clicks: 50 },
    { status: "published", impressions: 500, likes: 10 },
    { status: "failed", impressions: 9999, likes: 9999 },
    { status: "queued" },
  ];
  const s = summarizeSocialMetrics(rows);
  assert.deepEqual({ posts: s.posts, failed: s.failed, impressions: s.impressions, engagements: s.engagements }, { posts: 2, failed: 1, impressions: 1500, engagements: 110 });
  assert.ok(Math.abs(s.rate - 110 / 1500) < 1e-9);
  assert.equal(socialEngagementRate({}), null);
  assert.equal(summarizeSocialMetrics([]).rate, null);
});
