const isObject = (value: any): value is Record<string, any> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

/** camelCase -> snake_case */
export const camelToSnake = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(camelToSnake);
    }

    if (isObject(obj)) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
                camelToSnake(value),
            ])
        );
    }

    return obj;
};

/** snake_case -> camelCase */
export const snakeToCamel = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    }

    if (isObject(obj)) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
                snakeToCamel(value),
            ])
        );
    }

    return obj;
};

export const convertCase = (
    type: "camelToSnake" | "snakeToCamel",
    data: any
): any => {
    if (type === "camelToSnake") {
        return camelToSnake(data);
    } else {
        return snakeToCamel(data);
    }
};
