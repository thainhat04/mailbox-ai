import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { ErrorDto } from "../../common/dtos";
import { CODES, ERROR_MESSAGES } from "../../common/constants";
import type { ErrorCode } from "../../common/constants";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = ERROR_MESSAGES[CODES.INTERNAL_SERVER_ERROR];
    let errorCode: ErrorCode = CODES.INTERNAL_SERVER_ERROR;
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errorCode = responseObj.errorCode || CODES.INTERNAL_SERVER_ERROR;
        details = responseObj.details || null;

        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(", ");
          errorCode = CODES.VALIDATION_ERROR;
        }
      } else {
        message = exceptionResponse as string;
      }
    }

    // Log error
    this.logger.error(
      `Error occurred: ${message}`,
      exception instanceof Error ? exception.stack : "",
    );

    const errorResponse = new ErrorDto(
      message,
      errorCode,
      status,
      details,
      request.url,
    );

    response.status(status).send(errorResponse);
  }
}
