export const MIN_JWT_SECRET_LENGTH = 32;

export function hasStrongJwtSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= MIN_JWT_SECRET_LENGTH;
}
