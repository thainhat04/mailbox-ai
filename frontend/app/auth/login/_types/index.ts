import type { User } from "@/store/slice/auth.slice";
export interface SignIn {
    email: string;
    password: string;
}

export interface SignInResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}
