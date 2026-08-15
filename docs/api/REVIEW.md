# API - Payment documentation

Manages reviews in the platform
<br><br>

## - Get all missions: `GET /api/reviews/user/:uid`

Gets all reviews that user has received.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | integer | Yes | User identifier. |

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no reviews). Example with pagination.

  ```json
  {
    "missions": ["<reviews>"],
    "pagination": {
      "currentPage": "<currentPage>",
      "totalPages": "<totalPages>",
      "totalItems": "<totalItems>",
      "hasMore": "<hasMore>"
    }
  }
  ```

- `400 Bad Request`: query or path fields validation error, missing query or path fields.
  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```
  <br>

**Workflow:** user's received reviews are searched, with pagination used by default, although it is optional.
<br>
<br>
<br>
