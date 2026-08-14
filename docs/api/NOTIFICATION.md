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

## - Marks current user's unseen notifications as seen: `GET /api/notifications/seen`

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
