# API - Payment documentation

Manages payments in the platform
<br><br>

## - Get user's saved cards: `GET /api/stripe/cards`

Gets all cards saved by user.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: cards found successfully.

  ```json
  {
    "defaultPaymentMethodId": "<id>",
    "cards": [{"<card_1_data>"}, {"card_2_data"}]
  }
  ```

  **Workflow:** to retrieve the cards of a user, a call to `Stripe` API is made with the `customer id`.
  <br>
  <br>
  <br>

## - User's Stripe connection success: `GET /api/stripe/connect/success`

Endpoint that confirms the success of the connection to Stripe

**Requires authentication:** Yes

**Responses:**

- `200 Created`: user connected to Stripe successfully.

  ```json
  {}
  ```

**Workflow:** just a endpoint that Stripe calls when process has been completed, so it come back to Hermyx.
<br>
<br>
<br>

## - Create intent for card addition: `POST /api/stripe/cards`

Creates an intent in Stripe for that user to add a card.

**Requires authentication:** Yes

**Responses:**

- `200 OK`: intent created successfully.

  ```json
  {
    "setupIntentClientSecret": "<clientSecret>"
  }
  ```

  **Workflow:** the process for a user to save a new card is a bit complex. The frontend sends a request to this endpoint to create an intent in Stripe, notifying that the current user is about to add a card. The backend performs the operation successfully and returns the client secret to the frontend, which uses it to send the card information and add it correctly to the corresponding user. This is required by law, because if the frontend were to send the credit card information to the backend, the backend would be responsible for auditing that information according to PCI-DSS. Furthermore, when the card addition is executed on the frontend, if Stripe detects that a pop-up from the corresponding bank needs to be displayed due to 3D Secure, it will be displayed, something impossible to do on the backend.
  <br>
  <br>
  <br>

## - Set card as default: `POST /api/stripe/cards/default`

Sets a card to be the default one.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `paymentMethodId` | string | Yes | Stripe's payment method identifier. |
<br>

**Responses:**

- `200 OK`: card set as default successfully.

  ```json
  {}
  ```

- `400 Bad Request`: body fields validation error, missing body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot set as default a card that does not belong to them.

  ```json
  {
    "errors": {
      "general": ["Payment method does not belong to the current user."]
    }
  }
  ```

- `404 Not Found`: payment method not found.

  ```json
  {
    "errors": {
      "general": ["Payment method not found."]
    }
  }
  ```

**Workflow:** the process for setting a card as a default is quite simple, with some interesting logic though. Backend receives the Stripe id of the payment method and it has to check whether that id exists on Stripe and that it actually belongs to the current user, to avoid someone paying with the info of another user. Then, it just sets that card as default.
<br>
<br>
<br>

## - Create payment intent with default card: `POST /api/stripe/services/:mid/pay/default`

Creates a payment intent using the user's default card.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | int | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: payment intent created successfully.

  ```json
  {
    "clientSecret": "<client_secret>",
    "paymentIntentId": "<PI>",
    "paymentMethodId": "<defaultPm>"
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

- `403 Forbidden`: user is unauthorized to do this action: cannot pay a service that don't belong to them.

  ```json
  {
    "errors": {
      "general": ["User is not authorized for this action."]
    }
  }
  ```

- `404 Not Found`: service not found.

  ```json
  {
    "errors": {
      "general": ["Service not found."]
    }
  }
  ```

- `409 Conflict`: logic error.

  ```json
  {
    "errors": {
      "general": [<"error">]
    }
  }
  ```

  **Workflow:** this endpoints creates a payment intent (PI) for a service and retrieves to frontend, so it just warns Stripe that there will be a payment from that user of a certain quantity using their default payment. All basic checks are done.
  <br>
  <br>
  <br>

## - Create payment intent with a new card: `POST /api/stripe/services/:mid/pay/new`

Creates a payment intent using a new card.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | int | Yes | Service identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `saveCard` | boolean | No | User's will to save the card. |
<br>

**Responses:**

- `200 OK`: payment intent created successfully.

  ```json
  {
    "clientSecret": "<client_secret>",
    "paymentIntentId": "<PI>"
  }
  ```

- `400 Bad Request`: body or param fields validation error, missing body or param fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot pay a service that don't belong to them.

  ```json
  {
    "errors": {
      "general": ["User is not authorized for this action."]
    }
  }
  ```

- `404 Not Found`: service not found.

  ```json
  {
    "errors": {
      "general": ["Service not found."]
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

**Workflow:** this endpoint creates a payment intent (PI) for a service and retrieves to frontend, so it just warns Stripe that there will be a payment from that user of a certain quantity using a new payment. All basic checks are done.
<br>
<br>
<br>

## - Confirm service payment: `POST /api/stripe/services/:mid/confirm`

Confirms payment and make changes in database

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | int | Yes | Service identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `paymentIntentId` | boolean | No | User's will to save the card. |
<br>

**Responses:**

- `201 Created`: payment confirmed successfully.

  ```json
  {}
  ```

- `400 Bad Request`: body or param fields validation error, missing body or param fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot confirm payment of a service that don't belong to them.

  ```json
  {
    "errors": {
      "general": ["User is not authorized for this action."]
    }
  }
  ```

- `404 Not Found`: service not found.

  ```json
  {
    "errors": {
      "general": ["Service not found."]
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

**Workflow:** this endpoint takes the PI created on the previous endpoint, confirms with `Stripe` that the payment has been successful and changes database. This changes add the payments and updates service and its vacancies. To avoid double payments, idempotency keys are used and to avoid data changes while payment, pessimistic concurrency is used over the service that is being payed.
<br>
<br>
<br>

## - Connects user to a Stripe account as an collaborator: `POST /api/stripe/connect/onboard`

Creates an account in Stripe for the collaborator.

**Requires authentication:** Yes

**Responses:**

- `200 Created`: user connected to Stripe successfully.

  ```json
  { "url": "<account_url>" }
  ```

**Workflow:** the goal of this endpoint is very simple because it involves creating a Stripe account for the collaborator so they can receive money. However, Know Your Customer (KYC) regulations require Stripe to use a very long and difficult form with overly specific questions for each user who registers. This would cause most users to abandon the process because they wouldn't know how to answer the questions or found it too lengthy. Therefore, Hermyx creates this account in a express way, providing the user with the necessary data. Specifically, the following information is provided: "business type" set to "individual," meaning the account will belong to a private individual; "url" set to the Hermyx URL, as Stripe always requires the company's URL; "mcc" set to '8999', a code that characterizes the type of business the company operates, with 8999 serving as a wildcard for "Miscellaneous Professional Services", "product description" refers to a description of the Hermyx product; and "capabilities" adds the possibility that the user who creates the account can receive money. Additionally, there is optimistic concurrency control due to possibles double-clicks, so, the account is only updated if it didn't exist before.
<br>
<br>
<br>

## - Links user to Stripe dashboard: `POST /api/stripe/connect/dashboard-link`

Returns Stripe dashboard link for registered users

**Requires authentication:** Yes

**Responses:**

- `200 Created`: user connected to Stripe dashboard successfully.

  ```json
  { "url": "<dashboard_url>" }
  ```

- `403 Forbidden`: user hasn't finished Stripe register.

  ```json
  {
    "errors": {
      "general": ["You have not completed the Stripe onboarding yet."]
    }
  }
  ```

**Workflow:** this endpoints just returns Stripe dashboard URL for the specified user, if it has completed the register form.
<br>
<br>
<br>

## - Delete a card: `DELETE /api/stripe/cards`

Deletes the specified card.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `paymentMethodId` | string | Yes | Stripe's payment method identifier. |
<br>

**Responses:**

- `200 OK`: card deleted successfully.

  ```json
  {}
  ```

- `400 Bad Request`: body fields validation error, missing body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot delete a card that does not belong to them.

  ```json
  {
    "errors": {
      "general": ["Payment method does not belong to the current user."]
    }
  }
  ```

- `404 Not Found`: payment method not found.

  ```json
  {
    "errors": {
      "general": ["Payment method not found."]
    }
  }
  ```

  **Workflow:** the process for deleting card as a default is quite simple, with some interesting logic though. Backend receives the Stripe id of the payment method and it has to check whether that id exists on Stripe and that it actually belongs to the current user, to avoid someone deleting the payment method of another user. Then, deletes the card from Stripe and ensures that, if that card was the default one, this field is set to null in Stripe (even though is something that Stripe actually does on its backend).
  <br>
  <br>
  <br>
