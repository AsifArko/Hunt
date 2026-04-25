export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly exposeMessage: boolean;

  public constructor(
    statusCode: number,
    code: string,
    message: string,
    exposeMessage = true,
  ) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.exposeMessage = exposeMessage;
  }
}
