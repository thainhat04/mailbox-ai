"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { KanbanColumnDetails } from "../../_types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    mode: "create" | "update" | "delete";
    column?: KanbanColumnDetails;
    onSubmit: (data: {
        id?: string;
        name: string;
        color: string;
        icon: string;
        gmailLabelName: string;
    }) => Promise<void>;
}

const PRESET_COLORS = [
    "#991b1b",
    "#9a3412",
    "#92400e",
    "#854d0e",
    "#3f6212",
    "#14532d",
    "#064e3b",
    "#134e4a",
    "#164e63",
    "#1e3a8a",
    "#1e40af",
    "#3730a3",
    "#5b21b6",
    "#6b21a8",
    "#86198f",
    "#9f1239",
];

const PRESET_ICONS = [
    "📧",
    "📥",
    "⏳",
    "✅",
    "🔥",
    "⭐",
    "🎯",
    "📌",
    "🚀",
    "💼",
    "🔔",
    "📝",
    "⚙️",
];

export default function ColumnManagementModal({
    isOpen,
    onClose,
    mode,
    column,
    onSubmit,
}: Props) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#3b82f6");
    const [icon, setIcon] = useState("📧");
    const [gmailLabelName, setGmailLabelName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({
        name: "",
        color: "",
        icon: "",
        gmailLabelName: "",
    });

    const isProtected = column?.isSystemProtected ?? false;
    const cannotModify =
        isProtected && (mode === "update" || mode === "delete");

    // Validate hex color
    const isValidHexColor = (hex: string): boolean => {
        return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors = {
            name: "",
            color: "",
            icon: "",
            gmailLabelName: "",
        };

        if (!name.trim()) {
            newErrors.name = "Column name is required";
        } else if (name.trim().length < 2) {
            newErrors.name = "Column name must be at least 2 characters";
        }

        if (!icon.trim()) {
            newErrors.icon = "Icon is required";
        } else if (!PRESET_ICONS.includes(icon)) {
            newErrors.icon = "Please select an icon from the provided options";
        }

        if (!color.trim()) {
            newErrors.color = "Color is required";
        } else if (!isValidHexColor(color)) {
            newErrors.color = "Invalid color format (use #RRGGBB or #RGB)";
        }

        if (!gmailLabelName.trim()) {
            newErrors.gmailLabelName = "Gmail label name is required";
        } else if (gmailLabelName.trim().length < 2) {
            newErrors.gmailLabelName =
                "Gmail label name must be at least 2 characters";
        }

        setErrors(newErrors);
        return !Object.values(newErrors).some((error) => error !== "");
    };

    const isFormValid =
        name.trim() !== "" &&
        icon.trim() !== "" &&
        PRESET_ICONS.includes(icon) &&
        isValidHexColor(color) &&
        gmailLabelName.trim() !== "";
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

    useEffect(() => {
        if (column && mode !== "create") {
            setName(column.name);
            setColor(column.color);
            setIcon(column.icon);
            setGmailLabelName(column.gmailLabelName);
        } else {
            setName("");
            setColor("#3b82f6");
            setIcon("📧");
            setGmailLabelName("");
        }
        setErrors({ name: "", color: "", icon: "", gmailLabelName: "" });
    }, [column, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cannotModify) return;

        // Validate before submitting
        if (mode !== "delete" && !validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            if (mode === "delete") onClose();
            await onSubmit({
                id: column?.id,
                name: mode === "delete" ? column?.name! : name.trim(),
                color: mode === "delete" ? column?.color! : color.trim(),
                icon: mode === "delete" ? column?.icon! : icon.trim(),
                gmailLabelName: gmailLabelName.trim(),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-white/10 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-bold text-white">
                        {mode === "create" && "Create New Column"}
                        {mode === "update" && "Update Column"}
                        {mode === "delete" && "Delete Column"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/60 cursor-pointer hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col flex-1 min-h-0"
                >
                    <div className="p-6 space-y-5 overflow-y-auto custom-scroll flex-1">
                        {cannotModify && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm">
                                ⚠️ This is a system-protected column and cannot
                                be {mode === "update" ? "updated" : "deleted"}.
                            </div>
                        )}

                        {mode === "delete" ? (
                            <div className="text-white/80 text-sm space-y-2">
                                <p>
                                    Are you sure you want to delete this column?
                                </p>
                                <div className="bg-white/5 rounded-lg p-4 flex items-center gap-3">
                                    <span className="text-2xl">
                                        {column?.icon}
                                    </span>
                                    <div>
                                        <p className="font-semibold text-white">
                                            {column?.name}
                                        </p>
                                        <p className="text-xs text-white/60">
                                            {column?.emailCount} emails
                                        </p>
                                    </div>
                                </div>
                                <p className="text-red-400 text-xs">
                                    ⚠️ All emails in this column will be moved
                                    to the default column.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Column Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (errors.name) {
                                                setErrors({
                                                    ...errors,
                                                    name: "",
                                                });
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!name.trim()) {
                                                setErrors({
                                                    ...errors,
                                                    name: "Column name is required",
                                                });
                                            } else if (name.trim().length < 2) {
                                                setErrors({
                                                    ...errors,
                                                    name: "Column name must be at least 2 characters",
                                                });
                                            }
                                        }}
                                        disabled={cannotModify}
                                        placeholder="e.g., In Progress"
                                        className={`w-full px-4 py-2.5 bg-white/5 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            errors.name
                                                ? "border-red-500 focus:ring-red-500"
                                                : "border-white/10 focus:ring-blue-500"
                                        }`}
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-red-400 text-xs mt-1">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                {/* Gmail Label Name */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Gmail Label Name
                                    </label>
                                    <input
                                        type="text"
                                        value={gmailLabelName}
                                        onChange={(e) => {
                                            setGmailLabelName(e.target.value);
                                            if (errors.gmailLabelName) {
                                                setErrors({
                                                    ...errors,
                                                    gmailLabelName: "",
                                                });
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!gmailLabelName.trim()) {
                                                setErrors({
                                                    ...errors,
                                                    gmailLabelName:
                                                        "Gmail label name is required",
                                                });
                                            } else if (
                                                gmailLabelName.trim().length < 2
                                            ) {
                                                setErrors({
                                                    ...errors,
                                                    gmailLabelName:
                                                        "Gmail label name must be at least 2 characters",
                                                });
                                            }
                                        }}
                                        disabled={cannotModify}
                                        placeholder="e.g., work/in-progress"
                                        className={`w-full px-4 py-2.5 bg-white/5 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            errors.gmailLabelName
                                                ? "border-red-500 focus:ring-red-500"
                                                : "border-white/10 focus:ring-blue-500"
                                        }`}
                                        required
                                    />
                                    {errors.gmailLabelName ? (
                                        <p className="text-red-400 text-xs mt-1">
                                            {errors.gmailLabelName}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-white/50 mt-1">
                                            The Gmail label to sync with this
                                            column
                                        </p>
                                    )}
                                </div>

                                {/* Icon */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Icon
                                    </label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {PRESET_ICONS.map((presetIcon) => (
                                            <button
                                                key={presetIcon}
                                                type="button"
                                                onClick={() => {
                                                    setIcon(presetIcon);
                                                    if (errors.icon) {
                                                        setErrors({
                                                            ...errors,
                                                            icon: "",
                                                        });
                                                    }
                                                }}
                                                disabled={cannotModify}
                                                className={`p-3 text-2xl rounded-lg transition-all ${
                                                    icon === presetIcon
                                                        ? "bg-blue-500/30 ring-2 ring-blue-500"
                                                        : "bg-white/5 hover:bg-white/10"
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {presetIcon}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.icon && (
                                        <p className="text-red-400 text-xs mt-2">
                                            {errors.icon}
                                        </p>
                                    )}
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Color
                                    </label>
                                    <div className="grid grid-cols-8 gap-2 mb-2">
                                        {PRESET_COLORS.map((presetColor) => (
                                            <button
                                                key={presetColor}
                                                type="button"
                                                onClick={() => {
                                                    setColor(presetColor);
                                                    if (errors.color) {
                                                        setErrors({
                                                            ...errors,
                                                            color: "",
                                                        });
                                                    }
                                                }}
                                                disabled={cannotModify}
                                                className={`w-10 h-10 rounded-lg transition-all ${
                                                    color === presetColor
                                                        ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                                                        : ""
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                style={{
                                                    backgroundColor:
                                                        presetColor,
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                                setColor(e.target.value);
                                                if (errors.color) {
                                                    setErrors({
                                                        ...errors,
                                                        color: "",
                                                    });
                                                }
                                            }}
                                            disabled={cannotModify}
                                            className="
                                            w-16 h-10 rounded-lg cursor-pointer
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            filter brightness-75 saturate-75
                                        "
                                        />
                                        <input
                                            type="text"
                                            value={color}
                                            onChange={(e) => {
                                                setColor(e.target.value);
                                                if (errors.color) {
                                                    setErrors({
                                                        ...errors,
                                                        color: "",
                                                    });
                                                }
                                            }}
                                            onBlur={() => {
                                                if (!color.trim()) {
                                                    setErrors({
                                                        ...errors,
                                                        color: "Color is required",
                                                    });
                                                } else if (
                                                    !isValidHexColor(color)
                                                ) {
                                                    setErrors({
                                                        ...errors,
                                                        color: "Invalid color format (use #RRGGBB or #RGB)",
                                                    });
                                                }
                                            }}
                                            disabled={cannotModify}
                                            placeholder="#3b82f6"
                                            className={`flex-1 px-4 py-2.5 bg-white/5 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                errors.color
                                                    ? "border-red-500 focus:ring-red-500"
                                                    : "border-white/10 focus:ring-blue-500"
                                            }`}
                                        />
                                    </div>
                                    {errors.color && (
                                        <p className="text-red-400 text-xs mt-1">
                                            {errors.color}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-6 border-t border-white/10 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="cursor-pointer flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={
                                cannotModify ||
                                isSubmitting ||
                                (mode !== "delete" && !isFormValid)
                            }
                            className={`cursor-pointer flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                mode === "delete"
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-blue-500 hover:bg-blue-600 text-white"
                            }`}
                        >
                            {isSubmitting
                                ? "Processing..."
                                : mode === "create"
                                ? "Create"
                                : mode === "update"
                                ? "Update"
                                : "Delete"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
