# API - Disputes documentation

Manages users disputes into the platform
<br><br>

## - Get all user's disputes: `GET /api/disputes`

Gets all current user's disputes from Hermyx.

**Requires authentication:** Yes

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no disputes). Example with pagination.

  ```json
  {
    "disputes": ["<disputes>"],
    "pagination": {
      "currentPage": "<currentPage>",
      "totalPages": "<totalPages>",
      "totalItems": "<totalItems>",
      "hasMore": "<hasMore>"
    }
  }
  ```

- `400 Bad Request`: query fields validation error, missing query fields.
  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```
  <br>

**Workflow:** application disputes are always returned with pagination. The
client must provide both `page` and `limit`.
<br>
<br>

## - Get user's disputes unread count: `GET /api/disputes/unread-count`

Gets current user's disputes unread count.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: search done successfully.

  ```json
  {
    "unreadCount": ["<unreadCount>"]
  }
  ```

**Workflow:** gets number of user's unread messages from all of their disputes.
<br>
<br>

## - Get dispute: `GET /api/disputes/:rid`

Gets dispute by its report id

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | integer | Yes | Report identifier. |
<br>

**Responses:**

- `200 OK`: search done successfully.

  ```json
  {
    "dispute": ["<dispute>"]
  }
  ```

- `400 Bad Request`: path fields validation error, missing path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: regular users are unauthorized if they are not in the
  dispute conversation. Administrators can access dispute conversations to
  review and attend them without being participants.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: dispute not found, dispute with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Dispute not found."]
    }
  }
  ```
  <br>

**Workflow:** gets application dispute.
<br>
<br>
