"use client";

import { Keyboard } from "lucide-react";

interface ToolbarAction {
    label: string;
    onClick: () => void;
    style?: string;
}

interface EmailToolbarProps {
    selectedFolder: string;
    actions: ToolbarAction[];
    onShowShortcuts?: () => void;
}

export default function EmailToolbar({
    selectedFolder,
    actions,
    onShowShortcuts,
}: EmailToolbarProps) {
    return (
        <div className="flex items-center gap-2 px-2 py-2 mb-1 border-b border-white/10 flex-wrap bg-linear-to-r from-slate-900/30 to-slate-900/20 backdrop-blur-sm">
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    className={
                        action.style ??
                        "rounded-lg cursor-pointer border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:border-white/30 transition"
                    }
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            ))}
            <div className="ml-auto flex items-center gap-3">
                {onShowShortcuts && (
                    <button
                        onClick={onShowShortcuts}
                        className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 px-2.5 py-1.5 text-xs text-cyan-400 hover:bg-cyan-400/10 transition cursor-pointer"
                        title="Keyboard shortcuts (?)"
                    >
                        <Keyboard size={14} />
                        <span className="hidden sm:inline">Shortcuts</span>
                    </button>
                )}
                <div className="text-xs font-medium text-cyan-400/70 truncate max-w-[150px]">
                    {selectedFolder}
                </div>
            </div>
        </div>
    );
}
