# API - Missions documentation

Manages missions action on the platform
<br><br>

## - Get all missions: `GET /api/missions`

Gets all missions from Hermyx, being able to query them by title.

**Requires authentication:** Yes

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | No | Title to search. |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no missions). Example with pagination.

  ```json
  {
    "users": ["<missions>"],
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

**Workflow:** application missions are searched by their title, with pagination used by default, although it is optional. The database search is performed using the PostgreSQL `unaccent` extension, which removes accents and diacritics from a text string, transforming them into their base equivalent, so that text strings are compared in a way that is insensitive to accents.
<br>
<br>
<br>

## - Get all opened missions: `GET /api/missions/opened`

Gets all mission opened from Hermyx, being able to query them by title, minimum payment, maximum payment and maximum distance.

**Requires authentication:** Yes

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | No | Title to search. |
| `minPayment` | double | No | Minimum payment accepted. |
| `maxPayment` | double | No | Maximum payment accepted. |
| `maxDistanceKm` | double | No | Maximum distance to user in km accepted. |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no missions). Example with pagination.

  ```json
  {
    "users": ["<missions>"],
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

**Workflow:** application opened missions are searched by their title, with pagination used by default, although it is optional. The database search is performed using the PostgreSQL `unaccent` extension, which removes accents and diacritics from a text string, transforming them into their base equivalent, so that text strings are compared in a way that is insensitive to accents. Includes filters for minimum payment, maximum payment and maximum distance.
<br>
<br>
<br>
