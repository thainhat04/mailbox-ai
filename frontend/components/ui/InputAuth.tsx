"use client";
import { ReactNode, useRef } from "react";
import { clsx } from "clsx";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon: ReactNode;
    placeholder?: string;
    hidden?: boolean;
    value: string;
    error: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CustomInput({
    icon,
    placeholder,
    className,
    hidden = false,
    type,
    value,
    error,
    onChange,
    ...props
}: CustomInputProps) {
    const [show, setShow] = useState(false);

    const inputType = hidden ? (show ? "text" : "password") : type || "text";
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <div
                className={clsx(
                    "flex items-center gap-2 rounded-xl px-3 py-4 bg-[#261046] ",
                    className
                )}
                onClick={() => inputRef.current?.focus()}
            >
                <span>{icon}</span>
                <input
                    {...props}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    ref={inputRef}
                    type={inputType}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full outline-none bg-transparent placeholder:text-[#A4A4A4] text-white"
                />
                {hidden && (
                    <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        className="cursor-pointer p-0 text-[#A4A4A4] hover:text-white transition-colors"
                    >
                        {show ? (
                            <Eye color="#A4A4A4" />
                        ) : (
                            <EyeOff color="#A4A4A4" />
                        )}
                    </button>
                )}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
}
