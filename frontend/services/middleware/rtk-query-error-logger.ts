import { Middleware } from "@reduxjs/toolkit";
import { isRejectedWithValue } from "@reduxjs/toolkit";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { toastManager } from "@/helper/toast/toast-manager";
import serviceConstants from "@/constants/services";
import { logout } from "@/store/slice/auth.slice";

export const rtkQueryErrorLogger: Middleware =
    (storeAPI) => (next) => (action) => {
        if (isRejectedWithValue(action)) {
            const error = action.payload as FetchBaseQueryError;

            if (error.status === serviceConstants.STATUS_NOT_CLIENT_ERROR) {
                toastManager.show(error.data as string, "error");
            }

            if (error.status === serviceConstants.STATUS_UNAUTHORIZED) {
                toastManager.show(error.data as string, "error");
                storeAPI.dispatch(logout());
                error.status = serviceConstants.STATUS_NOT_CLIENT_ERROR;
            }
        }

        return next(action);
    };
