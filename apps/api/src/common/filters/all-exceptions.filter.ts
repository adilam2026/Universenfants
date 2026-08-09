import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import * as Sentry from "@sentry/node";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpException");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : { message: "Erreur interne" };
    const requestId = request.id;

    if (!isHttp) {
      this.logger.error(`[${requestId}] ${exception instanceof Error ? exception.stack : exception}`);
      Sentry.withScope((scope) => {
        scope.setTag("requestId", requestId);
        Sentry.captureException(exception);
      });
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
      ...(typeof body === "object" ? body : { message: body }),
    });
  }
}
