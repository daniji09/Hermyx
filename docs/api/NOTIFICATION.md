# API - Notifications documentation

Manages notifications sent in the platform.
<br><br>

## - Gets current user's notifications: `GET /api/notifications/me`

Gets all notifications that the current user has ever received.

**Requires authentication:** Yes

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._

**Responses:**

- `200 OK`: search done successfully (could retrieve no notifications).

  ```json
  {
    "notifications": ["<notifications>"],
    "totalUnseen": "<totalUnseen>",
    "pagination": {
      "currentPage": "<currentPage>",
      "totalPages": "<totalPages>",
      "totalItems": "<totalItems>",
      "hasMore": "<hasMore>"
    }
  }
  ```

**Workflow:** current user's notifications are always returned with
pagination. Both `page` and `limit` are required, and the response includes
the pagination metadata and the total number of unseen notifications.
<br>
<br>
<br>

## - Marks current user's unseen notifications as seen: `POST /api/notifications/seen`

Marks all notifications that the current user hadn't seen as seen.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: search done successfully (could retrieve no notifications).

  ```json
  {
    "notifications": ["<notifications_marked_as_seen>"]
  }
  ```

**Workflow:** current user's unseen notifications are searched and updated to seen status. This is used when the user access the all notifications page.
<br>
<br>
<br>

## - Marks notification as seen: `POST /api/notifications/:nid/seen`

Marks all notifications that the current user hadn't seen as seen.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `nid` | integer | Yes | Notification identifier. |

**Responses:**

- `200 OK`: search done successfully (could retrieve no notifications).

  ```json
  {
    "notification": ["<notification_marked_as_seen>"]
  }
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot respond a notification which they have not received.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: notification not found.

  ```json
  {
    "errors": {
      "general": ["Notification not found."]
    }
  }
  ```

**Workflow:** this endpoint is fairly easy: searches notification, checks if actually belongs to current user and marks it as seen.
<br>
<br>
<br>

## - Respond to notification: `POST /api/notifications/:nid/respond`

Responds to a notification which type is actionable.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `nid` | integer | Yes | Notification identifier. |

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `response` | string | Yes | Response option chosen. |
| `message` | string | No | Response message. |

**Responses:**

- `200 OK`: search done successfully (could retrieve no notifications).

  ```json
  {
    "result": ["<result_message>"]
  }
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot respond a notification which they have not received, cannot respond a notification for a mission they not own.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: mission, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy/User not found."]
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

**Workflow:** this endpoint is quite complex due to the different type of notifications that exists on the platform.
First type are mission join notifications, been slightly different for invitations and requests. Either way, after basic checks, the join notification can be accepted, entering the mission, or rejected. This is the classic example of pessimistic concurrency use, so, it's used.
Second type are mission participation submits, which, after basic checks, can be: accepted, finishing that participation and sending the money to the adventurer; rejected, sending a follow-up notification to the adventurer so they can respond to the rejection; or disputed, only if the same participation had been reviewed before, which opens a dispute for that participation, that admins will resolve. Since there is a payment, it works as same as the rest of the payments: first, intermediate status is set ('accepted' in this case), then, outside of a database transaction, `Stripe` payment is made and, finally, in a database transaction, database updates are made. The `Stripe` payment is done inside an own try-catch, so, if it fails, is saved in a log for its future retry (not implemented); in a similar way, if `Stripe` payment is done but database updates fail, this state is saved in a log for its future fix. If this last case occurs and user tries to accept participation again, `Stripe` won't pay again thanks to the idempotency key. Additionally, optimistic concurrency in all three options is implemented via participation status.
Third type are mission participation rejections, which, after basic checks, can be: accepted, turning the participation into progress again; or disputed, which opens a dispute for that participation, that admins will resolve. Optimistic concurrency approach is also used thanks to participation status.
Fourth type are monetary reward editions, which, after basic checks, can be: rejected, which does nothing; or accepted, which can create refunds or leave the participation on 'pending payment' status. The first case needs a refund via `Stripe`, so same mechanism as payouts is made, but instead of creating a new payment, successful payments are completely or partially refunded, using a intermediate state called 'partially_refunded'. To decide this, all vacancy payments are collected and ordered by date, then it returns the maximum possible amount of each payment until the entire difference in the new offer made is returned.
<br>
<br>
<br>
