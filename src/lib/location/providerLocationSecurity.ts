import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TOKEN_VERSION = "v1";
const EARTH_RADIUS_METERS = 6_371_000;

export const LOCATION_HEARTBEAT_INTERVAL_MS = 30_000;
export const LOCATION_FRESHNESS_LIMIT_MS = 90_000;
export const LOCATION_CAPTURE_MAX_AGE_MS = 90_000;
export const LOCATION_CAPTURE_FUTURE_TOLERANCE_MS = 15_000;
export const LOCATION_MINIMUM_WRITE_INTERVAL_MS = 10_000;
export const LOCATION_MAXIMUM_ACCURACY_M = 250;
export const LOCATION_START_MAXIMUM_ACCURACY_M = 100;
export const LOCATION_MAXIMUM_PLAUSIBLE_SPEED_MPS = 70;

export type ProviderCoordinates = {
  latitude: number;
  longitude: number;
};

function locationEncryptionKey() {
  const encoded = process.env.PROVIDER_LOCATION_ENCRYPTION_KEY?.trim();
  if (!encoded) {
    throw new Error("Provider location encryption is not configured.");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.byteLength !== KEY_BYTES) {
    throw new Error("Provider location encryption configuration is invalid.");
  }

  return key;
}

export function hasValidLocationEncryptionConfiguration() {
  try {
    locationEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptProviderCoordinates(coordinates: ProviderCoordinates) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", locationEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(coordinates), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    authenticationTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptProviderCoordinates(token: string): ProviderCoordinates {
  const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] =
    token.split(".");
  if (
    version !== TOKEN_VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedCiphertext ||
    extra.length > 0
  ) {
    throw new Error("Encrypted provider location has an invalid format.");
  }

  const iv = Buffer.from(encodedIv, "base64url");
  const authenticationTag = Buffer.from(encodedTag, "base64url");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");
  if (iv.byteLength !== IV_BYTES || authenticationTag.byteLength !== 16) {
    throw new Error("Encrypted provider location has invalid parameters.");
  }

  const decipher = createDecipheriv("aes-256-gcm", locationEncryptionKey(), iv);
  decipher.setAuthTag(authenticationTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
  const parsed = JSON.parse(plaintext) as Partial<ProviderCoordinates>;

  if (
    !Number.isFinite(parsed.latitude) ||
    !Number.isFinite(parsed.longitude) ||
    Number(parsed.latitude) < -90 ||
    Number(parsed.latitude) > 90 ||
    Number(parsed.longitude) < -180 ||
    Number(parsed.longitude) > 180
  ) {
    throw new Error("Decrypted provider location is invalid.");
  }

  return {
    latitude: Number(parsed.latitude),
    longitude: Number(parsed.longitude),
  };
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceBetweenCoordinates(
  first: ProviderCoordinates,
  second: ProviderCoordinates,
) {
  const latitudeDelta = degreesToRadians(second.latitude - first.latitude);
  const longitudeDelta = degreesToRadians(second.longitude - first.longitude);
  const firstLatitude = degreesToRadians(first.latitude);
  const secondLatitude = degreesToRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function isLocationFresh(
  lastSeenAt: Date | string | null | undefined,
  now = Date.now(),
) {
  if (!lastSeenAt) return false;
  const timestamp = new Date(lastSeenAt).getTime();
  return (
    Number.isFinite(timestamp) && now - timestamp <= LOCATION_FRESHNESS_LIMIT_MS
  );
}
