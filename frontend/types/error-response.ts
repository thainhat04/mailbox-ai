export interface ErrorResponse {
    success: false;
    message: string;
    errorCode: string;
    statusCode: number;
    details?: any;
    timestamp: string;
    path: string;
}
