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
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could not retrieve any users). Example with pagination.

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

- `400 Bad Request`: query fields validation error, missing query fields.
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

- `200 OK`: search done successfully and current user information retrieved.

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

## - Get missions from user: `GET /api/users/:uid/missions`

Searches missions from the user specified, either joined or published.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | integer | Yes | Uid of user. |
<br>

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | Yes | Type of mission to search: joined or published. |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could not retrieve any missions). Example with pagination.

  ```json
  {
    "missions": ["<missions>"],
    "pagination": {
      "currentPage": "<currentPage>",
      "totalPages": "<totalPages>",
      "totalItems": "<totalItems>",
      "hasMore": "<hasMore>"
    }
  }
  ```

- `400 Bad Request`: param or query fields validation error, missing param or query fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** user missions are searched by their uid, being the joined or published ones which is decided by the type query para. Pagination is used by default, although it is optional.
<br>
<br>
<br>

## - Get user's public profile: `GET /api/users/:username/profile`

Gets user information to show it on their public profile.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | Yes | Username. |
<br>

**Responses:**

- `200 OK`: search done successfully, finding user with `username` provided. Missions visible provides user's configuration allowing to show their missions to others or not.

  ```json
  {
    "user": {
      "uid": "<user_uid>",
      "username": "<user_username>",
      "... user public information"
    },
    "missionsVisible": "<true/false>"
  }
  ```

- `400 Bad Request`: param fields validation error, missing param fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: search fails, not finding the user because that username does not exist.

  ```json
  {
    "errors": {
      "general": ["Username x not found."]
    }
  }
  ```

  <br>

**Workflow:** an exact match is performed on the username passed as a parameter to display its public information, as well as any settings chosen by that user, which can affect the information shown, such as whether or not to reveal their missions to others. It's worth noting that, thanks to this endpoint, the way usernames were restricted was changed. Previously, users were allowed to have the same username as another user if the capitalization didn't match (for example, "username" and "Username" were different and could coexist), which prevented this endpoint from functioning correctly in a browser, but, more importantly, because it made phishing easier.
<br>
<br>
<br>

## - Get missions from public profile: `GET /api/users/:username/profile/missions`

Searches missions from the user specified by username, either joined or published, which will show in their profile.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | integer | Yes | Uid of user. |
<br>

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | Yes | Type of mission to search: joined or published. |
| `page` | integer | No* | Page number for pagination. |
| `limit` | integer | No* | Maximum number of results per page. |
_> Note: `page` and `limit` are optional, but if one is provided, both must be sent together, for a correct pagination._
<br>

**Responses:**

- `200 OK`: search done successfully (could not retrieve any missions). Example with pagination.

  ```json
  {
    "missions": ["<missions>"],
    "pagination": {
      "currentPage": "<currentPage>",
      "totalPages": "<totalPages>",
      "totalItems": "<totalItems>",
      "hasMore": "<hasMore>"
    }
  }
  ```

- `400 Bad Request`: param or query fields validation error, missing param or query fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** user missions are searched by their uid, being the joined or published ones which is decided by the type query para. Pagination is used by default, although it is optional. This endpoints exists due to the different information needed from the missions, compared to the endpoint that retrieves the missions of a user by their username (used for the current user).
<br>
<br>
<br>
