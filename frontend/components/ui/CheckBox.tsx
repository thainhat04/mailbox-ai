"use client";

import clsx from "clsx";

interface CheckboxProps {
    checked: boolean;
    onChange: () => void;
    size?: number;
    className?: string;
}

export default function Checkbox({
    checked,
    onChange,
    size = 20,
    className,
}: CheckboxProps) {
    return (
        <button
            type="button"
            onClick={onChange}
            style={{ width: size, height: size }}
            className={clsx(
                "rounded border-2 cursor-pointer flex items-center justify-center transition-colors shrink-0",
                checked
                    ? "bg-cyan-500 border-cyan-500"
                    : "bg-transparent border-white/50 hover:border-white/70",
                className
            )}
            aria-pressed={checked}
        >
            {checked && (
                <svg
                    className="text-white"
                    width={size * 0.6}
                    height={size * 0.6}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                    />
                </svg>
            )}
        </button>
    );
}
