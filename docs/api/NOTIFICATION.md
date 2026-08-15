# API - Notifications documentation

Manages notifications sent in the platform.
<br><br>

## - Gets current user's notifications: `GET /api/notifications/me`

Gets all notifications that the current user has ever received.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: search done successfully (could retrieve no notifications).

  ```json
  {
    "notifications": ["<notifications>"]
  }
  ```

**Workflow:** current user's notifications are searched and returned TODO: pagination?.
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

## - Marks current user's unseen notifications as seen: `POST /api/notifications/:nid/respond`

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
First type are mission join notifications
Second type are mission participation submits, which, after basic checks, can be: accepted, finishing that participation and sending the money to the adventurer; rejected, sending a follow-up notification to the adventurer so they can respond to the rejection; or disputed, only if the same participation had been reviewed before, which opens a dispute for that participation, that admins will resolve. Since there is a payment, it works as same as the rest of the payments: first, intermediate status is set ('accepted' in this case), then, outside of a database transaction, Stripe payment is made and, finally, in a database transaction, database updates are made. The Stripe payment is done inside an own try-catch, so, if it fails, is saved in a log for its future retry (not implemented); in a similar way, if Stripe payment is done but database updates fail, this state is saved in a log for its future fix. If this last case occurs and user tries to accept participation again, Stripe won't pay again thanks to the idempotency key.
Third type are mission participation rejections, which, after basic checks, can be: accepted, turning the participation into progress again; or disputed, which opens a dispute for that participation, that admins will resolve.
<br>
<br>
<br>
