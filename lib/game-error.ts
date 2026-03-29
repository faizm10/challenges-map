export class GameError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GameError";
    this.status = status;
  }
}

export function isGameError(error: unknown): error is GameError {
  return error instanceof GameError;
}
