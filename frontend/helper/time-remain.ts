export function getRemainingTime(isoString?: string): string {
    if (!isoString) return "";

    const end = new Date(isoString).getTime();
    const now = Date.now();
    let diff = end - now;

    if (diff <= 0) return "Đã hết hạn";

    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    if (seconds > 0) parts.push(`${seconds} giây`);

    return parts.join(" ");
}
