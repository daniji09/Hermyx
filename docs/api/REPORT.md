# API - Authentication documentation

Manages users authentication into the platform
<br><br>

## - Get all missions: `GET /api/reports`

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
