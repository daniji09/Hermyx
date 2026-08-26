# API - Reports documentation

Manages users reports into the platform
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
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
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

## - Report collaborator: `POST /api/reports/adventurer`

Applicant reports an collaborator of their service

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
| `adventurerId` | integer | Yes | Collaborator user identifier. |
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

- `403 Forbidden`: user is unauthorized to do this action: cannot report an collaborator from a service that not belongs to current user.

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

**Workflow:** when reporting an collaborator, report is created over that collaborator, but dispute and conversation is also created.
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

## - Report service: `POST /api/reports/mission`

Reporting a service on the application

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
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

- `403 Forbidden`: user is unauthorized to do this action: cannot report its own service.

  ```json
  {
    "errors": {
      "general": ["You can't report your own service."]
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

**Workflow:** when reporting a service, report is created over that user.
<br>
<br>
<br>

## - Accept collaborator's work: `POST /api/reports/:rid/accept`

Decision to accept collaborator's work is taken, closing report; used for participation reports

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

- `404 Not Found`: report, service, vacancy or collaborator not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report/Service/Vacancy/Collaborator not found."]
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

**Workflow:** when admins are checking participation reports, one possible decision is to accept's the collaborator's work, finishing participation of collaborator in service, paying them and closing report and its associated conversation. Since there is a payout, same mechanism is used as in the rest of the functions, payment is first made in Stripe outside of the transaction but in a own try so, if it fails, it can be logged and tried later (not implemented); then, database changes are made in a transaction, and, if something fails, it can be also logged to fix the inconsistency. Since this operation implies a money transaction and implies a report, the following mechanism is used: report is locked by updating it to 'answered' state, then `Stripe` transaction is done, and, after that, all operations left are done inside a database transaction. If Stripe transaction fails, report block is reverted, otherwise it will still be standing even if anything else fails, so a database inconsistency is expected.
<br>
<br>
<br>

## - Reject collaborator's work: `POST /api/reports/:rid/reject`

Decision to reject collaborator's work is taken, closing report; used for participation reports

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

- `404 Not Found`: report, service, vacancy or collaborator not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report/Service/Vacancy/Collaborator not found."]
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

**Workflow:** when admins are checking participation reports, one possible decision is to reject's the collaborator's work, changing participation to be in progress again and closing report and associated conversation. Report locked mechanism is used as a optimistic concurrency approach, changing status to 'answered' at the first moment of the transaction so any other admin is unable to change it at the same time.
<br>
<br>
<br>

## - Reject collaborator's work: `POST /api/reports/:rid/dismiss`

Decision to dismiss report, used for service, user or collaborator reports

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

- `404 Not Found`: report, service, vacancy or collaborator not found, report with that rid does not exist.
  ```json
  {
    "errors": {
      "general": ["Report/Service/Vacancy/Collaborator not found."]
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

**Workflow:** when admins are checking user, service or collaborator reports, they can dismiss the report, doing nothing and finishing that report. Report locked mechanism is used as a optimistic concurrency approach, changing status to 'answered' at the first moment of the transaction so any other admin is unable to change it at the same time.
<br>
<br>
<br>
