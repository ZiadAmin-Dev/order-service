import {
    IsInt,
    IsEnum,
    IsArray,
    ArrayMinSize,
    ValidateNested,
    IsOptional,
    IsString,
    Min,
} from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus, PaymentMethod } from "../enums";

export class CreateOrderItemDTO {
    @IsInt()
    @Min(1)
    productId!: number;

    @IsInt()
    @Min(1)
    quantity!: number;
}

export class CreateOrderDTO {
    @IsInt()
    @Min(1)
    restaurantId!: number;

    @IsInt()
    @Min(1)
    branchId!: number;

    @IsInt()
    @Min(1)
    customerAddressId!: number;

    @IsEnum(PaymentMethod)
    paymentMethod!: PaymentMethod;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDTO)
    items!: CreateOrderItemDTO[];
}

export class UpdateOrderStatusDTO {
    @IsEnum(OrderStatus)
    status!: OrderStatus;

    @IsOptional()
    @IsString()
    cancelReason?: string;
}
