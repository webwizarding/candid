export const TOR_INVITE_PREFIX = "candid-tor-v1:";
function decode(text: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(text))
    throw new Error("Invalid invite encoding.");
  return Uint8Array.from(
    atob(text.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}
export function readTorInvite(raw: string, now = Date.now()) {
  const code = raw.trim();
  if (code.length > 2048 || !code.startsWith(TOR_INVITE_PREFIX))
    throw new Error("Paste a complete Candid Tor invite.");
  try {
    const value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        decode(code.slice(TOR_INVITE_PREFIX.length)),
      ),
    );
    if (
      !value ||
      Object.keys(value).sort().join(",") !== "clubId,expires,key,onion" ||
      typeof value.onion !== "string" ||
      !/^[a-z2-7]{55}d\.onion$/.test(value.onion) ||
      typeof value.key !== "string" ||
      decode(value.key).length !== 32 ||
      typeof value.clubId !== "string" ||
      !value.clubId ||
      new TextEncoder().encode(value.clubId).length > 100 ||
      !Number.isSafeInteger(value.expires)
    )
      throw new Error("Invalid invite.");
    const seconds = Math.floor(now / 1000);
    if (value.expires <= seconds || value.expires > seconds + 660)
      throw new Error(
        "This invite expired or the device clocks disagree. Ask for a fresh invite.",
      );
    return {
      onion: value.onion as string,
      clubId: value.clubId as string,
      expires: value.expires as number,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("This invite expired")
    )
      throw error;
    throw new Error(
      "Invalid Tor invite. Copy the complete code from your peer.",
    );
  }
}
