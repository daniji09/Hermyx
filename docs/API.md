# API Documentation

## Authentication

**Description:** manages users authentication into the platform

### - Login: `POST /api/auth/login`

**Description:** log in user in Hermyx and returns Firebase token to complete the process.

**Requires authentications:** No

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | No* | Username. |
| `email` | string | No* | E-mail. |
| `password` | string | Yes | Password. |
_> Note: At least one of `username` or `email` must be sent._

**Responses:**

- `200 OK`: successful login.

  ```json
  {
    "token": "<token>"
  }
  ```

- `400 Bad Request`: fields error.
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
  **Notes:** previously, the login process was implemented in a way that when a user entered their username, the frontend would query the backend API for that user's email address. While this approach was simpler, since logging in via the Firebase Client SDK is lightweight, it exposed a serious security risk: anyone could enter random usernames and retrieve the corresponding personal email addresses. Consequently, the workflow has been changed, the user lookup logic is now delegated to this endpoint, which verifies credentials with Firebase and returns a session token to the frontend. The frontend then performs the login using the token it received.
