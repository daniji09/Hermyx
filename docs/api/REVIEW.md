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

**Workflow:** after basic checks, review is added to the adventurer and they global rating is updated. Since two applicants could review the same adventurer at the same time, an optimistic transaction is needed, so rating is updated correctly (TODO:).
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

**Workflow:** after basic checks, review is added to the applicant and they global rating is updated. Since two adventurers could review the same applicant at the same time, an optimistic transaction is needed, so rating is updated correctly (TODO:).
<br>
<br>
<br>
