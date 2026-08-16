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

## - Get conversation: `GET /api/conversations/:cid`

Gets conversation by its id

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cid` | integer | Yes | Conversation identifier. |
<br>

**Responses:**

- `200 OK`: search done successfully.

  ```json
  {
    "conversation": {
      "conversation": "<conversation>",
      "participants": "<participants>"
    }
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

- `403 Forbidden`: user is unauthorized to do this action: cannot get conversation if current user is not in it.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: conversation not found, conversation with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Dispute not found."]
    }
  }
  ```
  <br>

**Workflow:** gets application conversation.
<br>
<br>

## - Get conversation: `GET /api/conversations/:cid/messages`

Gets conversation's messages by its id

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cid` | integer | Yes | Conversation identifier. |
<br>

**Responses:**

- `200 OK`: search done successfully.

  ```json
  {
    "messages": "<messages>"
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

- `403 Forbidden`: user is unauthorized to do this action: cannot get conversation's messages if current user is not in it.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: conversation not found, conversation with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Conversation not found."]
    }
  }
  ```
  <br>

**Workflow:** gets application conversation's messages (TODO: paginación especial).
<br>
<br>

## - Create private conversation: `POST /api/conversations/private`

Creates private conversation between two users

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `otherUserId` | integer | Yes | Other user that current is initiating a conversation with. |
<br>

**Responses:**

- `201 Created`: conversation created successfully.

  ```json
  {
    "conversation": "<conversation>"
  }
  ```

- `400 Bad Request`: body fields validation error, missing body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: conversation or user not found.

  ```json
  {
    "errors": {
      "general": ["Conversation/User not found."]
    }
  }
  ```

- `409 Conflict`: logic error.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** creates a conversation between current user and the one specified via request body. A database transaction is needed to create the conversation and add the participants.
<br>
<br>

## - Send message: `POST /api/conversations/:cid/message`

Sends a message to the conversation, it can be an image

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cid` | integer | Yes | Conversation identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `message` | string | No | Written message. |
<br>

**File parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `photo` | file | No | Image message. |
<br>

**Responses:**

- `201 Created`: message created successfully.

  ```json
  {
    "message": "<message>"
  }
  ```

- `400 Bad Request`: body fields validation error, missing body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot send messages if current user is not in the conversation.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: conversation or user not found.

  ```json
  {
    "errors": {
      "general": ["Conversation/User not found."]
    }
  }
  ```

- `409 Conflict`: logic error.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** creates a message conversation and sends it, being message or image. Images are handled by the `multer` (Azure TODO:)library.
<br>
<br>
