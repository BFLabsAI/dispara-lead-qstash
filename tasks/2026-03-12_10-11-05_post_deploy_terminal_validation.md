# Post Deploy Terminal Validation

- Timestamp: `2026-03-12_10-11-05`
- User: `<ADMIN_EMAIL>`
- User ID: `09f6653f-61f1-422c-aa1a-be47c1236bf2`
- Base URL: `https://<SUPABASE_PROJECT_REF>.supabase.co`

## Results

### enqueue-campaign
- Status: `200`
- Body:
```json
{"success":false,"stage":"Validation","error":"Invalid or empty \"messages\" array","receivedBody":{"messages":[]}}
```

### process-message
- Status: `401`
- Body:
```
Missing signature
```

### process-message-ai
- Status: `401`
- Body:
```
Missing signature
```

### webhook_messages_dispara_lead_saas
- Status: `200`
- Body:
```
Instance not found
```

### RPC complete_campaign_if_finished
- Status: `200`
- Body:
```json
false
```

### Recent message logs
- Status: `200`
- Body:
```json
[{"id":"1bab10e7-a298-4184-9a55-d946c87e8afe","campaign_id":null,"status":"sent","tenant_id":"d19d516f-4285-4299-8921-88ec30cbaa9e","created_at":"2026-03-10T20:11:54.714461+00:00"}, 
 {"id":"f7d9b7f9-aaeb-425d-b6bf-a5ae889ac1fe","campaign_id":"4ea7690f-858d-48d2-b8c7-9f3b69618d44","status":"sent","tenant_id":"0732f61e-9735-469d-84ea-63e874c9ec3b","created_at":"2026-03-06T15:29:39.116+00:00"}, 
 {"id":"097e5361-ed24-4743-92bf-6f9846182f31","campaign_id":"4ea7690f-858d-48d2-b8c7-9f3b69618d44","status":"sent","tenant_id":"0732f61e-9735-469d-84ea-63e874c9ec3b","created_at":"2026-03-06T15:29:39.116+00:00"}]
```

### Recent campaigns
- Status: `200`
- Body:
```json
[{"id":"4ea7690f-858d-48d2-b8c7-9f3b69618d44","name":"REATIVAÇÃO DE LEAD INAT.","status":"completed","tenant_id":"0732f61e-9735-469d-84ea-63e874c9ec3b","completed_at":"2026-03-06T16:14:22.594+00:00"}, 
 {"id":"8fea8d8c-c2f9-4320-9ab9-443add96478d","name":"REATIVAÇÃO DE LEAD INAT.","status":"completed","tenant_id":"0732f61e-9735-469d-84ea-63e874c9ec3b","completed_at":"2026-03-06T16:05:41.14+00:00"}, 
 {"id":"f4784018-117c-4410-8c89-24df8632ba00","name":"REATIVAÇÃO DE LEAD INAT.","status":"completed","tenant_id":"0732f61e-9735-469d-84ea-63e874c9ec3b","completed_at":"2026-03-06T16:14:25.365+00:00"}]
```
