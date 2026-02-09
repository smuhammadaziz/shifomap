# Landing page API

## POST /v1/landing/contact

Used when a clinic contacts you from the landing page. Sends a notification to your Telegram group (via the same bot used by the telegram-bot app).

**Request (e.g. from Postman)**

- Method: `POST`
- URL: `http://localhost:PORT/v1/landing/contact` (replace PORT with your api-main port, e.g. 8080)
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
  "clinicName": "Med CLINIC SOME example name",
  "phoneNumber": "+9989999999"
}
```

**Response**

- `200`: `{ "success": true, "data": { "message": "Notification sent" } }`
- `400`: Validation error (missing or invalid `clinicName` / `phoneNumber`)
- `500`: Server or Telegram API error

**Telegram group message format**

```
🏥 New Clinic Contacted

📌 Name: Med CLINIC SOME example name
📞 Phone: +9989999999

🕐 28.02.2026 15.55 da yubordi
```

**Environment (api-main)**

- `TELEGRAM_BOT_TOKEN` – same bot as telegram-bot app
- `TELEGRAM_GROUP_CHAT_ID` – group chat ID where this notification is sent
