import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import { TOKENS } from "../../../lib/di/tokens";
import { AgentService } from "../service/agent.service";
import { validateBody } from "../../../lib/validation/validate";
import { UpdatePresenceDTO } from "../dto/agent.request.dto";
import {
    AgentPresenceResponseDTO,
    AgentEarningsSummaryResponseDTO,
} from "../dto/agent.response.dto";
import { sendSuccess } from "../../../lib/http/response";

@injectable()
export class AgentController {
    constructor(@inject(TOKENS.AgentService) private readonly agentService: AgentService) {}

    updatePresence = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await validateBody(UpdatePresenceDTO, req.body);
            const agentId = req.user!.userId;
            const region = req.region || "eg";

            const result = await this.agentService.updatePresence(agentId, region, data);
            sendSuccess(res, AgentPresenceResponseDTO.from(result), 200);
        } catch (err) {
            next(err);
        }
    };

    getEarnings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const agentId = req.user!.userId;
            const region = req.region || "eg";

            const result = await this.agentService.getEarnings(agentId, region);
            sendSuccess(
                res,
                AgentEarningsSummaryResponseDTO.from(
                    result.totalEarned,
                    result.deliveryCount,
                    result.currency,
                    result.recent
                ),
                200
            );
        } catch (err) {
            next(err);
        }
    };
}
