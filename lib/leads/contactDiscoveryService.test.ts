import { describe, it, expect } from "vitest";
import { isLikelyRelatedEmail, isRealEmail } from "./contactDiscoveryService";

describe("isRealEmail", () => {
  it("rejects known junk/placeholder addresses", () => {
    expect(isRealEmail("owner@example.com")).toBe(false);
    expect(isRealEmail("noreply@wix.com")).toBe(false);
  });

  it("accepts an ordinary business address", () => {
    expect(isRealEmail("owner@joespizza.com")).toBe(true);
  });

  it("rejects a scraped contact-page template placeholder, case-insensitively", () => {
    // Confirmed live 2026-09-22: scraped "First.Last@acora.com" from a
    // contact page's mailto: example as if it were real — sending to it
    // bounces, a real mailbox never existed there.
    expect(isRealEmail("First.Last@acora.com")).toBe(false);
    expect(isRealEmail("john.doe@somebusiness.com")).toBe(false);
  });

  it("does not false-positive on a real name that happens to contain a junk word", () => {
    expect(isRealEmail("firstlast@joespizza.com")).toBe(true);
  });
});

describe("isLikelyRelatedEmail", () => {
  it("trusts personal-provider domains regardless of business name", () => {
    expect(isLikelyRelatedEmail("owner@gmail.com", "Anything At All LLC")).toBe(true);
  });

  it("accepts a domain that shares a name token with the business", () => {
    expect(isLikelyRelatedEmail("info@joespizza.com", "Joe's Pizza")).toBe(true);
  });

  it("rejects an unrelated scraped address with no shared signal", () => {
    // The exact bug fixed last session: a broad search matching a
    // nonsense business to a scraped @baidu.com address.
    expect(isLikelyRelatedEmail("contact@baidu.com", "Sunrise Roofing Co")).toBe(false);
  });

  it("rejects an email with no domain", () => {
    expect(isLikelyRelatedEmail("not-an-email", "Sunrise Roofing")).toBe(false);
  });
});
