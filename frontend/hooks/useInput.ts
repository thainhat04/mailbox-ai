"use client";
import { useState } from "react";
type InputHookReturn = [
    string,
    (value: string) => void,
    string,
    (error: string) => void
];

function useInput(value_ = ""): InputHookReturn {
    const [value, setValue] = useState(value_);
    const [error, setError] = useState("");
    return [value, setValue, error, setError];
}

export default useInput;
