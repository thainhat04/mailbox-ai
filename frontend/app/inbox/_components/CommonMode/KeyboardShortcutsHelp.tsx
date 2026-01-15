"use client";

import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function KeyboardShortcutsHelp({
    isOpen,
    onClose,
}: KeyboardShortcutsHelpProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const shortcuts = [
        {
            key: "↑ / k",
            description: t("keyboard_shortcuts_help.previous_email"),
        },
        { key: "↓ / j", description: t("keyboard_shortcuts_help.next_email") },
        { key: "a", description: t("keyboard_shortcuts_help.a") },
        { key: "f", description: t("keyboard_shortcuts_help.f") },
        { key: "o", description: t("keyboard_shortcuts_help.o") },
        { key: "s", description: t("keyboard_shortcuts_help.s") },
        { key: "x", description: t("keyboard_shortcuts_help.x") },
        { key: "c", description: t("keyboard_shortcuts_help.c") },
        { key: "u", description: t("keyboard_shortcuts_help.u") },
        { key: "r", description: t("keyboard_shortcuts_help.r") },
        { key: "d", description: t("keyboard_shortcuts_help.d") },
        { key: "?", description: t("keyboard_shortcuts_help.help") },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative w-[90%] max-w-2xl bg-linear-to-br from-[#1a1b2b] via-[#0f111a] to-[#2c1e4f] rounded-2xl shadow-2xl border border-white/20 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-400 to-purple-400">
                        ⌨ {t("keyboard_shortcuts_help.title")}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 cursor-pointer rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                {/* Shortcuts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scroll pr-2">
                    {shortcuts.map((shortcut, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <span className="text-sm text-white/80">
                                {shortcut.description}
                            </span>
                            <kbd className="px-3 py-1.5 rounded-md bg-linear-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-300 font-mono text-xs font-semibold shadow-lg">
                                {shortcut.key}
                            </kbd>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-xs text-white/50 text-center">
                        {t("keyboard_shortcuts_help.close", {
                            key: "Esc",
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}
