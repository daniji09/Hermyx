# API - Authentication documentation

Manages users authentication into the platform
<br><br>

## - Signup: `POST /api/auth/signup`

Signs up a user in Hermyx and Firebase, returning that user information.

**Requires authentication:** No

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | Yes | Username. |
| `email` | string | Yes | E-mail. |
| `password` | string | Yes | Password. |
| `confirmPassword` | string | Yes | Repeated password. |
_> Note: `password` and `confirmPassword` must match._
<br>

**Responses:**

- `201 Created`: successful signup.

  ```json
  {
    "user": {"<user_data>"}
  }
  ```

- `400 Bad Request`: fields validation error, missing fields, logic conflicts as: username or email already exists.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
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

**Workflow:** the sign up process takes place entirely on the backend, handling data received from the frontend. After verifying that the username and email address do not already exist in the Hermyx database, the system checks that the email is not present in Firebase either. Subsequently, the user is created first in Firebase and then in the Hermyx database, correctly storing the user's Firebase UID. This approach eliminates the need for database transactions, though compensatory transactions in Firebase may be used. Additionally, there are two unique indexes in database, one for username and another for the email, that allow to no use transactions for concurrency purposes, since one of any two users that want to sign up using the same username/email at the same will collide with the indexes and won't be able to sign up.
<br>
<br>
<br>

## - Login: `POST /api/auth/login`

Logs in user in Hermyx and returns Firebase token to complete the process.

**Requires authentication:** No

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | No* | Username. |
| `email` | string | No* | E-mail. |
| `password` | string | Yes | Password. |
_> Note: At least one of `username` or `email` must be sent._
<br>

**Responses:**

- `200 OK`: successful login.

  ```json
  {
    "token": "<token>"
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
- `401 Unauthorized`: invalid credentials.
  ```json
  {
    "errors": {
      "general": ["Invalid credentials"]
    }
  }
  ```
    <br>

**Workflow:** previously, the login process was implemented in a way that when a user entered their username, the frontend would query the backend API for that user's email address. While this approach was simpler, since logging in via the Firebase Client SDK is lightweight, it exposed a serious security risk: anyone could enter random usernames and retrieve the corresponding personal email addresses. Consequently, the workflow has been changed, the user lookup logic is now delegated to this endpoint, which verifies credentials with Firebase and returns a session token to the frontend. The frontend then performs the login using the token it received.
<br>
<br>
<br>

## - Sync with Google: `POST /api/auth/sync-google`

Registration made with Google is synced in Hermyx.

**Requires authentication:** No

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | Yes | Username. |
| `email` | string | Yes | E-mail. |
| `firebaseUid` | string | Yes | Firebase UID. |
<br>

**Responses:**

- `200 OK`: successful login.

  ```json
  {
    "user": {"<user_data>"}
  }
  ```

- `201 Created`: successful signup.

  ```json
  {
    "user": {"<user_data>"}
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

- `409 Conflict`: logic error.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

  <br>

**Workflow:** previously, the system attempted to determine on both, the frontend and backend, whether the operation was a login or a signup. This caused two major issues: first, it could stall the process when the Google pop-up appeared; second, an endpoint that allowed any registered user to delete another user was needed, representing a critical security flaw. Now, the frontend simply handles the Google registration via Firebase and passes the information to the backend, which checks if the user already exists (treating it as a login) or creates the user if they do not (treating it as a signup). While database transactions are not required in this scenario, compensatory transactions with Firebase are; in fact, one of these frontend compensatory transactions was the root cause of that problematic endpoint. However, the current approach handles failures, whether during signup or login, by ​​simply logging the user out on the frontend. The next time the user attempts to sync with Google, the backend detects whether or not the user was actually created in the Hermyx database. Additionally, there are two unique indexes in database, one for username and another for the email, that allow to no use transactions for concurrency purposes, since one of any two users that want to sign up using the same username/email at the same will collide with the indexes and won't be able to sign up.
