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
    "mission": "<report>"
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
