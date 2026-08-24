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
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no users). Example with pagination.

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

**Workflow:** application users are searched by their username with mandatory
pagination. The database search is performed using the PostgreSQL `unaccent`
extension, which removes accents and diacritics from a text string, transforming
them into their base equivalent, so that text strings are compared in a way
that is insensitive to accents.
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

## - Gets current user information: `GET /api/users/me/profile`

Searches current user profile.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: search done successfully and current user information retrieved.

  ```json
  {
    "uid": "<user_uid>",
    "username": "<user_username>",
    "... user profile information"
  }
  ```

  <br>

**Workflow:** it works practically the same way as `/api/users/me`, but it needs to extract two pieces of data differently than that endpoint: the location, done thanks to the `postgis` extension of PostgreSQL, and the bank account to receive money, thanks to the function that Stripe provides to check this data.
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
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
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

**Workflow:** user missions are searched by their uid, being the joined or
published ones which is decided by the type query param. Both `page` and
`limit` are required.
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
      "... user's public information"
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
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
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

**Workflow:** user missions are searched by their uid, being the joined or
published ones which is decided by the type query param. Both `page` and
`limit` are required. This endpoint exists due to the different information
needed from the missions, compared to the endpoint that retrieves the missions
of a user by their username (used for the current user).
<br>
<br>
<br>

## - Update user's public information: `PATCH /api/users/me/profile`

Updates user's public information that is shown in profile.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | Yes | Username. |
| `name` | string | No | Users's name |
| `surnames` | string | No | User's surnames. |
| `description` | string | No | User's description |
| `latitude` | integer | No | User's latitude location. |
| `longitude` | integer | No | User's longitude location. |
<br>

**Responses:**

- `200 OK`: user public information has been correctly updated.

  ```json
  {
    "uid": "<user_uid>",
    "username": "<username>",
    "... user's public information"
  }
  ```

- `400 Bad Request`: query fields validation error, missing query fields or logic error: username introduced already exists.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** frontend sends the form data entered by the user, and the backend simply updates it, verifying that the newly entered user is not already an existing one. It's worth noting that, despite being a classic database transaction workflow, it's not used in this case. If the same user updates their profile simultaneously from two different devices, the newer version overwriting the older one is a more expected outcome than printing an error, and doing so would also increase complexity and time unnecessarily. On another note, it is not needed to check whether latitude and longitude are sent together, because `postgis` extension already checks that automatically.
<br>
<br>
<br>

## - Update user's avatar: `PATCH /api/users/me/avatar`

Updates user's avatar.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `avatar` | file | Yes | New avatar. |
_> Note: only one `avatar` file is treated._
<br>

**Responses:**

- `200 OK`: user's avatar has been correctly updated.

  ```json
  {
    "avatar": "/url/of/new_avatar"
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

**Workflow:** to process the image, Multer library is used, which allows to configure the number of files per endpoint, their size, and the expected format of each file. Regarding image storage, for development purposes, images are saved locally in the /public/uploads/avatars folder, while in production, Azure Blob is used (TODO:). It's worth noting that this is another backend which does not use any database transactions, as the industry standard prioritizes UX. This means that the image is first saved to storage, then to the database, and finally, the previous avatar image is deleted if it exists. Therefore, in the worst-case scenario, only a dirty image remains stored (TODO:).
<br>
<br>
<br>

## - Update user's email: `PATCH /api/users/me/email`

Updates user's email.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | string | Yes | New email. |
_> Note: new `email` has to be unique._
<br>

**Responses:**

- `200 OK`: user's email has been correctly updated.

  ```json
  {
    "email": "<user_new_email>"
  }
  ```

- `400 Bad Request`: fields validation error, missing fields or logic error: e-mail already in use.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** to change the email address, the change is first made in Firebase, and if successful, it is then propagated to the Hermyx database. Therefore, a compensating transaction is necessary, if the process fails when the change has been made in Firebase but not in Hermyx, the email address must be changed back to the original in Firebase. It's also worth noting that this endpoint previously included the logic for adding email authentication, as it was very similar, but ultimately, the decision was made to adopt a one-to-one endpoint-per-functionality approach.
<br>
<br>
<br>

## - Update user's email: `PATCH /api/users/me/configuration`

Updates user's configuration.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `configuration` | JSON | Yes | New configuration parameters. |
<br>

**Responses:**

- `200 OK`: user's configuration has been correctly updated.

  ```json
  {
    "configuration": "<user_new_configuration>"
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

**Workflow:** to change user's configuration, PostgreSQL's JSONB type is used, as it not only allows to store JSON configurations easily, but also does it very efficiently.
<br>
<br>
<br>

## - Add email authentication: `POST /api/users/me/credentials`

Adds an email authentication to a user who has authenticated with Google.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | string | Yes | New email. |
| `password` | string | Yes | New password. |
| `confirmPassword` | string | Yes | Password confirmation. |
_> Note: new `email` has to be unique and `password` and `confirmPassword` must match._
<br>

**Responses:**

- `200 OK`: user has added an email authentication successfully.

  ```json
  {
    "email": "<user_new_email>"
  }
  ```

- `400 Bad Request`: fields validation error, missing fields or logic error: e-mail already in use.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** to add an email authentication, the change is first made in Firebase, and if successful, it is then propagated to the Hermyx database. Therefore, a compensating transaction is necessary, if the process fails when the change has been made in Firebase but not in Hermyx, the new authentication must be deleted in Firebase. It's also worth noting that this endpoint previously was included in the previous endpoint, but the compensatory transaction needed to be different.
<br>
<br>
<br>

## - Delete current user's account: `POST /api/users/:uid/ban`

Bans a user.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | int | Yes | User identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | int | Yes | Report identifier. |
| `reason` | string | Yes | Report decision reason. |
<br>

**Responses:**

- `200 OK`: user banned successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields or logic error.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: search fails.

  ```json
  {
    "errors": {
      "general": ["User not found."]
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

**Workflow:** banning a user can be done if subject doesn't have any other disputes active. This will reject it account on `Stripe`, meaning not only access will be denied to the account but that Stripe is aware of that user as a suspicious one and won't let him enter in any other account Stripe. `Firebase` also bans the account and its avatar is deleted. Then, all their conversations are closed, and all missions are cleared: deleting or cancelling the ones that they own; and kicking him out, with refund to applicant if needed, from the ones that they are an adventurer. It is also marked as banned in database. Various transactions are needed and payment mechanism where intent is marked and failures are catch for logging and retrying them is used (logs not implemented). Since this operation can imply a money transaction and implies a report, the following mechanism is used: report is locked by updating it to 'answered' state, then `Stripe` transaction is done, and, after that, all operations left are done inside a database transaction. If Stripe transaction fails, report block is reverted, otherwise it will still be standing even if anything else fails, so a database inconsistency is expected.
<br>
<br>

## - Delete current user's account: `DELETE /api/users/me`

Deletes current user's account.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: user deleted successfully.

  ```json
  {}
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

**Workflow:** deleting an account is quite a complex function. In first place, for a user to being able to do it, they have to don't have any active missions or reports. Then, all external objects are deleted, first the avatar if any, then the Stripe account if any and lastly the Firebase account. Finally, and inside of a transaction, user is removed from conversations (setting their left_at), their private conversations are closed so the other user knows they don't exist anymore, their received notifications are deleted because those are useless and is some space saved and, lastly, user is anonymize, there is no hard delete. (TODO: comprobar que con el RGPD todo bien).
<br>
<br>
