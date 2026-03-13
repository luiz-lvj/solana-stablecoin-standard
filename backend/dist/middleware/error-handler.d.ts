import type { Request, Response, NextFunction } from "express";
import type pino from "pino";
export declare function errorHandler(logger: pino.Logger): (err: Error, _req: Request, res: Response, _next: NextFunction) => void;
