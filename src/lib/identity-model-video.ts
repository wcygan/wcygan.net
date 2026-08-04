export type BrowserIdentity = Pick<
  Navigator,
  "maxTouchPoints" | "platform" | "userAgent"
>;

export type TransparentIdentityVideoFormat = "hevc" | "webm";

const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/;
const APPLE_WEBKIT_PATTERN = /AppleWebKit/;
const NON_WEBKIT_BROWSER_PATTERN =
  /Chrome|Chromium|CriOS|Edg|EdgiOS|Firefox|FxiOS|OPR/;

/**
 * Safari can play VP9-alpha WebMs while rendering their transparent pixels as
 * black (WebKit bug 275908). Apple browsers receive HEVC-alpha instead; other
 * browsers keep the existing VP9-alpha WebMs.
 */
export function preferredTransparentIdentityVideoFormat(
  browser: BrowserIdentity,
): TransparentIdentityVideoFormat {
  const isIOSDevice =
    IOS_DEVICE_PATTERN.test(browser.userAgent) ||
    (browser.platform === "MacIntel" && browser.maxTouchPoints > 1);
  const isAppleWebKit =
    APPLE_WEBKIT_PATTERN.test(browser.userAgent) &&
    !NON_WEBKIT_BROWSER_PATTERN.test(browser.userAgent);

  return isIOSDevice || isAppleWebKit ? "hevc" : "webm";
}
