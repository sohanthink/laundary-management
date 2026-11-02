import "server-only";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

const ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;

/** Spend the same time as a real check so attackers can't tell which emails exist. */
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= bcrypt.hash("not-a-real-password", ROUNDS);
  await bcrypt.compare(password, await dummyHash);
}

// No look-alike characters (0/O, 1/l/I) so it is easy to type from an email.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTempPassword(length = 10) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[randomInt(ALPHABET.length)];
  }
  return result;
}
