import { describe, expect, it } from "vitest";
import { preferredTransparentIdentityVideoFormat } from "./identity-model-video";

function browserIdentity(
  userAgent: string,
  overrides: Partial<Pick<Navigator, "maxTouchPoints" | "platform">> = {},
) {
  return {
    maxTouchPoints: overrides.maxTouchPoints ?? 0,
    platform: overrides.platform ?? "MacIntel",
    userAgent,
  };
}

describe("transparent identity video format", () => {
  it("uses HEVC-alpha on macOS Safari", () => {
    const safari = browserIdentity(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
    );

    expect(preferredTransparentIdentityVideoFormat(safari)).toBe("hevc");
  });

  it("uses HEVC-alpha in every iOS browser", () => {
    const mobileSafari = browserIdentity(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 " +
        "Mobile/15E148 Safari/604.1",
      { platform: "iPhone" },
    );
    const chromeIOS = browserIdentity(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 " +
        "Mobile/15E148 Safari/604.1",
      { platform: "iPhone" },
    );

    expect(preferredTransparentIdentityVideoFormat(mobileSafari)).toBe("hevc");
    expect(preferredTransparentIdentityVideoFormat(chromeIOS)).toBe("hevc");
  });

  it("recognizes iPadOS when it requests the desktop site", () => {
    const desktopIPad = browserIdentity(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
      { maxTouchPoints: 5 },
    );

    expect(preferredTransparentIdentityVideoFormat(desktopIPad)).toBe("hevc");
  });

  it("uses HEVC-alpha in embedded Apple WebKit", () => {
    const webKitView = browserIdentity(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko)",
    );

    expect(preferredTransparentIdentityVideoFormat(webKitView)).toBe("hevc");
  });

  it("keeps VP9-alpha animation in Chromium and Firefox", () => {
    const chrome = browserIdentity(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    );
    const firefox = browserIdentity(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) " +
        "Gecko/20100101 Firefox/142.0",
    );

    expect(preferredTransparentIdentityVideoFormat(chrome)).toBe("webm");
    expect(preferredTransparentIdentityVideoFormat(firefox)).toBe("webm");
  });
});
