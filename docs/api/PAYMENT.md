# API - Payment documentation

Manages payments in the platform
<br><br>

## - Get user's saved cards: `GET /stripe/cards`

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

## - Create intent for card addition: `POST /stripe/cards`

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

## - Set card as default: `POST /stripe/cards/default`

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

  **Workflow:** the process for setting a card as a default is quite simple, with some interesting logic though. Backend receives the Stripe id of the payment method and it has to check whether that id exists on Stripe and that it actually belongs to the current user, to avoid someone paying with the info of another user. Then, it just sets that card as default.
  <br>
  <br>
  <br>

## - Delete a card: `DELETE /stripe/cards`

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

  **Workflow:** the process for deleting card as a default is quite simple, with some interesting logic though. Backend receives the Stripe id of the payment method and it has to check whether that id exists on Stripe and that it actually belongs to the current user, to avoid someone deleting the payment method of another user. Then, deletes the card from Stripe and ensures that, if that card was the default one, this field is set to null in Stripe (even though is something that Stripe actually does on its backend).
  <br>
  <br>
  <br>
