import { HttpException } from "@nestjs/common";
import { ErrorCode, HTTP_STATUS } from "../constants";

export class BaseException extends HttpException {
  constructor(
    message: string,
    public readonly errorCode: ErrorCode,
    statusCode: number = HTTP_STATUS.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super(
      {
        success: false,
        message,
        errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
