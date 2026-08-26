# API - Reviews documentation

Manages reviews in the platform
<br><br>

## - Get all reviews: `GET /api/reviews/users/:uid`

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
    "reviews": ["<reviews>"],
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

## - Review collaborator: `POST /api/reviews/missions/:mid/adventurers/:adventurerId`

Applicant can review one of their service's collaborator after they finish

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
| `adventurerId` | integer | Yes | Collaborator user identifier. |

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rating` | integer | Yes | Numeric rating review. |
| `comment` | string | No | Additional comment review. |
<br>

**Responses:**

- `200 OK`: collaborator review successfully.

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

- `403 Forbidden`: user is unauthorized to do this action: applicant can only review their service's collaborators.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: service, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy/User not found."]
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

**Workflow:** after basic checks, review is added to the collaborator and they global rating is updated. Since two applicants could review the same collaborator at the same time, an optimistic transaction is needed, so rating is updated correctly. A pessimistic concurrency approach is used so 'rating' column in user table is never inconsistent, and, for UX purposes, in this case is better than an optimistic approach.
<br>
<br>
<br>

## - Review service applicant: `POST /api/reviews/missions/:mid/owner`

Collaborator can review their applicant after finish

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rating` | integer | Yes | Numeric rating review. |
| `comment` | string | No | Additional comment review. |
<br>

**Responses:**

- `200 OK`: collaborator review successfully.

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

- `403 Forbidden`: user is unauthorized to do this action: applicant can only review their service's collaborators.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: service, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy/User not found."]
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

**Workflow:** after basic checks, review is added to the applicant and they global rating is updated. Since two collaborators could review the same applicant at the same time, an optimistic transaction is needed, so rating is updated correctly. A pessimistic concurrency approach is used so 'rating' column in user table is never inconsistent, and, for UX purposes, in this case is better than an optimistic approach.
<br>
<br>
<br>
