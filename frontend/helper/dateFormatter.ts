// utils/dateFormatter.ts
export function formatEmailDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Kiểm tra nếu cùng năm với hiện tại
    const isCurrentYear = year === now.getFullYear();

    if (isCurrentYear) {
        return `${day}/${month}`;
    } else {
        return `${day}/${month}/${year}`;
    }
}
