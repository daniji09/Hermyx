# API - Authentication documentation

Manages users authentication into the platform
<br><br>

## - Get all reports: `GET /api/reports`

Gets all reports from Hermyx, being able to query them by type and status and sort them by date.

**Requires authentication:** Yes

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `sortByDate` | string | No | Date sort. |
| `status` | string | No | Report status. |
| `type` | string | No | Report type. |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no reports). Example with pagination.

  ```json
  {
    "reports": ["<reports>"],
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

**Workflow:** application reports are searched being able to query them by type and status and sorting them by date, with pagination used by default.
<br>
<br>

## - Get report by rid: `GET /api/reports/:rid`

Gets the report specified by its identifier, rid.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | integer | Yes | Report identifier. |
<br>

**Responses:**

- `200 OK`: report obtain successfully.

  ```json
  {
    "report": "<report>"
  }
  ```

- `400 Bad Request`: path parameters fields validation error, missing path parameters fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: report not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report not found."]
    }
  }
  ```
  <br>

**Workflow:** application report is searched by its identifier, it retrieves all report information.
<br>
<br>
<br>

## - Report adventurer: `POST /api/reports/adventurer`

Applicant reports an adventurer of their mission

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
| `adventurerId` | integer | Yes | Adventurer user identifier. |
| `message` | string | Yes | Report message. |
<br>

**Responses:**

- `201 OK`: report created successfully.

  ```json
  {
    "report": "<report>"
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

- `403 Forbidden`: user is unauthorized to do this action: cannot report an adventurer from a mission that not belongs to current user.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: report not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report not found."]
    }
  }
  ```
  <br>

**Workflow:** when reporting an adventurer, report is created over that adventurer, but dispute and conversation is also created.
<br>
<br>
<br>

## - Report user: `POST /api/reports/user`

Reporting a user on the application

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | integer | Yes | User identifier. |
| `message` | string | Yes | Report message. |
<br>

**Responses:**

- `201 OK`: report created successfully.

  ```json
  {
    "report": "<report>"
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

- `404 Not Found`: report not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report not found."]
    }
  }
  ```
  <br>

**Workflow:** when reporting a user, report is created over that user.
<br>
<br>
<br>

## - Report mission: `POST /api/reports/mission`

Reporting a mission on the application

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
| `message` | string | Yes | Report message. |
<br>

**Responses:**

- `201 OK`: report created successfully.

  ```json
  {
    "report": "<report>"
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

- `403 Forbidden`: user is unauthorized to do this action: cannot report its own mission.

  ```json
  {
    "errors": {
      "general": ["You can't report your own mission."]
    }
  }
  ```

- `404 Not Found`: report not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report not found."]
    }
  }
  ```
  <br>

**Workflow:** when reporting a mission, report is created over that user.
<br>
<br>
<br>

## - Accept adventurer's work: `POST /api/reports/:rid/accept`

Decision to accept adventurer's work is taken, closing report; used for participation reports

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | integer | Yes | Report identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `reason` | string | Yes | Reason message. |
<br>

**Responses:**

- `200 OK`: report closed successfully.

  ```json
  {}
  ```

- `400 Bad Request`: body or path fields validation error, missing body or path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: only admins can close reports.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: report, mission, vacancy or adventurer not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report/Mission/Vacancy/Adventurer not found."]
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

**Workflow:** when admins are checking participation reports, one possible decision is to accept's the adventurer's work, finishing participation of adventurer in mission, paying them and closing report and its associated conversation. Since there is a payout, same mechanism is used as in the rest of the functions, payment is first made in Stripe outside of the transaction but in a own try so, if it fails, it can be logged and tried later (not implemented); then, database changes are made in a transaction, and, if something fails, it can be also logged to fix the inconsistency.
<br>
<br>
<br>

## - Reject adventurer's work: `POST /api/reports/:rid/reject`

Decision to reject adventurer's work is taken, closing report; used for participation reports

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | integer | Yes | Report identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `reason` | string | Yes | Reason message. |
<br>

**Responses:**

- `200 OK`: report closed successfully.

  ```json
  {}
  ```

- `400 Bad Request`: body or path fields validation error, missing body or path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: only admins can close reports.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: report, mission, vacancy or adventurer not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report/Mission/Vacancy/Adventurer not found."]
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

**Workflow:** when admins are checking participation reports, one possible decision is to reject's the adventurer's work, changing participation to be in progress again and closing report and associated conversation.
<br>
<br>
<br>

## - Reject adventurer's work: `POST /api/reports/:rid/dismiss`

Decision to dismiss report, used for mission, user or adventurer reports

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | integer | Yes | Report identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `reason` | string | Yes | Reason message. |
<br>

**Responses:**

- `200 OK`: report closed successfully.

  ```json
  {}
  ```

- `400 Bad Request`: body or path fields validation error, missing body or path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: only admins can close reports.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: report, mission, vacancy or adventurer not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report/Mission/Vacancy/Adventurer not found."]
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

**Workflow:** when admins are checking user, mission or adventurer reports, they can dismiss the report, doing nothing and finishing that report.
<br>
<br>
<br>
