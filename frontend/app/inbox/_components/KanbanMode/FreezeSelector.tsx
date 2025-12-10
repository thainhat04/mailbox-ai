"use client";

import { useEffect, useState } from "react";

import type { FrozenTimeouts } from "../../_types/kanban";

export interface FrozenOption {
    label: string;
    value: FrozenTimeouts;
}

// Preset options
export const FROZEN_OPTIONS: FrozenOption[] = [
    { label: "1 Hour", value: "1_HOUR" },
    { label: "3 Hours", value: "3_HOURS" },
    { label: "1 Day", value: "1_DAY" },
    { label: "3 Days", value: "3_DAYS" },
    { label: "1 Week", value: "1_WEEK" },
    { label: "Custom Date & Time", value: "CUSTOM" },
];

// Props
interface FreezeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (duration: FrozenTimeouts, customDateTime?: string) => void;
}

export default function FreezeSelector({
    isOpen,
    onClose,
    onConfirm,
}: FreezeSelectorProps) {
    const [selected, setSelected] = useState<FrozenTimeouts>("1_HOUR");
    const [customDate, setCustomDate] = useState<string>("");

    useEffect(() => {
        if (isOpen) {
            document
                .querySelector(".kanban__layout")
                ?.classList.add("z-99999999");
        } else {
            document
                .querySelector(".kanban__layout")
                ?.classList.remove("z-99999999");
        }
    }, [isOpen]);
    if (!isOpen) return null;
    const handleConfirm = () => {
        if (selected === "CUSTOM" && !customDate) {
            alert("Please select a date and time.");
            return;
        }
        onConfirm(selected, customDate || undefined);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-99999999">
            {/* Modal Container */}
            <div className="bg-linear-to-br from-white/15 to-white/10 backdrop-blur-xl rounded-2xl p-6 w-[360px] shadow-2xl border border-white/20">
                {/* Header */}
                <h3 className="text-xl font-bold mb-6 text-white/95 tracking-wide">
                    Set Snooze Time
                </h3>

                {/* Options Grid */}
                <div className="space-y-3 mb-6">
                    {FROZEN_OPTIONS.map((option) => (
                        <label
                            key={option.value}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-xl
                                cursor-pointer transition-all duration-200
                                border-2 backdrop-blur-sm
                                ${
                                    selected === option.value
                                        ? "bg-cyan-400/20 border-cyan-400/50 shadow-lg shadow-cyan-500/20"
                                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                }
                            `}
                        >
                            <input
                                type="radio"
                                name="freeze"
                                value={option.value}
                                checked={selected === option.value}
                                onChange={() => setSelected(option.value)}
                                className="w-4 h-4 cursor-pointer accent-cyan-400"
                            />
                            <span className="text-white/90 font-medium">
                                {option.label}
                            </span>
                        </label>
                    ))}

                    {/* Custom Date/Time Input */}
                    {selected === "CUSTOM" && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <input
                                type="datetime-local"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                className={`
                                    w-full px-4 py-3 rounded-xl
                                    bg-white/10 border border-white/20
                                    text-white placeholder-white/40
                                    backdrop-blur-sm
                                    focus:bg-white/15 focus:border-cyan-400/50
                                    focus:outline-none focus:ring-2 focus:ring-cyan-400/20
                                    transition-all duration-200
                                `}
                            />
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className={`
                            px-5 py-2.5 rounded-lg font-medium
                            bg-white/10 border border-white/20
                            text-white/80 hover:text-white/95
                            hover:bg-white/15 hover:border-white/30
                            transition-all duration-200
                            backdrop-blur-sm
                        `}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`
                            px-5 py-2.5 rounded-lg font-medium
                            bg-linear-to-r  from-cyan-500 to-cyan-400
                            text-white shadow-lg shadow-cyan-500/30
                            hover:from-cyan-600 hover:to-cyan-500
                            hover:shadow-lg hover:shadow-cyan-500/40
                            transition-all duration-200
                            border border-cyan-400/50
                        `}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
