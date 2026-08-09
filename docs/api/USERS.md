# API - Users documentation

Manages users action on the platform
<br><br>

## - Search users by username: `GET /api/users/search`

Searches Hermyx users by username partial matches.

**Requires authentication:** Yes

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | Yes | Username to search. |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination.._
<br>

**Responses:**

- `200 OK`: search done successfully (could not retrieve any user). Example with pagination.

  ```json
  {
    "users": ["<users>"],
    "pagination": {
      "currentPage": "<currentPage>",
      "totalPages": "<totalPages>",
      "totalItems": "<totalItems>",
      "hasMore": "<hasMore>"
    }
  }
  ```

- `400 Bad Request`: fields validation error, missing fields.
  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```
  <br>

**Workflow:** application users are searched by their username, with pagination used by default, although it is optional. The database search is performed using the PostgreSQL `unaccent` extension, which removes accents and diacritics from a text string, transforming them into their base equivalent, so that text strings are compared in a way that is insensitive to accents.
<br>
<br>
<br>

## - Gets current user information: `GET /api/users/me`

Searches current user information.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: search done successfully (could not retrieve any user). Example with pagination.

  ```json
  {
    "uid": "<user_uid>",
    "username": "<user_username>",
    "... user information"
  }
  ```

  <br>

**Workflow:** initially, the system was programmed so that the Firebase UID was sent from the frontend, and the backend would search for that UID to retrieve the data and return it to the frontend. This didn't make much sense and was also dangerous: any identified user could send requests with random Firebase UIDs and obtain the personal information of any user of the application. Now, frontend just calls this endpoint, which returns the current user, that is always stored in the authentication middleware. This middleware obtains the Firebase UID from the token sent securely from the frontend.
<br>
<br>
<br>
