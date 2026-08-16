# API - Conversations documentation

Manages users conversations into the platform
<br><br>

## - Get all user's disputes: `GET /api/conversations`

Gets all current user's conversations from Hermyx.

**Requires authentication:** Yes

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no conversations). Example with pagination.

  ```json
  {
    "conversations": ["<conversations>"],
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

**Workflow:** application conversations with pagination used by default. (TODO: pagination)
<br>
<br>

## - Get user's conversations unread count: `GET /api/conversations/unread-count`

Gets current user's conversations unread count.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: search done successfully.
  ```json
  {
    "unreadCount": ["<unreadCount>"]
  }
  ```

**Workflow:** gets number of user's unread messages from all of their conversations.
<br>
<br>
