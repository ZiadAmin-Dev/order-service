import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import { TOKENS } from "../../../lib/di/tokens";
import { FinanceService } from "../service/finance.service";
import { validateBody } from "../../../lib/validation/validate";
import { CreatePayoutDTO } from "../dto/finance.request.dto";
import {
    RestaurantBalanceResponseDTO,
    PayoutResponseDTO,
} from "../dto/finance.response.dto";
import { sendSuccess } from "../../../lib/http/response";

@injectable()
export class FinanceController {
    constructor(@inject(TOKENS.FinanceService) private readonly financeService: FinanceService) {}

    getBalance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const restaurantId = Number(req.params.restaurantId);
            const region = req.region || "eg";

            const balance = await this.financeService.getRestaurantBalance(restaurantId, region);
            sendSuccess(res, RestaurantBalanceResponseDTO.from(balance), 200);
        } catch (err) {
            next(err);
        }
    };

    createPayout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const restaurantId = Number(req.params.restaurantId);
            const region = req.region || "eg";
            const data = await validateBody(CreatePayoutDTO, req.body);

            const result = await this.financeService.createPayout(restaurantId, region, data);
            sendSuccess(
                res,
                PayoutResponseDTO.from(result.transaction, result.remainingBalance),
                201
            );
        } catch (err) {
            next(err);
        }
    };
}
