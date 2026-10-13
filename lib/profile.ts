type P = Record<string, any> | null | undefined;

const checks: [string, (u: P, p: P) => boolean][] = [
  ["Phone", (u) => !!u?.phone],
  ["Profile photo", (_, p) => !!p?.profilePhoto || !!p?.documents?.some((d: any) => d.documentType === "PASSPORT_PHOTO")],
  ["Date of birth", (_, p) => !!p?.dateOfBirth],
  ["Gender", (_, p) => !!p?.gender],
  ["Address", (_, p) => !!p?.address],
  ["City", (_, p) => !!p?.city],
  ["State", (_, p) => !!p?.state],
  ["Country", (_, p) => !!p?.country],
  ["Postal code", (_, p) => !!p?.postalCode],
  ["Skills", (_, p) => !!p?.skills?.length],
  ["Experience", (_, p) => !!p?.experience || p?.yearsOfExperience > 0],
  ["Languages", (_, p) => !!p?.languages?.length],
  ["Availability", (_, p) => !!p?.availability],
  ["Emergency contact", (_, p) => !!p?.emergencyContact?.name && !!p?.emergencyContact?.phone],
  ["Resume", (_, p) => !!p?.documents?.some((d: any) => d.documentType === "RESUME")],
];

export function profileCompletion(user: P, profile: P) {
  const missing = checks.filter(([, f]) => !f(user, profile)).map(([l]) => l);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

/** Minimum details needed before a candidate may apply. */
export function missingForApply(user: P, profile: P) {
  const req: [string, boolean][] = [
    ["Phone", !!user?.phone],
    ["Date of birth", !!profile?.dateOfBirth],
    ["Address", !!profile?.address],
    ["City", !!profile?.city],
    ["Country", !!profile?.country],
    ["Emergency contact", !!profile?.emergencyContact?.name && !!profile?.emergencyContact?.phone],
  ];
  return req.filter(([, v]) => !v).map(([l]) => l);
}
