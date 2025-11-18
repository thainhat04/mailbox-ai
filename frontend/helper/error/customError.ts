import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import serviceConstants from "@/constants/services";
import i18n from "@/lib/i18n";
export const customError = (error: any): FetchBaseQueryError => {
    const t = i18n.t.bind(i18n);
    //bắt backend và auth error
    if (error && error.status && typeof error.status === "number") {
        if (error.status === serviceConstants.STATUS_INTERNAL_ERROR) {
            return {
                status: serviceConstants.STATUS_NOT_CLIENT_ERROR,
                data: t(serviceConstants.DEFAULT_ERROR_MESSAGE),
            };
        } else if (error.status === serviceConstants.STATUS_UNAUTHORIZED) {
            return {
                status: serviceConstants.STATUS_UNAUTHORIZED,
                data: t(serviceConstants.UNAUTHORIZED_ERROR_MESSAGE),
            };
        }
        return {
            status: error.status,
            //dữ liệu lỗi nằm trong data
            data: error.isErrorAuth ? error : error.data || null,
            error: error.error || serviceConstants.DEFAULT_ERROR_MESSAGE,
        };
    }
    //lỗi do mạng
    if (error && error.status && typeof error.status === "string") {
        if (error.status === "FETCH_ERROR") {
            return {
                status: serviceConstants.STATUS_NOT_CLIENT_ERROR,
                data: t(serviceConstants.NETWORK_ERROR_MESSAGE),
            };
        }
        if (error.status === "PARSING_ERROR") {
            return {
                status: serviceConstants.STATUS_NOT_CLIENT_ERROR,
                data: t(serviceConstants.DEFAULT_ERROR_MESSAGE),
            };
        }
        if (error.status === "TIMEOUT_ERROR") {
            return {
                status: serviceConstants.STATUS_NOT_CLIENT_ERROR,
                data: t(serviceConstants.TIMEOUT_ERROR_MESSAGE),
            };
        }
        return {
            status: serviceConstants.STATUS_NOT_CLIENT_ERROR,
            data:
                String(error.error) ||
                t(serviceConstants.DEFAULT_ERROR_MESSAGE),
        };
    }

    return {
        status: "CUSTOM_ERROR",
        data: t(serviceConstants.DEFAULT_ERROR_MESSAGE),
        error: t(serviceConstants.DEFAULT_ERROR_MESSAGE),
    };
};
