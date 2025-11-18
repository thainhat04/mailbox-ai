// components/Inbox/EmailRow.tsx
"use client";

import { Email } from "../_types";
import { Star, Circle } from "lucide-react";
import clsx from "clsx";
import Checkbox from "@/components/ui/CheckBox";
import { formatEmailDate } from "@/helper/dateFormatter";

interface EmailRowProps {
    email: Email;
    active: boolean;
    selected: boolean;
    onSelect: (email: Email) => void;
    onToggleSelect: (emailId: string) => void;
    onToggleStar: (emailId: string) => void;
    onToggleRead: (emailId: string) => void;
}

export default function EmailRow({
    email,
    active,
    selected,
    onSelect,
    onToggleSelect,
    onToggleStar,
    onToggleRead,
}: EmailRowProps) {
    return (
        <div
            className={clsx(
                "group w-full flex flex-col px-4 py-2 gap-1 relative rounded-lg cursor-pointer transition",
                active
                    ? "bg-linear-to-r from-cyan-300/30 via-indigo-300/30 to-purple-300/30 border-l-4 border-cyan-400 shadow-md ring-1 ring-cyan-400/30"
                    : !email.isRead
                    ? "bg-cyan-100/10 hover:bg-cyan-200/15 ring-1 ring-cyan-300/20"
                    : "bg-black/10 hover:bg-black/15 ring-1 ring-white/10"
            )}
            onClick={() => onSelect(email)}
        >
            {/* Checkbox */}
            <div
                className="absolute left-2 top-2"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(email.id);
                }}
            >
                <Checkbox checked={selected} size={15} onChange={() => {}} />
            </div>

            {/* Main row */}
            <div className="flex items-center justify-between gap-2 ml-6">
                <div className="flex items-center gap-2">
                    {/* Toggle isRead */}
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleRead(email.id);
                        }}
                        className="cursor-pointer"
                        title={email.isRead ? "Mark as unread" : "Mark as read"}
                    >
                        <Circle
                            size={12}
                            className={clsx(
                                email.isRead
                                    ? "text-white/30 fill-white/10"
                                    : "text-cyan-400 fill-cyan-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]"
                            )}
                        />
                    </span>

                    {/* Sender */}
                    <span
                        className={clsx(
                            "text-sm truncate",
                            email.isRead
                                ? "text-white/70"
                                : "text-white font-semibold"
                        )}
                    >
                        {email.from.email}
                    </span>
                </div>

                {/* Time and Star */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/50">
                        {formatEmailDate(email.timestamp)}
                    </span>
                    <span
                        className="cursor-pointer"
                        title={email.isStarred ? "Unstar" : "Star"}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(email.id);
                        }}
                    >
                        <Star
                            size={14}
                            className={clsx(
                                email.isStarred
                                    ? "text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]"
                                    : "text-white/40"
                            )}
                        />
                    </span>
                </div>
            </div>

            {/* Subject */}
            <p
                title={email.subject}
                className={clsx(
                    "text-xs truncate ml-6",
                    email.isRead
                        ? "text-white/60"
                        : "text-cyan-50 font-semibold"
                )}
            >
                {email.subject}
            </p>

            {/* Preview */}
            <p
                title={email.preview}
                className={clsx(
                    "text-[11px] ml-6 truncate",
                    email.isRead ? "text-white/45" : "text-white/70"
                )}
            >
                {email.preview}
            </p>

            {/* Badge Chưa đọc */}
            {!email.isRead && !active && (
                <span
                    style={{ alignSelf: "start" }}
                    className="mt-1 ml-6 rounded-full bg-linear-to-r from-cyan-500 to-sky-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm shadow-cyan-500/40 ring-1 ring-cyan-400/40"
                >
                    Chưa đọc
                </span>
            )}
        </div>
    );
}
