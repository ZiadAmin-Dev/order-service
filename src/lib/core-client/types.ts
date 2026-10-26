export interface CoreClientRequest {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;                       // e.g. "/api/internal/branches/123"
    body?: unknown;                    // e.g. { "name": "New Branch Name" }
    correlationId?: string;            // e.g. "123e4567-e89b-12d3-a456-426614174000"
    idempotencyKey?: string;          // e.g. "123b4567-e9wb-1fsd3-a4446-42ffas24174000"
}
