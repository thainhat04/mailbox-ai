export interface SuccessResponse<T = any> {
    success: true;
    message: string;
    data: T;
}
