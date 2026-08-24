# API - Conversations documentation

Manages users conversations into the platform
<br><br>

## - Get all user's conversations: `GET /api/conversations`

Gets all current user's conversations from Hermyx.

**Requires authentication:** Yes

Administrators cannot list regular conversations. They can access a
conversation by id only when its type is `dispute`, as part of the report
workflow.

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
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

**Workflow:** application conversations are always returned with pagination. The
client must provide both `page` and `limit`, and the response includes the
pagination metadata.
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

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cursor` | integer | No | Message identifier used to fetch the next page. Omit it for the first page. |
| `limit` | integer | Yes | Maximum number of messages to return. |
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

- `403 Forbidden`: user is unauthorized to do this action: regular users must
  belong to the conversation, and administrators can only access dispute
  conversations.

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
    "messages": ["<messages>"],
    "pageInfo": {
      "hasMore": "<hasMore>",
      "nextCursor": "<nextCursor>"
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

- `403 Forbidden`: user is unauthorized to do this action: regular users must
  belong to the conversation, and administrators can only read messages from
  dispute conversations.

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

**Workflow:** conversation messages use cursor pagination. `limit` is always
required; `cursor` is omitted for the first page and then set to the returned
`nextCursor` value.
<br>
<br>

Administrators can preview dispute messages without being inserted as a
participant. This preview is read-only until the administrator sends a message
through the endpoint below.

## - Marks conversation as read: `PATCH /api/conversations/:cid/read`

Marks a conversation as read

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cid` | integer | Yes | Conversation identifier. |
<br>

**Responses:**

- `200 OK`: conversation marked as read successfully.

  ```json
  {
    "unreadCount": 0
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

- `403 Forbidden`: the user cannot access the conversation. An administrator
  can mark a dispute preview as read; if they are not yet a participant, the
  request succeeds without changing a participant row.

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

**Workflow:** marks all conversation new messages as read, so the conversation now has 0 unread messages.
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

**Workflow:** creates a conversation between current user and the one specified via request body. A database transaction is needed to create the conversation and add the participants. Additionally, to avoid creating the same private conversation between to users at the same time, a pessimistic concurrency approach is taken, where both users are read in the same order and locked, dealing this way both with deadlocks and concurrency problems.
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

- `403 Forbidden`: user is unauthorized to do this action. Regular users must
  be active participants; administrators may send messages only to dispute
  conversations.

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

**Workflow:** creates a message conversation and sends it, being message or image. When an administrator sends the first message in a dispute, the backend adds the administrator to that conversation. Images are handled by the `multer` (Azure TODO:)library.
<br>
<br>
