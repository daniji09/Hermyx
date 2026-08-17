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

**Workflow:** application opened missions are searched by their title, with pagination used by default, although it is optional. The database search is performed using the PostgreSQL `unaccent` extension, which removes accents and diacritics from a text string, transforming them into their base equivalent, so that text strings are compared in a way that is insensitive to accents. Includes filters for minimum payment, maximum payment and maximum distance.
<br>
<br>
<br>

## - Get mission by mid: `GET /api/missions/:mid`

Gets the mission specified by its identifier, mid.

**Requires authentication:** Yes

**Path parameters:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Responses:**

- `200 OK`: mission obtain successfully.

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

- `404 Not Found`: mission not found, mission with that mid does not exist.
  ```json
  {
    "errors": {
      "general": ["Mission not found."]
    }
  }
  ```
    <br>

**Workflow:** application mission is searched by its identifier, it retrieves all mission information, including its participants, its participants waiting for payment and its photos.
<br>
<br>
<br>

## - Publish mission: `POST /api/missions/`

Publishes a new mission.

**Requires authentication:** Yes

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | Yes | Mission title. |
| `description` | string | Yes | Mission description. |
| `photos` | array | No | Mission array of photos. |
| `vacancies` | integer | Yes | Mission vacancy number. |
| `vacanciesData` | array | Yes | Mission vacancies data. |
| `latitude` | integer | No* | Mission latitude location. |
| `longitude` | integer | No* | Mission longitude location. |
_> Note: `latitude` and `longitude` are optional, but if one is provided, both must be sent together._
<br>

**Responses:**

- `201 OK`: mission created successfully.

  ```json
  {
    "mission": {
      "mission_info": "<mission_info>"
    }
  }
  ```

- `400 Bad Request`: fields validation error, missing fields or logic error: user already has a mission named like that.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

    <br>

**Workflow:** to publish a mission, it's needed to enter the title, description, and information about the available vacancies, which must include at least one vacancy and its title and monetary reward. Optionally, it's aso possible to add up to five images, which are handled by the `multer` (Azure TODO:)library, and a location, which is handled by the `postgis` extension for PostgreSQL. Because creating a mission requires entering data into missions, mission participants, conversations, conversation participants, and mission photos, a database transaction is necessary.
<br>
<br>
<br>

## - Close mission: `POST /api/missions/:mid/close`

Close a mission after been opened or reopened.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Responses:**

- `200 OK`: mission closed successfully.

  ```json
  {
    "mission": {
      "status": "<mission_status>",
      "participants": "<mission_participants>"
    }
  }
  ```

- `400 Bad Request`: path fields validation error, missing path fields or logic error: cannot close mission on current state or cannot close mission with no adventurers.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `403 Forbidden`: user is unauthorized to do this action: mission does not belong to him.

  ```json
  {
    "errors": {
      "general": ["User is not authorized for this action."]
    }
  }
  ```

- `404 Not Found`: mission not found.

  ```json
  {
    "errors": {
      "general": ["Mission not found."]
    }
  }
  ```

<br>

**Workflow:** mission close process must be performed on missions in the 'opened' or 'reopened' state. In the first case, the mission must have at least one 'joined' adventurer to be closed, while in the second, the mission can be closed again without any new adventurers joining. Additionally, a database transaction is performed to update the mission's status to 'in_progress', as well as the vacancies of newly joined adventurers to the 'in_progress' status. Finally, as always, the necessary notifications are sent.
<br>
<br>
<br>

## - Join mission: `POST /api/missions/:mid/join`

Adventurers sends a join request notification to the owner of the mission, linking a specific vacancy.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vacancyId` | integer | Yes | Vacancy identifier. |
| `message` | string | No | Message send to owner. |
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

- `403 Forbidden`: user is unauthorized to do this action: cannot join their own mission.

  ```json
  {
    "errors": {
      "general": ["You can't join your own mission."]
    }
  }
  ```

- `404 Not Found`: mission or vacancy not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy not found."]
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

**Workflow:** the process of sending a mission join request notification is quite simple, all necessary checks are performed and, if they are correct, the notification is sent.
<br>
<br>
<br>

## - Invite to mission: `POST /api/missions/:mid/invite`

Applicant sends an invitation to a user, so they can join a vacancy of a mission.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `receiverId` | integer | Yes | User receiver identifier. |
| `vacancyId` | integer | Yes | Vacancy identifier. |
| `message` | string | No | Message send to owner. |
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

- `403 Forbidden`: user is unauthorized to do this action: cannot join their own mission.

  ```json
  {
    "errors": {
      "general": ["You can't join your own mission."]
    }
  }
  ```

- `404 Not Found`: mission, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy not found."]
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

**Workflow:** the process of sending a mission join invitation is quite simple, all necessary checks are performed and, if they are correct, the invitation is sent.
<br>
<br>
<br>

## - Unjoin mission: `POST /api/missions/:mid/unjoin`

User unjoins a mission they are participating in.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vacancyId` | integer | Yes | Vacancy identifier. |
<br>

**Responses:**

- `200 OK`: mission successfully unjoined.

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
      "general": ["You can't join your own mission."]
    }
  }
  ```

- `404 Not Found`: mission, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy not found."]
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

**Workflow:** when current user unjoins a mission, if every check is surpassed, then, a database transaction is needed to updated the mission, the participation and the conversation associated, also to send the appropriate notification.
<br>
<br>
<br>

## - Submit mission participation: `POST /api/missions/:mid/submit`

Adventurers submits their part for the mission.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
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

- `404 Not Found`: mission or vacancy not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy not found."]
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

## - Cancel or delete mission: `POST /api/missions/:mid/cancel`

Cancels a mission, if it hadn't been started, then is a deletion.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Responses:**

- `200 OK`: mission deleted successfully.

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
      "general": ["You can't join your own mission."]
    }
  }
  ```

- `404 Not Found`: mission, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy/User not found."]
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

**Workflow:** mission deletion and cancellation have a quite simple foundation, if basic checks pass and the status is valid, the status changes to "deleted" or "cancelled," notifying all adventurers who had joined. However, cancelling a mission implies paying the adventurers their monetary reward as compensation. Consequently, the process follows this workflow: the mission changes to an intermediate "cancelling" status indicating the intent; then, each vacancy is processed individually to execute the bank transfer first, and, upon success, save the transaction to the database and update the slot's status, with this last entire operation being atomic thanks to a database transaction. This sequence ensures that if any operation fails, it does not cause subsequent operations to fail; instead, the failure is saved so it can be retried later (using a logging service, which is not currently implemented). After all the process is complete, notifications are send using a different transaction, and, is worth noting that, for each successful transaction, its vacancy id has been save, so when notifications are sent, failed ones will know it.
<br>
<br>
<br>

## - Reopen mission: `POST /api/missions/:mid/reopen`

Reopens a mission after being closed.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Responses:**

- `200 OK`: mission reopened successfully.

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
      "general": ["You can't join your own mission."]
    }
  }
  ```

- `404 Not Found`: mission, vacancy or user not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy/User not found."]
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

**Workflow:** mission reopen process is quite simple, if mission was already closed and there is empty vacancies available, it can be reopened, notifying every other occupied vacancy.
<br>
<br>
<br>

## - Reopen mission: `POST /api/missions/:mid/finish`

Finishes a mission.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Responses:**

- `200 OK`: mission finished successfully.

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
      "general": ["You can't join your own mission."]
    }
  }
  ```

- `404 Not Found`: mission or vacancy not found.

  ```json
  {
    "errors": {
      "general": ["Mission/Vacancy not found."]
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

**Workflow:** mission finish process is quite simple, if mission is in a valid state and all participants are in 'released' state, i.e. all participants have been payed, then mission can be finished. A database transaction is needed for updating the mission status and finish the conversation, but no notifications are sent. It is just and administrative state for the applicant to ensure the application that the mission has finished and won't be reopened again because there is something left.
<br>
<br>
<br>

## - Ban mission: `POST /api/missions/:mid/ban`

Bans a mission.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | int | Yes | Report identifier. |
| `reason` | string | Yes | Report decision reason. |
<br>

**Responses:**

- `200 OK`: mission banned successfully.

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

**Workflow:** banning a mission means deleting it or cancelling it rewarding every adventurer.
<br>
<br>
<br>

## - Kick adventurer out: `POST /api/missions/:mid/kick/:vacancyId`

Kicks an adventurer out of a specified mission

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |
| `vacancyId` | integer | Yes | Mission participation identifier. |
<br>

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rid` | int | Yes | Report identifier. |
| `reason` | string | Yes | Report decision reason. |
<br>

**Responses:**

- `200 OK`: adventurer kicked out successfully.

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

**Workflow:** kicking an adventurer out can be while mission is closed, so it just kicks them out; or while participation has already been payed, so adventurer is kicked out and their reward is refunded to the applicant.
<br>
<br>
<br>

## - Edit mission: `PUT /api/missions/:mid`

Edits information from a mission that has already been published.

**Requires authentication:** Yes

**Path params:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mid` | integer | Yes | Mission identifier. |

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | Yes | Mission title. |
| `description` | string | Yes | Mission description. |
| `photos` | array | No | Mission array of all photos. |
| `existingPhotos` | array | No | Mission array of photos that were already on the mission. |
| `vacancies` | integer | Yes | Mission vacancy number. |
| `vacanciesData` | array | Yes | Mission vacancies data. |
| `latitude` | integer | No* | Mission latitude location. |
| `longitude` | integer | No* | Mission longitude location. |
_> Note: `latitude` and `longitude` are optional, but if one is provided, both must be sent together._

**Files:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `photos` | array | No | Mission array of all photos. |
| `existingPhotos` | array | No | Mission array of photos that were already on the mission. |
<br>

**Responses:**

- `200 OK`: mission updated successfully.

  ```json
  {
    "mission": {
      "mission_info": "<updated_mission_info>"
    }
  }
  ```

- `400 Bad Request`: fields validation error, missing fields or logic error: user already has a mission named like that, cannot edit mission in current state, cannot delete vacancy in current state, cannot edit vacancy in current state.

  ```json
  {
    "errors": {
      "<field>": ["<error>"]
    }
  }
  ```

- `404 Not Found`: mission not found.

  ```json
  {
    "errors": {
      "general": ["Mission not found."]
    }
  }
  ```

<br>

**Workflow:** to edit a mission, it's needed to enter the title, description, and information about the available vacancies, which must include at least one vacancy and its title and monetary reward. Optionally, it's aso possible to add up to five images, which are handled by the `multer` library, and a location, which is handled by the `postgis` extension for PostgreSQL. The process consists of four steps: first, performing all necessary validations on the entered data to ensure its accuracy; second, processing the new images, locally in development environments and in Azure Blob environments in production; third, performing all internal updates using a database transaction; and fourth, deleting the eliminated images and finally sending the necessary notifications. This order is used to ensure data integrity, so in the worst-case scenario, some corrupted images may remain in storage, or some notifications may not be sent. If the process were performed in a different order, notifications, for example, could not be rolled back.
Besides, mission and mission participations information can always be changed without permission, except on obvious states such as 'finished', 'deleted' or 'cancelled' for missions and 'accepted' or 'released' for mission participations. Mission participation monetary reward can be change with permission of the adventurer that occupied that participation, if any. Mission participation deletion is only permitted on empty participation or on 'opened' missions.
<br>
<br>
<br>
