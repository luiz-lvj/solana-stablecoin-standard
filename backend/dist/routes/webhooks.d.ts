import { Router } from "express";
import type { WebhookService } from "../services/webhook";
export declare function webhookRoutes(webhookService: WebhookService): Router;
