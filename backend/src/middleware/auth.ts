import type { Request, Response, NextFunction } from "express";

export function apiKeyAuth(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === "/health" || req.path === "/ready") {
      return next();
    }

    const provided =
      req.headers["x-api-key"] as string | undefined ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!provided || provided !== apiKey) {
      res.status(401).json({ error: "Unauthorized - invalid or missing API key." });
      return;
    }
    next();
  };
}
