import { z } from "zod";
import constants from "../constants/config";
const clientEnvSchema = z.object({
    apiBaseUrl: z.string().nonempty(constants.MISSING_BASE_URL),
    domainName: z.string().nonempty(constants.MISSING_DOMAIN_NAME),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getClientEnv(): ClientEnv {
    return clientEnvSchema.parse({
        domainName: process.env.NEXT_PUBLIC_DOMAIN_NAME || "",
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
    });
}

export type EnvSchema = ClientEnv;
