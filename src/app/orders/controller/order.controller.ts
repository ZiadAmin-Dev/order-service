import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import { TOKENS } from "../../../lib/di/tokens";
import { OrderService } from "../service/order.service";
import { validateBody } from "../../../lib/validation/validate";
import { CreateOrderDTO, UpdateOrderStatusDTO } from "../dto/order.request.dto";
import {
    OrderResponseDTO,
    OrderStatusResponseDTO,
} from "../dto/order.response.dto";
import { sendSuccess, sendPaginated } from "../../../lib/http/response";
import { parsePaginationQuery } from "../../../lib/http/pagination/parse-query";
import { buildPaginationResult } from "../../../lib/http/pagination/cursor-pagination";
import { OrderStatus } from "../enums";
import { unauthorizedOrderActionError } from "../errors";

@injectable()
export class OrderController {
    constructor(@inject(TOKENS.OrderService) private readonly orderService: OrderService) {}

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await validateBody(CreateOrderDTO, req.body);
            const customerId = req.user!.userId;
            const region = req.region || "eg";

            const result = await this.orderService.createOrder(customerId, region, data);
            const responseDTO = OrderResponseDTO.from(result.order, result.items);
            if (result.paymentSession) {
                responseDTO.paymentSession = result.paymentSession;
            }

            sendSuccess(res, responseDTO, 201);
        } catch (err) {
            next(err);
        }
    };

    getByPublicId = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const publicId = String(req.params.publicId);
            const region = req.region || "eg";

            const result = await this.orderService.getOrderByPublicId(publicId, region);

            // Customer ownership check
            if (req.user?.role === "customer" && result.order.customerId !== req.user.userId) {
                throw unauthorizedOrderActionError;
            }

            const responseDTO = OrderResponseDTO.from(result.order, result.items);
            sendSuccess(res, responseDTO, 200);
        } catch (err) {
            next(err);
        }
    };

    getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const customerId = req.user!.userId;
            const region = req.region || "eg";
            const pagination = parsePaginationQuery(req.query, ["createdAt", "totalAmount"]);

            const result = await this.orderService.getCustomerOrders(customerId, region, pagination);
            const dtos = result.orders.map((o) =>
                OrderResponseDTO.from(o, result.itemsMap.get(o.id) || [])
            );

            const paginationResult = buildPaginationResult(dtos, pagination.limit, pagination.sortBy);
            sendPaginated(res, paginationResult.data, paginationResult.meta);
        } catch (err) {
            next(err);
        }
    };

    getBranchOrders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const branchId = Number(req.params.branchId || req.query.branchId);
            const region = req.region || "eg";
            const status = req.query.status as OrderStatus | undefined;
            const pagination = parsePaginationQuery(req.query, ["createdAt", "totalAmount"]);

            const result = await this.orderService.getBranchOrders(branchId, region, status, pagination);
            const dtos = result.orders.map((o) =>
                OrderResponseDTO.from(o, result.itemsMap.get(o.id) || [])
            );

            const paginationResult = buildPaginationResult(dtos, pagination.limit, pagination.sortBy);
            sendPaginated(res, paginationResult.data, paginationResult.meta);
        } catch (err) {
            next(err);
        }
    };

    updateStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const publicId = String(req.params.publicId);
            const region = req.region || "eg";
            const data = await validateBody(UpdateOrderStatusDTO, req.body);

            const updated = await this.orderService.updateStatus(
                publicId,
                region,
                data.status,
                req.user?.role || "restaurant_user",
                data.cancelReason
            );

            sendSuccess(res, OrderStatusResponseDTO.from(updated), 200);
        } catch (err) {
            next(err);
        }
    };

    cancelMyOrder = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const publicId = String(req.params.publicId);
            const region = req.region || "eg";

            const existing = await this.orderService.getOrderByPublicId(publicId, region);
            if (existing.order.customerId !== req.user!.userId) {
                throw unauthorizedOrderActionError;
            }

            const updated = await this.orderService.updateStatus(
                publicId,
                region,
                OrderStatus.CANCELLED,
                "customer",
                "Cancelled by customer"
            );

            sendSuccess(res, OrderStatusResponseDTO.from(updated), 200);
        } catch (err) {
            next(err);
        }
    };
}
