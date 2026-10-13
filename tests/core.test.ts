import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";
import { sniff, validateFile } from "@/lib/cloudinary";
import { TRANSITIONS } from "@/lib/transitions";
import { missingForApply, profileCompletion } from "@/lib/profile";
import { isOpen, slugify } from "@/lib/data";
import { escapeRegex, pageParams } from "@/lib/api";

describe("auth tokens", () => {
  it("round-trips a session and strips extra claims", () => {
    const s = verifyToken(
      signToken({ id: "abc", role: "ADMIN", name: "Admin" }),
    );
    expect(s).toEqual({ id: "abc", role: "ADMIN", name: "Admin" });
  });

  it("rejects tampered tokens", () => {
    const t = signToken({ id: "abc", role: "CANDIDATE", name: "C" });
    expect(verifyToken(t.slice(0, -2) + "xx")).toBeNull();
  });
});

describe("file sniffing", () => {
  const pad = (b: number[]) => Buffer.from([...b, ...new Array(16).fill(0)]);

  it("detects real file types from bytes", () => {
    expect(sniff(pad([0xff, 0xd8, 0xff]))?.ext).toBe("jpg");
    expect(
      sniff(Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(8)]))?.ext,
    ).toBe("pdf");
    expect(sniff(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });

  it("refuses PDFs where a photo is required and empty files", () => {
    expect(() =>
      validateFile(
        Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(8)]),
        true,
      ),
    ).toThrow();
    expect(() => validateFile(Buffer.alloc(0), false)).toThrow();
  });
});

describe("status transitions", () => {
  it("never allows moving out of a final state", () => {
    expect(TRANSITIONS.SELECTED).toEqual([]);
    expect(TRANSITIONS.REJECTED).toEqual([]);
  });

  it("does not allow jumping straight to INTERVIEW_SCHEDULED", () => {
    for (const next of Object.values(TRANSITIONS))
      expect(next).not.toContain("INTERVIEW_SCHEDULED");
  });
});

describe("profile checks", () => {
  it("lists what is missing before applying", () => {
    expect(missingForApply({ phone: "1" }, { city: "Pune" })).toEqual([
      "Date of birth",
      "Address",
      "Country",
      "Emergency contact",
    ]);
  });

  it("reports 0% for an empty profile", () => {
    expect(profileCompletion(null, null).percent).toBe(0);
  });
});

describe("helpers", () => {
  it("isOpen respects status and deadline", () => {
    expect(isOpen({ status: "ACTIVE" })).toBe(true);
    expect(isOpen({ status: "CLOSED" })).toBe(false);
    expect(
      isOpen({ status: "ACTIVE", applicationDeadline: "2000-01-01" }),
    ).toBe(false);
  });

  it("pageParams clamps page and limit", () => {
    expect(pageParams(new URLSearchParams("page=-3&limit=999"))).toEqual({
      page: 1,
      limit: 50,
      skip: 0,
    });
  });

  it("escapeRegex neutralizes special characters", () => {
    expect(new RegExp(escapeRegex("a.*b")).test("aXXb")).toBe(false);
  });

  it("slugify produces url-safe slugs", () => {
    expect(slugify("  Head Chef / Jaipur! ")).toBe("head-chef-jaipur");
  });
});
