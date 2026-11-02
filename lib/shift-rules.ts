export function overtimeHours(actualHours: number, standardHours: number) {
  return Math.max(0, Math.round((actualHours - standardHours + Number.EPSILON) * 100) / 100);
}

export function calculateOvertimeServiceCharge(baseRate: number, extraHours: number, rules: Record<string, unknown>) {
  if (extraHours <= 0) return 0;
  const firstHours = Number(rules.firstExtensionHours ?? 0);
  const firstMultiplier = Number(rules.firstExtensionMultiplier ?? 0);
  const nextHours = Number(rules.nextExtensionHours ?? 0);
  const nextMultiplier = Number(rules.nextExtensionMultiplier ?? 0);
  if (firstHours <= 0 || firstMultiplier <= 0) throw new Error("The approved quote has no configured overtime rate for this role");
  if (extraHours > firstHours + nextHours) throw new Error("Overtime exceeds configured rate-card extension blocks; approve a revised commercial term first");
  const blocks = firstMultiplier + (extraHours > firstHours ? nextMultiplier : 0);
  return Math.round((baseRate * blocks + Number.EPSILON) * 100) / 100;
}
