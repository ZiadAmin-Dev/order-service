import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import { TOKENS } from "../../../lib/di/tokens";
import { PaymentService } from "../service/payment.service";
import { validateBody } from "../../../lib/validation/validate";
import { InitPaymentDTO } from "../dto/payment.request.dto";
import { PaymentSessionResponseDTO } from "../dto/payment.response.dto";
import { sendSuccess } from "../../../lib/http/response";

@injectable()
export class PaymentController {
    constructor(@inject(TOKENS.PaymentService) private readonly paymentService: PaymentService) {}

    initPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await validateBody(InitPaymentDTO, req.body);
            const customerId = req.user!.userId;
            const region = req.region || "eg";

            const result = await this.paymentService.initPaymentSession(customerId, region, data);
            const responseDTO = PaymentSessionResponseDTO.from(
                result.sessionId,
                result.checkoutUrl,
                data.orderPublicId
            );

            sendSuccess(res, responseDTO, 200);
        } catch (err) {
            next(err);
        }
    };

    handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const signature = (req.headers["x-kashier-signature"] as string) || "";
            const region = req.region || "eg";
            const webhookData = req.body?.data || req.body;

            const result = await this.paymentService.processWebhook(
                region,
                signature,
                req.body,
                webhookData
            );

            res.status(200).json({ success: true, message: "Webhook processed successfully" });
        } catch (err) {
            next(err);
        }
    };
}
