import { FrozenTimeouts } from "@/app/inbox/_types";

export interface TimeoutDuration {
    duration: FrozenTimeouts;
    customDateTime?: string;
}

/**
 * Convert FrozenTimeouts or customDateTime to milliseconds
 */
export function getTimeoutMs(timeoutDuration?: TimeoutDuration): number {
    if (!timeoutDuration) return 0;

    const now = Date.now();

    switch (timeoutDuration.duration) {
        case "1_HOUR":
            return 60 * 60 * 1000;
        case "3_HOURS":
            return 3 * 60 * 60 * 1000;
        case "1_DAY":
            return 24 * 60 * 60 * 1000;
        case "3_DAYS":
            return 3 * 24 * 60 * 60 * 1000;
        case "1_WEEK":
            return 7 * 24 * 60 * 60 * 1000;
        case "CUSTOM":
            if (!timeoutDuration.customDateTime) return 0;
            const targetTime = new Date(
                timeoutDuration.customDateTime
            ).getTime();
            return Math.max(targetTime - now, 0);
        default:
            return 0;
    }
}
