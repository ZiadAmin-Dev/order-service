import { PaginationParams, FilterParams } from "./cursor-pagination";

const DEFAULT_SORT_BY = "createdAt";

export function parsePaginationQuery(
    query: Record<string, any>,
    allowedSortBy: string[] = ["createdAt"]
): PaginationParams {
    const sortBy = allowedSortBy.includes(query.sortBy as string)
        ? (query.sortBy as string)
        : DEFAULT_SORT_BY;

    return {
        cursor: query.cursor as string,
        limit: Math.min(100, Math.max(1, Number(query.limit) || 20)),
        sortBy,
        sortOrder: query.sortOrder === "desc" ? "desc" : "asc",
    };
}

export function parseFilters(
    query: Record<string, any>,
    allowedFields: string[]
): FilterParams[] {
    const filter = query.filter;
    if (!filter || typeof filter !== "object") return [];

    const allowedOps = new Set([
        "eq",
        "gt",
        "lt",
        "gte",
        "lte",
        "like",
        "nlike",
        "in",
        "nin",
        "between",
        "nbetween",
    ]);

    return allowedFields.flatMap((field) => {
        const fieldFilters = filter[field];
        if (!fieldFilters || typeof fieldFilters !== "object") return [];

        return Object.entries(fieldFilters)
            .filter(([op]) => allowedOps.has(op))
            .map(([operator, value]) => ({
                field,
                operator: operator as FilterParams["operator"],
                value: value as string | string[],
            }));
    });
}
