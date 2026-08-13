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
