# Telegram Microservices Stack

This parent-level compose setup runs the producer, consumer, and one shared RabbitMQ instance.

## Prerequisites

- Docker with Compose plugin
- Sibling directories:
  - ./test-telegram-service-producer
  - ./test-telegram-service-consumer

## Start

```bash
docker compose -f docker-compose.telegram-services.yml up --build -d
```

## Environment variables

- TELEGRAM_TOKEN (required for real delivery)
- TELEGRAM_CHAT_ID (required for real delivery) — this is your Telegram **user ID**.
  To get it, open [@userinfobot](https://t.me/userinfobot) in Telegram and send any message;
  it will reply with your numeric ID.
- RABBITMQ_URI (optional, defaults to amqp://admin:admin@rabbitmq:5672)

Example in PowerShell (Windows):

```powershell
$env:TELEGRAM_TOKEN = "<your-telegram-bot-token>"
$env:TELEGRAM_CHAT_ID = "<your-chat-id>"
docker compose -f docker-compose.telegram-services.yml up --build -d
```

Example in Bash (macOS / Linux):

```bash
export TELEGRAM_TOKEN="<your-telegram-bot-token>"
export TELEGRAM_CHAT_ID="<your-chat-id>"
docker compose -f docker-compose.telegram-services.yml up --build -d
```

---

## Running locally (RabbitMQ in Docker only)

Use this mode when you want to run the Node services directly on your machine (e.g. for hot-reload development) while keeping RabbitMQ containerised.

### 1. Start RabbitMQ

```bash
docker compose -f docker-compose.telegram-services.yml up rabbitmq -d
```

### 2. Create `config/local.yaml` in the consumer

The consumer needs Telegram credentials at runtime. Create the file
`./test-telegram-service-consumer/config/local.yaml` (it is git-ignored) with
the following content:

```yaml
telegram:
  token: "<your-telegram-bot-token>"
  chatId: "<your-user-id>"  # same as your Telegram user ID — get it from @userinfobot

broker:
  uri: amqp://admin:admin@localhost:5672
```

> The producer's `config/local.yaml` already ships with the correct local broker
> URI, so no extra file is needed there.

### 3. Install dependencies

```bash
# from each service directory
cd test-telegram-service-producer && npm install
cd ../test-telegram-service-consumer && npm install
```

### 4. Start each service

Open two terminals (or use a process manager):

**Producer**
```bash
cd test-telegram-service-producer
npm run start:dev
```

**Consumer**
```bash
cd test-telegram-service-consumer
npm run start:dev
```

Both services default to `NODE_ENV=development`, which causes the `node-config`
library to load `config/local.yaml` on top of the base config automatically.

### 5. Stop RabbitMQ when done

```bash
docker compose -f docker-compose.telegram-services.yml down rabbitmq
```

---

## Stop (full Docker stack)

```bash
docker compose -f docker-compose.telegram-services.yml down
```

To remove RabbitMQ data volume too:

```bash
docker compose -f docker-compose.telegram-services.yml down -v
```
