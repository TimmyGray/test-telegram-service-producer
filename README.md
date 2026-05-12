# Test Telegram Service Producer

NestJS service that accepts HTTP requests and publishes message events to RabbitMQ.

## Project Purpose

This service is a producer in a messaging flow:

1. Receives a validated API request.
2. Builds a message event payload.
3. Publishes the event to a RabbitMQ exchange.
4. Returns API status and metadata (event ID and publish attempts).

## Main Capabilities

- Versioned REST API (`/v1/...`).
- Input validation with `class-validator` and strict global validation pipe.
- Unified JSON error format via global exception filter.
- Swagger/OpenAPI documentation.
- RabbitMQ publishing with retry logic for transient connection failures.
- Config-driven broker setup (`local` and `production` profiles).
- Dockerized runtime with optional RabbitMQ URI override during image build.

## Technology Stack

- Node.js + TypeScript
- NestJS
- RabbitMQ (`@golevelup/nestjs-rabbitmq`)
- `node-config` for configuration profiles
- Swagger (`@nestjs/swagger`)
- Jest (unit + e2e)
- Docker + Docker Compose

## API

### Base URL

By default:

- App: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api`

### Routes

| Method | Path         | Description                                |
| ------ | ------------ | ------------------------------------------ |
| POST   | `/v1/sender` | Publish message event to RabbitMQ          |

### Request: `POST /v1/sender`

```json
{
  "userId": 123,
  "text": "Hello world"
}
```

Validation rules:

- `userId`: required number
- `text`: required non-empty string

### Success Response

```json
{
  "status": "success",
  "message": "Message sent successfully",
  "eventId": "f51f4a93-f5c3-48ea-a3e4-2f2aef867fb8",
  "attempts": 1
}
```

### Error Response Format

```json
{
  "statusCode": 400,
  "timestamp": "2026-05-12T10:00:00.000Z",
  "path": "/v1/sender",
  "message": ["userId must be a number conforming to the specified constraints"]
}
```

Additional fields may appear for application errors:

- `errorCode`
- `details`

## Published RabbitMQ Message

### Exchange and Routing Key

- Exchange: `topic.producer.send-message.consumer`
- Routing key: `send-message`

### Event Payload (JSON string)

```json
{
  "eventId": "UUID",
  "occurredAt": "ISO-8601 timestamp",
  "payload": {
    "userId": 123,
    "text": "Hello world"
  }
}
```

### Publish Behavior

- Configurable retry policy from config (`broker.retry`).
- Retries transient connection failures.
- Throws structured application errors when publishing fails.

## Configuration

Configuration files are in `config/`:

- `local.yaml` for local development.
- `production.yaml` for Docker/runtime profile.
- `custom-environment-variables.yaml` for env mapping.

Current env mapping:

- `broker.uri` <- `RABBITMQ_URI`

### Profile Selection

- Local scripts use `NODE_ENV=local`.
- Docker runtime uses `NODE_ENV=production`.

## Running Locally

### Prerequisites

- Node.js 20+
- npm
- RabbitMQ (local or Docker)

### 1) Install dependencies

```bash
npm install
```

### 2) Start RabbitMQ (recommended via Docker)

```bash
docker compose up -d rabbitmq
```

RabbitMQ Management UI:

- `http://localhost:15672`
- user: `admin`
- password: `admin`

### 3) Start API

```bash
# normal local run
npm run start

# watch mode (auto-restart)
npm run start:dev

# debug watch mode
npm run start:debug
```

### 4) Quick API test

```bash
curl -X POST http://localhost:3000/v1/sender \
  -H "Content-Type: application/json" \
  -d '{"userId":123,"text":"Hello world"}'
```

## Running with Docker

### Default run

```bash
docker compose up --build -d
```

This starts:

- `rabbitmq` container
- `producer` container (Nest app)

### Inspect status and logs

```bash
docker compose ps
docker compose logs --tail 100 producer
```

## Build-Time RabbitMQ URI Override

By default, URI is taken from `config/production.yaml`.

You can override broker URI at image build time by providing `RABBITMQ_URI` in your shell before building.

### PowerShell

```powershell
$env:RABBITMQ_URI = "amqp://user:pass@your-broker:5672"
docker compose up --build -d
```

To return to default behavior:

```powershell
Remove-Item Env:RABBITMQ_URI -ErrorAction SilentlyContinue
docker compose up --build -d
```

Note:

- Build-time override is baked into the built image.
- If URI changes, rebuild image again.

## Scripts

```bash
npm run build
npm run start
npm run start:dev
npm run start:debug
npm run start:prod
npm run test
npm run test:e2e
npm run test:cov
npm run lint
```

## Testing

- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Coverage: `npm run test:cov`

## Troubleshooting

### Container cannot connect to RabbitMQ

Check:

1. `rabbitmq` container is healthy: `docker compose ps`
2. Effective URI inside producer config/environment
3. If using override, rebuild image after changing `RABBITMQ_URI`

### Local watch mode does not restart

Watch scripts are configured with polling for better reliability on Windows environments.
