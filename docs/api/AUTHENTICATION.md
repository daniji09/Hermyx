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

- `200 OK`: successful signup.

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
  <br>

**Workflow:** the sign up process takes place entirely on the backend, handling data received from the frontend. After verifying that the username and email address do not already exist in the Hermyx database, the system checks that the email is not present in Firebase either. Subsequently, the user is created first in Firebase and then in the Hermyx database, correctly storing the user's Firebase UID. This approach eliminates the need for database transactions, though compensatory transactions in Firebase may be used.
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
