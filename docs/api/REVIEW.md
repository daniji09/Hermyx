# API - Payment documentation

Manages reviews in the platform
<br><br>

## - Get all reviews: `GET /api/reviews/user/:uid`

Gets all reviews that user has received.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | integer | Yes | User identifier. |

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
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

**Workflow:** user's received reviews are always returned with pagination;
both `page` and `limit` are required.
<br>
<br>
<br>

## - Review adventurer: `POST /missions/:mid/adventurers/:adventurerId`

Applicant can review one of their mission's adventurer after they finish

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
| `adventurerId` | integer | Yes | Adventurer user identifier. |

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rating` | integer | Yes | Numeric rating review. |
| `comment` | string | No | Additional comment review. |
<br>

**Responses:**

- `200 OK`: adventurer review successfully.

  ```json
  {
    "review": "<review>"
  }
  ```

- `400 Bad Request`: body or path fields validation error, missing body or path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

  <br>

- `403 Forbidden`: user is unauthorized to do this action: applicant can only review their mission's adventurers.

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

**Workflow:** after basic checks, review is added to the adventurer and they global rating is updated. Since two applicants could review the same adventurer at the same time, an optimistic transaction is needed, so rating is updated correctly. A pessimistic concurrency approach is used so 'rating' column in user table is never inconsistent, and, for UX purposes, in this case is better than an optimistic approach.
<br>
<br>
<br>

## - Review adventurer: `POST /missions/:mid/owner`

Adventurer can review their applicant after finish

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rating` | integer | Yes | Numeric rating review. |
| `comment` | string | No | Additional comment review. |
<br>

**Responses:**

- `200 OK`: adventurer review successfully.

  ```json
  {
    "review": "<review>"
  }
  ```

- `400 Bad Request`: body or path fields validation error, missing body or path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

  <br>

- `403 Forbidden`: user is unauthorized to do this action: applicant can only review their mission's adventurers.

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

**Workflow:** after basic checks, review is added to the applicant and they global rating is updated. Since two adventurers could review the same applicant at the same time, an optimistic transaction is needed, so rating is updated correctly. A pessimistic concurrency approach is used so 'rating' column in user table is never inconsistent, and, for UX purposes, in this case is better than an optimistic approach.
<br>
<br>
<br>
