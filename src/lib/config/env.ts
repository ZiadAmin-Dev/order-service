import path from "path";
import { config } from "dotenv";
import { z } from "zod";

config({ path: path.resolve(__dirname, "../../../.env") });

const schema = z.object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default("development"),

    ACCESS_SECRET: z.string().default("change-me"),
    REFRESH_SECRET: z.string().default("change-me"),
    ACCESS_EXPIRES_IN: z.coerce.number().default(3600),
    REFRESH_EXPIRES_IN: z.coerce.number().default(604800),

    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    REGIONS: z.string().default("eg,ksa"),

    DB_POOL_MAX: z.coerce.number().default(10),
    DB_MIGRATION_DIRECTORY: z.string().default("src/migrations"),
    DB_MIGRATION_EXTENSION: z.string().default("ts"),

    // Region EG
    DB_eg_HOST: z.string().default("localhost"),
    DB_eg_PORT: z.coerce.number().default(5432),
    DB_eg_USERNAME: z.string().default("postgres"),
    DB_eg_PASSWORD: z.string().default(""),
    DB_eg_NAME: z.string().default("order_service_eg"),

    // Region KSA
    DB_ksa_HOST: z.string().default("localhost"),
    DB_ksa_PORT: z.coerce.number().default(5432),
    DB_ksa_USERNAME: z.string().default("postgres"),
    DB_ksa_PASSWORD: z.string().default(""),
    DB_ksa_NAME: z.string().default("order_service_ksa"),

    // Archive DBs
    ARCHIVE_DB_eg_HOST: z.string().default("localhost"),
    ARCHIVE_DB_eg_PORT: z.coerce.number().default(5432),
    ARCHIVE_DB_eg_USERNAME: z.string().default("postgres"),
    ARCHIVE_DB_eg_PASSWORD: z.string().default(""),
    ARCHIVE_DB_eg_NAME: z.string().default("order_service_archive_eg"),

    ARCHIVE_DB_ksa_HOST: z.string().default("localhost"),
    ARCHIVE_DB_ksa_PORT: z.coerce.number().default(5432),
    ARCHIVE_DB_ksa_USERNAME: z.string().default("postgres"),
    ARCHIVE_DB_ksa_PASSWORD: z.string().default(""),
    ARCHIVE_DB_ksa_NAME: z.string().default("order_service_archive_ksa"),

    // Redis
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    // RabbitMQ
    RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
    RABBITMQ_CORE_EVENTS_EXCHANGE: z.string().default("core.events"),
    RABBITMQ_CORE_EVENTS_QUEUE: z.string().default("order-service.core-events"),
    RABBITMQ_CORE_EVENTS_BINDINGS: z.string().default("product.#,branch.#,restaurant.#,rbac.#"),
    RABBITMQ_CORE_EVENTS_DLX: z.string().default("core.events.dlx"),
    RABBITMQ_CORE_EVENTS_DLQ: z.string().default("order-service.core-events.dlq"),
    RABBITMQ_PREFETCH: z.coerce.number().default(32),

    // Core Service Client
    CORE_SERVICE_BASE_URL: z.string().default("http://localhost:3000"),
    CORE_INTERNAL_API_KEY: z.string().default("change-me"),

    // WebSockets
    WS_HEARTBEAT_SEC: z.coerce.number().default(30),

    // Kashier v3
    KASHIER_API_KEY: z.string().default("kashier_test_api_key"),
    KASHIER_SECRET_KEY: z.string().default("kashier_test_secret_key"),
    KASHIER_MERCHANT_ID: z.string().default("MID-12345-678"),
    KASHIER_BASE_URL: z.string().default("https://api.kashier.io"),
});

const parsed = schema.parse(process.env);

export const env = {
    PORT: parsed.PORT,
    NODE_ENV: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === "production",
    cors: {
        origins: parsed.CORS_ORIGINS.split(",").map((s) => s.trim()),
    },
    regions: parsed.REGIONS.split(",").map((r) => r.trim().toLowerCase()),
    jwt: {
        accessSecret: parsed.ACCESS_SECRET,
        refreshSecret: parsed.REFRESH_SECRET,
        accessExpiresIn: parsed.ACCESS_EXPIRES_IN,
        refreshExpiresIn: parsed.REFRESH_EXPIRES_IN,
    },
    shards: {
        eg: {
            host: parsed.DB_eg_HOST,
            port: parsed.DB_eg_PORT,
            username: parsed.DB_eg_USERNAME,
            password: parsed.DB_eg_PASSWORD,
            name: parsed.DB_eg_NAME,
        },
        ksa: {
            host: parsed.DB_ksa_HOST,
            port: parsed.DB_ksa_PORT,
            username: parsed.DB_ksa_USERNAME,
            password: parsed.DB_ksa_PASSWORD,
            name: parsed.DB_ksa_NAME,
        },
    },
    archiveShards: {
        eg: {
            host: parsed.ARCHIVE_DB_eg_HOST,
            port: parsed.ARCHIVE_DB_eg_PORT,
            username: parsed.ARCHIVE_DB_eg_USERNAME,
            password: parsed.ARCHIVE_DB_eg_PASSWORD,
            name: parsed.ARCHIVE_DB_eg_NAME,
        },
        ksa: {
            host: parsed.ARCHIVE_DB_ksa_HOST,
            port: parsed.ARCHIVE_DB_ksa_PORT,
            username: parsed.ARCHIVE_DB_ksa_USERNAME,
            password: parsed.ARCHIVE_DB_ksa_PASSWORD,
            name: parsed.ARCHIVE_DB_ksa_NAME,
        },
    },
    db: {
        poolMax: parsed.DB_POOL_MAX,
        migrationDirectory: path.resolve(__dirname, "../../../", parsed.DB_MIGRATION_DIRECTORY),
        migrationExtension: parsed.DB_MIGRATION_EXTENSION,
    },
    redis: {
        host: parsed.REDIS_HOST,
        port: parsed.REDIS_PORT,
        password: parsed.REDIS_PASSWORD || undefined,
    },
    rabbitmq: {
        url: parsed.RABBITMQ_URL,
        exchange: parsed.RABBITMQ_CORE_EVENTS_EXCHANGE,
        queue: parsed.RABBITMQ_CORE_EVENTS_QUEUE,
        bindings: parsed.RABBITMQ_CORE_EVENTS_BINDINGS.split(",").map((b) => b.trim()),
        dlx: parsed.RABBITMQ_CORE_EVENTS_DLX,
        dlq: parsed.RABBITMQ_CORE_EVENTS_DLQ,
        prefetch: parsed.RABBITMQ_PREFETCH,
    },
    coreService: {
        baseUrl: parsed.CORE_SERVICE_BASE_URL,
        internalApiKey: parsed.CORE_INTERNAL_API_KEY,
    },
    websocket: {
        heartbeatSec: parsed.WS_HEARTBEAT_SEC,
    },
    kashier: {
        apiKey: parsed.KASHIER_API_KEY,
        secretKey: parsed.KASHIER_SECRET_KEY,
        merchantId: parsed.KASHIER_MERCHANT_ID,
        baseUrl: parsed.KASHIER_BASE_URL,
    },
};
