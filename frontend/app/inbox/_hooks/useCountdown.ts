import { useEffect, useState } from "react";
import { getRemainingTime } from "@/helper/time-remain";

export function useCountdown(target?: string) {
    const [time, setTime] = useState("");

    useEffect(() => {
        if (!target) return;

        const update = () => setTime(getRemainingTime(target));
        update(); // chạy lần đầu

        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [target]);

    return time;
}
