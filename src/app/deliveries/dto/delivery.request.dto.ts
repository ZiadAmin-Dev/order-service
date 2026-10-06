import { IsInt, Min } from "class-validator";

export class ManualAssignDeliveryDTO {
    @IsInt()
    @Min(1)
    agentId!: number;
}
