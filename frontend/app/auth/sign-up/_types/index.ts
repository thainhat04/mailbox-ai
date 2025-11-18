export interface SignUp {
    username?: string;
    email: string;
    password: string;
}
export interface SignUpResponse {
    userId: string;
    username: string;
    email: string;
    createdAt: string;
}
