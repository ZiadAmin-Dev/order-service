import { Knex } from "knex";

export interface PaginationParams {
    cursor?: string;
    limit: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
}

export interface PaginationMeta {
    nextCursor: string | null;
    hasMore: boolean;
    count: number;
}

export interface FilterParams {
    field: string;
    operator: "eq" | "gt" | "lt" | "gte" | "lte" | "in" | "nin" | "like" | "nlike" | "between" | "nbetween";
    value: string | string[];
}

function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function applyCursorPagination<T>(
    query: Knex.QueryBuilder,
    params: PaginationParams
): Knex.QueryBuilder {
    if (!params.sortBy) {
        return query;
    }
    const dbColumn = camelToSnake(params.sortBy);
    if (params.cursor) {
        try {
            const decoded = JSON.parse(Buffer.from(params.cursor, "base64").toString("utf-8"));
            const cursorVal = decoded.value;
            const op = params.sortOrder === "asc" ? ">" : "<";
            query = query.where(dbColumn, op, cursorVal);
        } catch {
            const op = params.sortOrder === "asc" ? ">" : "<";
            query = query.where(dbColumn, op, params.cursor);
        }
    }
    return query.orderBy(dbColumn, params.sortOrder).limit(params.limit + 1);
}

export function applyFilters<T>(
    query: Knex.QueryBuilder,
    filters: FilterParams[]
): Knex.QueryBuilder {
    for (const filter of filters) {
        const col = camelToSnake(filter.field);
        switch (filter.operator) {
            case "eq": {
                if (filter.value === null) query.whereNull(col);
                else query.where(col, filter.value);
                break;
            }
            case "gt":
                query.where(col, ">", filter.value);
                break;
            case "lt":
                query.where(col, "<", filter.value);
                break;
            case "gte":
                query.where(col, ">=", filter.value);
                break;
            case "lte":
                query.where(col, "<=", filter.value);
                break;
            case "in": {
                const arr = Array.isArray(filter.value) ? filter.value : [filter.value];
                if (arr.length === 0) query.whereRaw("1 = 0");
                else query.whereIn(col, arr);
                break;
            }
            case "nin": {
                const arr = (Array.isArray(filter.value) ? filter.value : [filter.value]).filter(
                    (v) => v !== null
                );
                if (arr.length === 0) break;
                query.whereNotIn(col, arr);
                break;
            }
            case "like":
            case "nlike": {
                if (filter.value === null) break;
                const safeValue = String(filter.value).replace(/[%_]/g, "\\$&");
                if (filter.operator === "like") query.where(col, "like", `%${safeValue}%`);
                else query.where(col, "not like", `%${safeValue}%`);
                break;
            }
            case "between":
            case "nbetween": {
                if (!Array.isArray(filter.value) || filter.value.length !== 2) break;
                const [start, end] = filter.value;
                if (start == null || end == null) break;
                const safeBounds: [any, any] =
                    typeof start === "number" && typeof end === "number" && start > end
                        ? [end, start]
                        : [start, end];
                if (filter.operator === "between") query.whereBetween(col, safeBounds);
                else query.whereNotBetween(col, safeBounds);
                break;
            }
        }
    }
    return query;
}

export function buildPaginationResult<T>(
    rows: T[],
    limit: number,
    sortBy: string
): { data: T[]; meta: PaginationMeta } {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    let nextCursor: string | null = null;

    if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1] as any;
        const payload = { id: lastItem.id, value: lastItem[sortBy] };
        nextCursor = Buffer.from(JSON.stringify(payload)).toString("base64");
    }

    return {
        data,
        meta: {
            nextCursor,
            hasMore,
            count: data.length,
        },
    };
}
