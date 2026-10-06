import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class UpdatePresenceDTO {
    @IsBoolean()
    isAvailable!: boolean;

    @IsOptional()
    @IsNumber()
    lat?: number;

    @IsOptional()
    @IsNumber()
    lng?: number;
}
