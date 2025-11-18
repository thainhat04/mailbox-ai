import { isCustomError } from "@/helper/error/deprecated";
import constant from "@/constants/config";
export default function getErrorMessage(error: unknown): string {
    if (isCustomError(error)) {
        return error.data as string;
    } else {
        return constant.ERROR_DEFAULT;
    }
}
