# API - Services documentation

Manages services action on the platform
<br><br>

## - Get all services: `GET /api/services`

Gets all opened and reopened services from Hermyx, being able to query them by
title.

**Requires authentication:** No. This endpoint is public and can be requested
without a bearer token.

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | No | Title to search. |
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no services). Example with pagination.

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

- `400 Bad Request`: query fields validation error, missing query fields.
  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```
  <br>

**Workflow:** application services are searched by their title with mandatory
pagination. The database search is performed using the PostgreSQL `unaccent`
extension, which removes accents and diacritics from a text string, transforming
them into their base equivalent, so that text strings are compared in a way
that is insensitive to accents.
<br>
<br>
<br>

## - Get all opened services: `GET /api/services/opened`

Gets all service opened from Hermyx, being able to query them by title, minimum payment, maximum payment and maximum distance.

**Requires authentication:** No. This is the public service search endpoint.
The distance filter is applied only when an authenticated user with a saved
location makes the request; title and payment filters are available to all
users.

**Query parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | No | Title to search. |
| `minPayment` | double | No | Minimum payment accepted. |
| `maxPayment` | double | No | Maximum payment accepted. |
| `maxDistanceKm` | double | No | Maximum distance to user in km accepted. |
| `page` | integer | Yes | Page number for pagination (starts at 1). |
| `limit` | integer | Yes | Maximum number of results per page. |
_> Both `page` and `limit` must be sent for every request._
<br>

**Responses:**

- `200 OK`: search done successfully (could retrieve no services). Example with pagination.

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

- `400 Bad Request`: query fields validation error, missing query fields.
  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```
  <br>

**Workflow:** application opened services are searched by their title with
mandatory pagination. The database search is performed using the PostgreSQL
`unaccent` extension, which removes accents and diacritics from a text string,
transforming them into their base equivalent, so that text strings are
compared in a way that is insensitive to accents. Includes filters for
minimum payment, maximum payment and maximum distance.
<br>
<br>
<br>

## - Get service by mid: `GET /api/services/:mid`

Gets the service specified by its identifier, mid.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: service obtain successfully.

  ```json
  {
    "mission": "<mission>"
  }
  ```

- `400 Bad Request`: path parameters fields validation error, missing path parameters fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: service not found, service with that mid does not exist.
  ```json
  {
    "errors": {
      "general": ["Service not found."]
    }
  }
  ```
    <br>

**Workflow:** application service is searched by its identifier, it retrieves all service information, including its participants, its participants waiting for payment and its photos.
<br>
<br>
<br>

## - Get service payment info by mid: `GET /api/services/:mid/payment-info`

Gets payment info of the service specified by its identifier, mid.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: service obtain successfully.

  ```json
  {
    "mission": "<mission>"
  }
  ```

- `400 Bad Request`: path parameters fields validation error, missing path parameters fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: service not found, service with that mid does not exist.
  ```json
  {
    "errors": {
      "general": ["Service not found."]
    }
  }
  ```
    <br>

**Workflow:** application service payment info is searched by its identifier, it retrieves all service payment information, all participants that are in pending payment status.
<br>
<br>
<br>

## - Publish service: `POST /api/services`

Publishes a new service.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | Yes | Service title. |
| `description` | string | Yes | Service description. |
| `photos` | array | No | Service array of photos. |
| `vacancies` | integer | Yes | Service vacancy number. |
| `vacanciesData` | array | Yes | Service vacancies data. |
| `latitude` | integer | No* | Service latitude location. |
| `longitude` | integer | No* | Service longitude location. |
_> Note: `latitude` and `longitude` are optional, but if one is provided, both must be sent together._
<br>

**Responses:**

- `201 OK`: service created successfully.

  ```json
  {
    "mission": {
      "mission_info": "<mission_info>"
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

- `409 Conflict`: logic error.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

    <br>

**Workflow:** to publish a service, it's needed to enter the title, description, and information about the available vacancies, which must include at least one vacancy and its title and monetary reward. Optionally, it's also possible to add up to five images, which are received by Multer and stored through the configured local/Azure storage provider, and a location, which is handled by the PostGIS extension for PostgreSQL. Because creating a service requires entering data into services, service participants, conversations, conversation participants, and service photos, a database transaction is necessary.
<br>
<br>
<br>

## - Close service: `POST /api/services/:mid/close`

Close a service after been opened or reopened.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: service closed successfully.

  ```json
  {
    "mission": {
      "status": "<mission_status>",
      "participants": "<mission_participants>"
    }
  }
  ```

- `400 Bad Request`: path fields validation error, missing path fields or logic error.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: service does not belong to him.

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

<br>

**Workflow:** service close process must be performed on services in the 'opened' or 'reopened' state. In the first case, the service must have at least one 'joined' collaborator to be closed, while in the second, the service can be closed again without any new collaborators joining. Additionally, a database transaction is performed to update the service's status to 'in_progress', as well as the vacancies of newly joined collaborators to the 'in_progress' status. Finally, as always, the necessary notifications are sent.
<br>
<br>
<br>

## - Join service: `POST /api/services/:mid/join`

Collaborators sends a join request notification to the applicant of the service, linking a specific vacancy.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vacancyId` | integer | Yes | Vacancy identifier. |
| `message` | string | No | Message send to applicant. |
<br>

**Responses:**

- `200 OK`: notification created successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot join their own service.

  ```json
  {
    "errors": {
      "general": ["You can't join your own service."]
    }
  }
  ```

- `404 Not Found`: service or vacancy not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy not found."]
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

**Workflow:** the process of sending a service join request notification is quite simple, all necessary checks are performed and, if they are correct, the notification is sent.
<br>
<br>
<br>

## - Invite to service: `POST /api/services/:mid/invite`

Applicant sends an invitation to a user, so they can join a vacancy of a service.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `receiverId` | integer | Yes | User receiver identifier. |
| `vacancyId` | integer | Yes | Vacancy identifier. |
| `message` | string | No | Message send to applicant. |
<br>

**Responses:**

- `200 OK`: notification created successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot join their own service.

  ```json
  {
    "errors": {
      "general": ["You can't join your own service."]
    }
  }
  ```

- `404 Not Found`: service, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy not found."]
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

**Workflow:** the process of sending a service join invitation is quite simple, all necessary checks are performed and, if they are correct, the invitation is sent.
<br>
<br>
<br>

## - Unjoin service: `POST /api/services/:mid/unjoin`

User unjoins a service they are participating in.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vacancyId` | integer | Yes | Vacancy identifier. |
<br>

**Responses:**

- `200 OK`: service successfully unjoined.

  ```json
  {}
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot unjoin participations that don't belong to them.

  ```json
  {
    "errors": {
      "general": ["You can't join your own service."]
    }
  }
  ```

- `404 Not Found`: service, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy not found."]
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

**Workflow:** when current user unjoins a service, if every check is surpassed, then, a database transaction is needed to updated the service, the participation and the conversation associated, also to send the appropriate notification.
<br>
<br>
<br>

## - Submit service participation: `POST /api/services/:mid/submit`

Collaborators submits their part for the service.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: participation submitted successfully.

  ```json
  { "nid": "<notification_id>" }
  ```

- `400 Bad Request`: path fields validation error, missing path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: service or vacancy not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy not found."]
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

**Workflow:** when current user submits their participation, if every check is surpassed, then, a database transaction is needed to updated that participation to submitted and send the appropriate notification to the applicant.
<br>
<br>
<br>

## - Cancel or delete service: `POST /api/services/:mid/cancel`

Cancels a service, if it hadn't been started, then is a deletion.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: service deleted successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path fields validation error, missing path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot unjoin participations that don't belong to them.

  ```json
  {
    "errors": {
      "general": ["You can't join your own service."]
    }
  }
  ```

- `404 Not Found`: service, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy/User not found."]
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

**Workflow:** service deletion and cancellation have a quite simple foundation, if basic checks pass and the status is valid, the status changes to "deleted" or "cancelled," notifying all collaborators who had joined. However, cancelling a service implies paying the collaborators their monetary reward as compensation. Consequently, the process follows this workflow: the service changes to an intermediate "cancelling" status indicating the intent; then, each vacancy is processed individually to execute the bank transfer first, and, upon success, save the transaction to the database and update the slot's status, with this last entire operation being atomic thanks to a database transaction. This sequence ensures that if any operation fails, it does not cause subsequent operations to fail; instead, the failure is saved so it can be retried later (using a logging service, which is not currently implemented). After all the process is complete, notifications are send using a different transaction, and, is worth noting that, for each successful transaction, its vacancy id has been save, so when notifications are sent, failed ones will know it.
<br>
<br>
<br>

## - Reopen service: `POST /api/services/:mid/reopen`

Reopens a service after being closed.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: service reopened successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path fields validation error, missing path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot unjoin participations that don't belong to them.

  ```json
  {
    "errors": {
      "general": ["You can't join your own service."]
    }
  }
  ```

- `404 Not Found`: service, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy/User not found."]
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

**Workflow:** service reopen process is quite simple, if service was already closed and there is empty vacancies available, it can be reopened, notifying every other occupied vacancy.
<br>
<br>
<br>

## - Finish service: `POST /api/services/:mid/finish`

Finishes a service.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Responses:**

- `200 OK`: service finished successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path fields validation error, missing path fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: cannot unjoin participations that don't belong to them.

  ```json
  {
    "errors": {
      "general": ["You can't join your own service."]
    }
  }
  ```

- `404 Not Found`: service or vacancy not found.

  ```json
  {
    "errors": {
      "general": ["Service/Vacancy not found."]
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

**Workflow:** service finish process is quite simple, if service is in a valid state and all participants are in 'released' state, i.e. all participants have been payed, then service can be finished. A database transaction is needed for updating the service status and finish the conversation, but no notifications are sent. It is just and administrative state for the applicant to ensure the application that the service has finished and won't be reopened again because there is something left.
<br>
<br>
<br>

## - Ban service: `POST /api/services/:mid/ban`

Bans a service.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | int | Yes | Report identifier. |
| `reason` | string | Yes | Report decision reason. |
<br>

**Responses:**

- `200 OK`: service banned successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: action can only done by an admin.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: report not found.

  ```json
  {
    "errors": {
      "general": ["Report not found."]
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

**Workflow:** banning a service means deleting it or cancelling it rewarding every collaborator. Since this operation can imply a money transaction and implies a report, the following mechanism is used: report is locked by updating it to 'answered' state, then `Stripe` transaction is done, and, after that, all operations left are done inside a database transaction. If Stripe transaction fails, report block is reverted, otherwise it will still be standing even if anything else fails, so a database inconsistency is expected.
<br>
<br>
<br>

## - Kick collaborator out: `POST /api/services/:mid/kick/:vacancyId`

Kicks an collaborator out of a specified service

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |
| `vacancyId` | integer | Yes | Service participation identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | int | Yes | Report identifier. |
| `reason` | string | Yes | Report decision reason. |
<br>

**Responses:**

- `200 OK`: collaborator kicked out successfully.

  ```json
  {}
  ```

- `400 Bad Request`: path or body fields validation error, missing path or body fields.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: action can only done by an admin.

  ```json
  {
    "errors": {
      "general": ["<error>"]
    }
  }
  ```

- `404 Not Found`: report not found.

  ```json
  {
    "errors": {
      "general": ["Report not found."]
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

**Workflow:** kicking an collaborator out can be while service is closed, so it just kicks them out; or while participation has already been payed, so collaborator is kicked out and their reward is refunded to the applicant. Since this operation can imply a money transaction and implies a report, the following mechanism is used: report is locked by updating it to 'answered' state, then `Stripe` transaction is done, and, after that, all operations left are done inside a database transaction. If Stripe transaction fails, report block is reverted, otherwise it will still be standing even if anything else fails, so a database inconsistency is expected.
<br>
<br>
<br>

## - Edit service: `PUT /api/services/:mid`

Edits information from a service that has already been published.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Service identifier. |

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | Yes | Service title. |
| `description` | string | Yes | Service description. |
| `photos` | array | No | Service array of all photos. |
| `existingPhotos` | array | No | Service array of photos that were already on the service. |
| `vacancies` | integer | Yes | Service vacancy number. |
| `vacanciesData` | array | Yes | Service vacancies data. |
| `latitude` | integer | No* | Service latitude location. |
| `longitude` | integer | No* | Service longitude location. |
_> Note: `latitude` and `longitude` are optional, but if one is provided, both must be sent together._

**Files:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `photos` | array | No | Service array of all photos. |
| `existingPhotos` | array | No | Service array of photos that were already on the service. |
<br>

**Responses:**

- `200 OK`: service updated successfully.

  ```json
  {
    "mission": {
      "mission_info": "<updated_mission_info>"
    }
  }
  ```

- `400 Bad Request`: fields validation error, missing fields or logic error.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
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

<br>

**Workflow:** to edit a service, it's needed to enter the title, description, and information about the available vacancies, which must include at least one vacancy and its title and monetary reward. Optionally, it's aso possible to add up to five images, which are handled by the `multer` library, and a location, which is handled by the `postgis` extension for PostgreSQL. The process consists of four steps: first, performing all necessary validations on the entered data to ensure its accuracy; second, processing the new images, locally in development environments and in Azure Blob environments in production; third, performing all internal updates using a database transaction; and fourth, deleting the eliminated images and finally sending the necessary notifications. This order is used to ensure data integrity, so in the worst-case scenario, some corrupted images may remain in storage, or some notifications may not be sent. If the process were performed in a different order, notifications, for example, could not be rolled back.
Besides, service and service participations information can always be changed without permission, except on obvious states such as 'finished', 'deleted' or 'cancelled' for services and 'accepted' or 'released' for service participations. Service participation monetary reward can be change with permission of the collaborator that occupied that participation, if any. Service participation deletion is only permitted on empty participation or on 'opened' services.
<br>
<br>
<br>
