import crypto from "crypto";

export class GenerateUtil {
  static async generateState(domain: string): Promise<string> {
    const randomBytes = crypto.randomBytes(32);
    const randomPart = randomBytes.toString("base64");

    return `${randomPart}|${domain}`;
  }

  static async decodeState(
    state: string,
  ): Promise<{ randomPart: string; domain: string }> {
    const [randomPart, domain] = state.split("|");
    return { randomPart, domain };
  }
}
