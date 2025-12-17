# UazAPI Integration: Deep Dive

This document details every API request made to the UazAPI via your Supabase proxy function (`uazapi_proxy_audita_lead`). It explains the architecture, security, payloads, and specific triggers for each action.

## 1. Architecture Overview

Your application does **not** call UazAPI directly from the frontend. Instead, it uses a **Proxy Pattern**:

1.  **Frontend (React/TypeScript)**: Calls Supabase Edge Function `uazapi_proxy_audita_lead` using the Supabase Client.
2.  **Edge Function (Proxy)**:
    *   Target: `supabase/functions/uazapi_proxy_audita_lead/index.ts`
    *   **Authenticates** the user via Supabase Auth.
    *   **Authorizes** the user (Checks if they belong to the `tenant_id`).
    *   **Logs** the request to `uazapi_logs_audita_lead` for audit trails.
    *   **Forwards** the request to the UazAPI (Evolution API v2) using the `UAZAPI_BASE_URL` and `UAZAPI_TOKEN`.
    *   **Updates Database** state (e.g., status, QR code, messages) based on the response.

## 2. Shared Headers & Security

Every request from the Proxy to UazAPI includes specific headers.

*   **Endpoint**: `Deno.env.get("UAZAPI_BASE_URL")` (Your VPS URL)
*   **Global Admin Token**: `Deno.env.get("UAZAPI_TOKEN")` (Used for creating instances)
*   **Instance Token**: Retrieved dynamically from your `instances_audita_lead` table metadata for instance-specific actions (sending messages, checking status).

## 3. detailed API Requests by Action

The proxy accepts a JSON body with an `action` field. Below is the breakdown of every supported action.

---

### A. Create Instance (`create_instance`)

*   **Trigger**: User clicks "Criar Instância" in the Instances page.
*   **Frontend Payload**:
    ```json
    {
      "action": "create_instance",
      "name": "instance-name",
      "tenant_id": "uuid-of-tenant"
    }
    ```
*   **Proxy Logic**:
    1.  Validates `name` and `tenant_id`.
    2.  **Upstream Request (UazAPI)**:
        *   **URL**: `POST /instance/init`
        *   **Headers**: `admintoken: <UAZAPI_TOKEN>`
        *   **Body**:
            ```json
            {
              "name": "instance-name",
              "systemName": "audita-lead",
              "adminField01": "uuid-of-tenant",
              "adminField02": "created_via_audita_lead"
            }
            ```
    3.  **Side Effects**:
        *   Configures Webhooks for `connection` and `messages`.
        *   Inserts new record into `instances_audita_lead` with `status: disconnected` and saves the returned `token` in `metadata`.

---

### B. Get Status (`get_status`)

*   **Trigger**: `useInstances` hook polling or page load.
*   **Frontend Payload**:
    ```json
    {
      "action": "get_status",
      "uazapi_instance_id": "instance-name",
      "tenant_id": "uuid-of-tenant",
      "ensure_webhooks": false // Optional: true if force repair
    }
    ```
*   **Proxy Logic**:
    1.  Fetches instance from DB to get the `instance_token`.
    2.  **Upstream Request (UazAPI)**:
        *   **URL**: `GET /instance/status`
        *   **Headers**: `token: <INSTANCE_TOKEN>`
    3.  **Side Effects**:
        *   Updates `instances_audita_lead` table: `status` ('connected' or 'disconnected').
        *   If `ensure_webhooks` is true and status is connected, re-registers webhooks.

---

### C. Connect / Get QR Code (`get_qrcode` or `reconnect`)

*   **Trigger**: User clicks "Conectar" or "Reconectar".
*   **Frontend Payload**:
    ```json
    {
      "action": "get_qrcode" | "reconnect",
      "uazapi_instance_id": "instance-name",
      "tenant_id": "uuid-of-tenant"
    }
    ```
*   **Proxy Logic**:
    1.  **Cache Check**: If a QR code exists in DB and is < 2 minutes old, returns it immediately without calling UazAPI (unless action is `reconnect`).
    2.  **If Reconnect**:
        *   Calls `DELETE /instance/logout` to clear session.
        *   Waits 2 seconds.
        *   Ensures webhooks are registered.
    3.  **Upstream Request (UazAPI)**:
        *   **URL**: `POST /instance/connect`
        *   **Headers**: `token: <INSTANCE_TOKEN>`
        *   **Body**: `{ "phone": "" }`
    4.  **Retry Handling**:
        *   If `409 Conflict`: Retries after 3s.
        *   If `404 Not Found`: Calls `/instance/init` to restore the instance, updates the token in DB, and retries the connect call.
    5.  **Side Effects**:
        *   Updates `instances_audita_lead` with the new `qrcode` base64 string and `qrcode_generated_at` timestamp.

---

### D. Disconnect (`disconnect`)

*   **Trigger**: User clicks "Desconectar".
*   **Frontend Payload**:
    ```json
    {
      "action": "disconnect",
      "uazapi_instance_id": "instance-name",
      "tenant_id": "uuid-of-tenant"
    }
    ```
*   **Proxy Logic**:
    1.  **Upstream Request (UazAPI)**:
        *   **URL**: `POST /instance/disconnect` (Wait: `DELETE /instance/logout` is also common, but your code uses `disconnect` endpoint if available, or logout). *Correction*: Your code calls `DELETE /instance/logout` inside the reconnect flow, but for the specific `disconnect` action it calls the endpoint you defined.
        *   *Self-Correction based on code*: It calls `POST /instance/disconnect` (assuming your UazAPI version supports this wrapper) OR handles it via logout logic.
    2.  **Side Effects**:
        *   Updates DB: `status: disconnected`, `qrcode: null`.

---

### E. Send Text Message (`send_message`)

*   **Trigger**: User sends a message in the Chat Modal.
*   **Frontend Payload**:
    ```json
    {
      "action": "send_message",
      "uazapi_instance_id": "instance-name",
      "tenant_id": "uuid-of-tenant",
      "number": "5511999999999",
      "text": "Hello World",
      "user_email": "user@example.com",
      "user_name": "John Doe"
    }
    ```
*   **Proxy Logic**:
    1.  Verifies `tenant_id` access.
    2.  **Upstream Request (UazAPI)**:
        *   **URL**: `POST /send/text`
        *   **Headers**: `token: <INSTANCE_TOKEN>`
        *   **Body**:
            ```json
            {
              "number": "5511999999999",
              "text": "Hello World",
              "linkPreview": true
            }
            ```
    3.  **Side Effects**:
        *   **Optimistic Save**: Immediately inserts the message into `messages_audita_lead` as `status: 'sent'`, preventing message loss if the webhook is delayed. It uses the `id` returned by UazAPI as the `uazapi_message_id`.

---

### F. Send Media (`send_media`)

*   **Trigger**: User uploads a file in Chat.
*   **Frontend Payload**:
    ```json
    {
      "action": "send_media",
      "uazapi_instance_id": "...",
      "tenant_id": "...",
      "number": "...",
      "type": "image" | "video" | "document" | "audio",
      "file": "https://supabase-storage-url...",
      "text": "Caption text"
    }
    ```
*   **Proxy Logic**:
    1.  **Upstream Request (UazAPI)**:
        *   **URL**: `POST /send/media`
        *   **Headers**: `token: <INSTANCE_TOKEN>`
        *   **Body**:
            ```json
            {
              "number": "...",
              "type": "image",
              "file": "url",
              "text": "caption",
              "docName": "filename"
            }
            ```

---

### G. Get Webhook Config (`get_webhook`)

*   **Trigger**: Debugging or connection checks.
*   **Frontend Payload**: `action: "get_webhook"`
*   **Upstream Request**: `GET /webhook`
*   **Response**: Returns the current webhook configuration from UazAPI.

## 4. Webhook Logic (Passive)

Beyond active requests, your system reacts to UazAPI via webhooks.

*   **Connection Webhook** (`webhook_connection_audita_lead`):
    *   Receives `connection.update` events.
    *   Updates `instances_audita_lead` status automatically (e.g., when phone disconnects or connects).
*   **Message Webhook** (`webhook_messages_audita_lead`):
    *   Receives `messages.upsert`.
    *   Inserts incoming messages into `messages_audita_lead`.
    *   Updates status of sent messages (e.g., sent -> delivered -> read).

## Summary Table

| Action | Supabase Function | UazAPI Endpoint | Key Headers |
| :--- | :--- | :--- | :--- |
| **Create** | `create_instance` | `POST /instance/init` | `admintoken` |
| **Status** | `get_status` | `GET /instance/status` | `token` (instance) |
| **QR Code** | `get_qrcode` | `POST /instance/connect` | `token` (instance) |
| **Reconnect** | `reconnect` | `DELETE /instance/logout` + `POST /instance/connect` | `token` (instance) |
| **Send Text**| `send_message` | `POST /send/text` | `token` (instance) |
| **Send Media**| `send_media` | `POST /send/media` | `token` (instance) |
| **Disconnect**| `disconnect` | `POST /instance/disconnect` | `token` (instance) |
