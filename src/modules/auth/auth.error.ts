export class AuthError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);

    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}
