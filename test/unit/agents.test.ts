import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UpdatePresenceDTO } from "../../src/app/agents/dto/agent.request.dto";
import {
    AgentPresenceResponseDTO,
    AgentEarningsSummaryResponseDTO,
} from "../../src/app/agents/dto/agent.response.dto";
import { AgentPresence, AgentEarning } from "../../src/app/agents/entity/agent.entity";
import { validateBody } from "../../src/lib/validation/validate";

describe("Agents & Presence Domain Module", () => {
    describe("Request DTO Validation", () => {
        it("validates valid UpdatePresenceDTO", async () => {
            const body = {
                isAvailable: true,
                lat: 30.0444,
                lng: 31.2357,
            };

            const dto = await validateBody(UpdatePresenceDTO, body);
            assert.equal(dto.isAvailable, true);
            assert.equal(dto.lat, 30.0444);
            assert.equal(dto.lng, 31.2357);
        });

        it("rejects UpdatePresenceDTO with invalid latitude/longitude", async () => {
            await assert.rejects(
                () => validateBody(UpdatePresenceDTO, { isAvailable: true, lat: 95.0, lng: 30.0 }),
                (err: any) => err.statusCode === 400
            );

            await assert.rejects(
                () => validateBody(UpdatePresenceDTO, { isAvailable: true, lat: 30.0, lng: 200.0 }),
                (err: any) => err.statusCode === 400
            );
        });
    });

    describe("Response DTO Formatting", () => {
        const now = new Date();

        it("formats AgentPresenceResponseDTO correctly", () => {
            const presence = new AgentPresence({
                agentId: 42,
                region: "eg",
                isAvailable: true,
                lastLat: 30.0444,
                lastLng: 31.2357,
                lastSeenAt: now,
                updatedAt: now,
            });

            const dto = AgentPresenceResponseDTO.from(presence);
            assert.equal(dto.agentId, 42);
            assert.equal(dto.isAvailable, true);
            assert.equal(dto.lastSeenAt, now.toISOString());
        });

        it("formats AgentEarningsSummaryResponseDTO correctly", () => {
            const earning = new AgentEarning({
                id: 1,
                region: "eg",
                agentId: 42,
                orderId: 100,
                amount: 2500,
                currency: "EGP",
                createdAt: now,
            });

            const dto = AgentEarningsSummaryResponseDTO.from(5000, 2, "EGP", [earning]);
            assert.equal(dto.totalEarned, 5000);
            assert.equal(dto.deliveryCount, 2);
            assert.equal(dto.currency, "EGP");
            assert.equal(dto.recent.length, 1);
            assert.equal(dto.recent[0].amount, 2500);
            assert.equal(dto.recent[0].orderId, 100);
        });
    });
});
