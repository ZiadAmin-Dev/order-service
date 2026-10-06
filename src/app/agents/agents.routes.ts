import { Router } from "express";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { AgentController } from "./controller/agent.controller";
import { authentication } from "../../lib/auth/guard";
import { withCache } from "../../lib/cache/withCache";

export const agentsRouter = Router();

const agentController = container.resolve<AgentController>(TOKENS.AgentController);

// Delivery agent telemetry update
agentsRouter.post("/me/presence", authentication, agentController.updatePresence);

// Delivery agent earnings history
agentsRouter.get(
    "/me/earnings",
    authentication,
    withCache(30, true),
    agentController.getEarnings
);
