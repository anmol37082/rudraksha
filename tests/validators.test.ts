import { describe, expect, it } from "vitest";
import {
  registerSchema,
  interviewCreateSchema,
  positionSchema,
} from "@/lib/validators";
import { MANDATORY_POSITION_DOCUMENTS } from "@/lib/constants";

describe("registerSchema", () => {
  const base = {
    name: "Asha Rao",
    email: " Asha@Example.com ",
    phone: "+91 98765 43210",
    password: "secret123",
    confirmPassword: "secret123",
  };

  it("accepts valid input and normalizes email", () => {
    expect(registerSchema.parse(base).email).toBe("asha@example.com");
  });

  it("rejects mismatched passwords", () => {
    expect(
      registerSchema.safeParse({ ...base, confirmPassword: "other123" })
        .success,
    ).toBe(false);
  });

  it("requires a letter and a number in the password", () => {
    expect(
      registerSchema.safeParse({
        ...base,
        password: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        ...base,
        password: "abcdefgh",
        confirmPassword: "abcdefgh",
      }).success,
    ).toBe(false);
  });
});

describe("interviewCreateSchema", () => {
  const base = {
    applicationId: "x",
    date: "2026-11-01",
    time: "10:30",
    type: "IN_PERSON",
  };

  it("rejects invalid times", () => {
    expect(
      interviewCreateSchema.safeParse({ ...base, time: "25:00" }).success,
    ).toBe(false);
  });
});

describe("positionSchema", () => {
  it("always includes the mandatory documents", () => {
    const r = positionSchema.parse({
      title: "Head Chef",
      description: "Lead the kitchen team",
      responsibilities: [],
      requirements: [],
      skills: [],
      location: "Jaipur",
      employmentType: "FULL_TIME",
      openings: 1,
      status: "ACTIVE",
      requiredDocuments: [],
    });
    for (const d of MANDATORY_POSITION_DOCUMENTS)
      expect(r.requiredDocuments).toContain(d);
  });
});
