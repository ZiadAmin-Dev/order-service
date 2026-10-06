import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import { TOKENS } from "../../../lib/di/tokens";
import { DeliveryService } from "../service/delivery.service";
import { validateBody } from "../../../lib/validation/validate";
import { ManualAssignDeliveryDTO } from "../dto/delivery.request.dto";
import {
    DeliveryAssignmentResponseDTO,
    DeliveryFulfillmentResponseDTO,
} from "../dto/delivery.response.dto";
import { OrderStatusResponseDTO } from "../../orders/dto/order.response.dto";
import { sendSuccess } from "../../../lib/http/response";

@injectable()
export class DeliveryController {
    constructor(@inject(TOKENS.DeliveryService) private readonly deliveryService: DeliveryService) {}

    assign = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const publicId = String(req.params.orderPublicId);
            const region = req.region || "eg";
            const data = await validateBody(ManualAssignDeliveryDTO, req.body);

            const updated = await this.deliveryService.manualAssign(publicId, data.agentId, region);
            sendSuccess(res, DeliveryAssignmentResponseDTO.from(updated), 200);
        } catch (err) {
            next(err);
        }
    };

    pickup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const publicId = String(req.params.orderPublicId);
            const agentId = req.user!.userId;
            const region = req.region || "eg";

            const updated = await this.deliveryService.pickup(publicId, agentId, region);
            sendSuccess(res, OrderStatusResponseDTO.from(updated), 200);
        } catch (err) {
            next(err);
        }
    };

    delivered = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const publicId = String(req.params.orderPublicId);
            const agentId = req.user!.userId;
            const region = req.region || "eg";

            const result = await this.deliveryService.fulfill(publicId, agentId, region);
            sendSuccess(
                res,
                DeliveryFulfillmentResponseDTO.from(result.order, result.agentEarning),
                200
            );
        } catch (err) {
            next(err);
        }
    };
}
