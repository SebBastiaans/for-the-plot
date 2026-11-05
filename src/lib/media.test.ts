import { describe, expect, it } from "vitest";
import { fitWithin, shouldCompress } from "./media";

describe("photo compression rules", () => {
  it("shrinks the longest edge to 2560 px", () => expect(fitWithin(4032, 3024, 2560)).toEqual({ w: 2560, h: 1920 }));
  it("never upscales small photos", () => expect(fitWithin(800, 600, 2560)).toEqual({ w: 800, h: 600 }));
  it("skips photos under 300 KB", () => expect(shouldCompress({ type: "image/jpeg", size: 200 * 1024 })).toBe(false));
  it("compresses large photos", () => expect(shouldCompress({ type: "image/jpeg", size: 4 * 1024 * 1024 })).toBe(true));
  it("leaves videos and GIFs alone", () => {
    expect(shouldCompress({ type: "video/mp4", size: 9e7 })).toBe(false);
    expect(shouldCompress({ type: "image/gif", size: 9e6 })).toBe(false);
  });
});
