"use client";
import { useState } from "react";
import { useSelector, useDispatch } from "@/store";
import { logout } from "@/store/slice/auth.slice";

import { useRouter } from "next/navigation";

export default function UserDropdown({
    isTop = false,
    isHideEmail = false,
    isHome = false,
}: {
    isTop?: boolean;
    isHideEmail?: boolean;
    isHome?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const user = useSelector((state) => state.auth.user);
    const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
    const dispatch = useDispatch();
    const router = useRouter();

    if (!isLoggedIn) {
        return null;
    }

    return (
        <div
            style={{ alignSelf: "start" }}
            className="relative inline-block text-left"
        >
            <button
                onClick={() => setOpen(!open)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition"
            >
                <div className="w-8 h-8 rounded-full bg-blue-300 flex items-center justify-center font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                    {user?.email?.charAt(1).toUpperCase()}
                </div>
                {!isHideEmail && (
                    <span className="max-w-40 truncate">{user?.email}</span>
                )}
            </button>

            {open && (
                <div
                    className={`absolute left-0 ${
                        isTop ? "bottom-full mb-2" : "top-full mt-2"
                    } w-40 bg-neutral-900 rounded-xl shadow-lg border border-neutral-700 overflow-hidden`}
                >
                    {!isHome && (
                        <button
                            className="w-full cursor-pointer text-left px-4 py-2 text-sm text-white hover:bg-neutral-800 transition"
                            onClick={() => router.push("/")}
                        >
                            Go Home
                        </button>
                    )}

                    <button
                        className="w-full cursor-pointer text-left px-4 py-2 text-sm text-red-500 hover:bg-neutral-800 transition"
                        onClick={() => dispatch(logout())}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
