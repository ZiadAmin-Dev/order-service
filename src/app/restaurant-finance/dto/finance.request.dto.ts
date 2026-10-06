import { IsInt, Min, IsEnum, IsOptional, IsString } from "class-validator";
import { Currency } from "../../orders/enums";

export class CreatePayoutDTO {
    @IsInt()
    @Min(1)
    amount!: number; // minor units

    @IsEnum(Currency)
    currency!: Currency;

    @IsOptional()
    @IsString()
    note?: string;
}
