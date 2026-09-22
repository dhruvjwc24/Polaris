import { describe, it, expect } from "vitest";
import { safeHref } from "./safeHref";

describe("safeHref", () => {
  it("passes through http and https URLs", () => {
    expect(safeHref("https://facebook.com/somebusiness")).toBe("https://facebook.com/somebusiness");
    expect(safeHref("http://example.com")).toBe("http://example.com");
  });

  it("blocks javascript: URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
  });

  it("blocks other non-http(s) schemes", () => {
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#");
    expect(safeHref("vbscript:msgbox(1)")).toBe("#");
  });

  it("blocks null, undefined, and empty string", () => {
    expect(safeHref(null)).toBe("#");
    expect(safeHref(undefined)).toBe("#");
    expect(safeHref("")).toBe("#");
  });
});
