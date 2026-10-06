import { IsString, IsUUID, IsOptional, IsObject } from "class-validator";

export class InitPaymentDTO {
    @IsString()
    @IsUUID()
    orderPublicId!: string;

    @IsOptional()
    @IsString()
    merchantRedirectUrl?: string;
}

export class KashierWebhookDataDTO {
    merchantOrderId!: string; // corresponds to order public_id
    kashierOrderHash!: string;
    status!: string; // SUCCESS, FAILED
    amount!: number; // minor units or decimal
    currency!: string;
    signature?: string;
}

export class KashierWebhookDTO {
    @IsOptional()
    @IsString()
    event?: string;

    @IsObject()
    data!: KashierWebhookDataDTO;
}
