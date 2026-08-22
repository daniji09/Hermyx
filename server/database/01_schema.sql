-- Tables deletion
DROP TABLE IF EXISTS GUILD_MISSION;
DROP TABLE IF EXISTS GUILD_MEMBER;
DROP TABLE IF EXISTS CONVERSATION_MESSAGE;
DROP TABLE IF EXISTS MESSAGE;
DROP TABLE IF EXISTS CONVERSATION_PARTICIPANT;
DROP TABLE IF EXISTS REPORT;
DROP TABLE IF EXISTS CONVERSATION;
DROP TABLE IF EXISTS NOTIFICATION;
DROP TABLE IF EXISTS INVITATION;
DROP TABLE IF EXISTS MISSION_PHOTO;
DROP TABLE IF EXISTS MISSION_PAYMENT;
DROP TABLE IF EXISTS MISSION_PARTICIPATION;
DROP TABLE IF EXISTS REVIEW;
DROP TABLE IF EXISTS TAG;
DROP TABLE IF EXISTS PAYMENT_METHOD;
DROP TABLE IF EXISTS ROLE; 
DROP TABLE IF EXISTS MISSION;
DROP TABLE IF EXISTS GUILD;
DROP TABLE IF EXISTS APP_USER;

-- Special extensions creation
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tables creation
CREATE TABLE APP_USER (
	uid SERIAL PRIMARY KEY,
	username VARCHAR(20) NOT NULL, -- Uniqueness has to considered lower and uppercase, so a index is created
	email VARCHAR(100), -- Uniqueness has to considered lower and uppercase, so a index is created
	firebase_uid VARCHAR(255) NOT NULL UNIQUE,
	role VARCHAR(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SYSTEM')),
	status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN('ACTIVE', 'DELETED', 'BANNED')),
	description VARCHAR(500),
	name VARCHAR(50),
	surnames VARCHAR(100),
	location geography(Point, 4326),
	avatar TEXT,
	configuration JSONB NOT NULL DEFAULT '{"show_missions_to_others": true}'::jsonb,
	rating NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5), -- Cached aggregate for profile reads
	stripe_customer_id VARCHAR(255),
  	stripe_connected_id VARCHAR(255)
);
CREATE UNIQUE INDEX unique_username_lower ON app_user (LOWER(username));
CREATE UNIQUE INDEX unique_email_lower ON app_user (LOWER(email));
CREATE UNIQUE INDEX unique_stripe_customer_id ON app_user (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX unique_stripe_connected_id ON app_user (stripe_connected_id) WHERE stripe_connected_id IS NOT NULL;

CREATE TABLE PAYMENT_METHOD (
	payment_method VARCHAR(100) NOT NULL,
	uid INT NOT NULL,	
	FOREIGN KEY (uid) REFERENCES APP_USER(uid),
	PRIMARY KEY(payment_method, uid)
);

CREATE TABLE MISSION (
	mid SERIAL PRIMARY KEY,
	publication_date TIMESTAMP NOT NULL,
	title VARCHAR(100) NOT NULL,
	description VARCHAR(1000) NOT NULL,
	total_vacancies INT NOT NULL CHECK (total_vacancies > 0),
	occupied_vacancies INT NOT NULL CHECK (occupied_vacancies >= 0 AND occupied_vacancies <= total_vacancies), -- Cached counter
	location geography(Point, 4326),
	total_payment NUMERIC NOT NULL CHECK (total_payment >= 0), -- Cached sum of vacancy rewards
	status VARCHAR(30) NOT NULL CHECK (status IN (
		'OPENED',
		'CLOSED',
		'IN_PROGRESS',
		'REOPENED',
		'CANCELLING',
		'CANCELLED',
		'DELETED',
		'IN_DISPUTE',
		'FINISHED',
		'REPORTED')),
	completion_date TIMESTAMP,
	owner_id INT NOT NULL,
	FOREIGN KEY (owner_id) REFERENCES APP_USER(uid) ON DELETE CASCADE
);
CREATE UNIQUE INDEX unique_mission_owner_title ON mission (owner_id, LOWER(BTRIM(title)));
CREATE INDEX idx_mission_owner_publication_date ON mission (owner_id, publication_date DESC);
CREATE INDEX idx_mission_status_publication_date ON mission (status, publication_date DESC);
CREATE INDEX idx_mission_location ON mission USING GIST (location) WHERE location IS NOT NULL;

CREATE TABLE MISSION_PHOTO (
	id SERIAL PRIMARY KEY,
	mid INT NOT NULL,
	url TEXT NOT NULL,
	FOREIGN KEY (mid) REFERENCES MISSION(mid) ON DELETE CASCADE
);
CREATE INDEX idx_mission_photo_mid ON mission_photo (mid);

CREATE TABLE CONVERSATION (
	cid SERIAL PRIMARY KEY,
	type VARCHAR(20) NOT NULL CHECK (type IN ('private', 'mission', 'dispute')),
	mission_id INT UNIQUE,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	closed_at TIMESTAMP,
	FOREIGN KEY (mission_id) REFERENCES MISSION(mid) ON DELETE CASCADE
);

CREATE TABLE CONVERSATION_PARTICIPANT (
	conversation_id INT NOT NULL,
	user_id INT NOT NULL,
	joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	left_at TIMESTAMP,
	can_send BOOLEAN NOT NULL DEFAULT TRUE,
	history_until TIMESTAMP,
	last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (conversation_id, user_id),
	FOREIGN KEY (conversation_id) REFERENCES CONVERSATION(cid) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES APP_USER(uid) ON DELETE CASCADE
);
CREATE INDEX idx_conversation_participant_user ON conversation_participant (user_id, conversation_id);

CREATE TABLE CONVERSATION_MESSAGE (
	mid SERIAL PRIMARY KEY,
	conversation_id INT NOT NULL,
	sender_id INT NOT NULL,
	content VARCHAR(1000),
	attachment_url TEXT,
	attachment_type VARCHAR(20) CHECK (attachment_type IS NULL OR attachment_type IN ('image')),
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CHECK (
		LENGTH(TRIM(COALESCE(content, ''))) > 0
		OR attachment_url IS NOT NULL
	),
	FOREIGN KEY (conversation_id) REFERENCES CONVERSATION(cid) ON DELETE CASCADE,
	FOREIGN KEY (sender_id) REFERENCES APP_USER(uid) ON DELETE CASCADE
);
CREATE INDEX idx_conversation_message_conversation_mid ON conversation_message (conversation_id, mid DESC);
CREATE INDEX idx_conversation_message_sender ON conversation_message (sender_id);

CREATE TABLE REVIEW (
	id SERIAL PRIMARY KEY,
	comment VARCHAR(500),
	rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE MISSION_PARTICIPATION (
	id SERIAL PRIMARY KEY,
	mid INT NOT NULL,
	adventurer_id INT,
	title VARCHAR(50),
	description VARCHAR(500),
	monetary_reward NUMERIC NOT NULL CHECK (monetary_reward >= 0),
	amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0), -- Cached amount from the payment ledger
	payment_status VARCHAR(20) DEFAULT 'UNPAID' CHECK (payment_status IN (
		'UNPAID', 
		'PAID', 
		'PARTIALLY_PAID', 
		'PARTIALLY_REFUNDED',
		'LIQUIDATED', 
		'REFUNDED'
		)),
	status VARCHAR(20) NOT NULL DEFAULT 'EMPTY' CHECK (status IN (
		'EMPTY',
		'JOINED',
		'PENDING_PAYMENT',
		'IN_PROGRESS',
		'SUBMITTED',
		'ACCEPTED',
		'REJECTED',
		'IN_DISPUTE',
		'RELEASED'
	)),
	owner_review_id INT UNIQUE,
	adventurer_review_id INT UNIQUE,
	UNIQUE (id, mid), -- Supports the payment composite foreign key
	FOREIGN KEY (mid) REFERENCES MISSION(mid) ON DELETE CASCADE,
	FOREIGN KEY (adventurer_id) REFERENCES APP_USER(uid) ON DELETE CASCADE,
	FOREIGN KEY (owner_review_id) REFERENCES REVIEW(id) ON DELETE CASCADE,
	FOREIGN KEY (adventurer_review_id) REFERENCES REVIEW(id) ON DELETE CASCADE
);
CREATE INDEX idx_mission_participation_mid ON mission_participation (mid);
CREATE INDEX idx_mission_participation_adventurer ON mission_participation (adventurer_id, mid) WHERE adventurer_id IS NOT NULL;
CREATE UNIQUE INDEX unique_mission_adventurer ON mission_participation (mid, adventurer_id) WHERE adventurer_id IS NOT NULL;

CREATE TABLE MISSION_PAYMENT (
	pid SERIAL PRIMARY KEY,
	mid INT NOT NULL,
	vacancy_id INT NOT NULL,
	sender_id INT NOT NULL,
	receiver_id INT NOT NULL,
	stripe_transaction_id VARCHAR(255) NOT NULL,
	transaction_type VARCHAR(255) NOT NULL CHECK (transaction_type IN(
		'INITIAL_FUNDING',
		'NEW_ADVENTURER_FUNDING',
		'NEGOTIATION_EXTRA',
		'NEGOTIATION_REFUND',
		'CANCELLATION_COMPENSATION',
		'BAN_COMPENSATION',
		'ADVENTURER_KICKED_OUT_COMPENSATION',
		'PAYOUT'
	)),
	amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
	amount_refunded NUMERIC NOT NULL CHECK (amount_refunded >= 0 AND amount_refunded <= amount_paid),
	status VARCHAR(25) NOT NULL DEFAULT 'SUCCEEDED' CHECK (status IN ('SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED')),
	created_at TIMESTAMP NOT NULL,
	FOREIGN KEY (vacancy_id, mid) REFERENCES MISSION_PARTICIPATION(id, mid) ON DELETE CASCADE,
	FOREIGN KEY (sender_id) REFERENCES APP_USER(uid) ON DELETE CASCADE,
	FOREIGN KEY (receiver_id) REFERENCES APP_USER (uid) ON DELETE CASCADE
);
CREATE INDEX idx_mission_payment_vacancy_created_at ON mission_payment (vacancy_id, created_at DESC);


CREATE TABLE NOTIFICATION (
	nid SERIAL PRIMARY KEY,
	date TIMESTAMP NOT NULL,
	seen BOOLEAN NOT NULL DEFAULT FALSE,
	type VARCHAR(50) NOT NULL CHECK (type IN ('INVITATION', 'MISSION', 'REPORT')),
	kind VARCHAR(20) NOT NULL DEFAULT 'ACTIONABLE' CHECK (kind IN ('INFORMATIONAL', 'ACTIONABLE')),
	action VARCHAR(50) NOT NULL DEFAULT 'MISSION_INVITE' CHECK (action IN (
		'JOIN_REQUEST',
		'MISSION_INVITE',
		'PARTICIPATION_REVIEW',
		'PARTICIPATION_REJECTION_RESPONSE',
		'PARTICIPATION_APPROVED',
		'PARTICIPATION_REJECTED',
		'PARTICIPATION_DISPUTED',
		'MISSION_EDIT',
		'MISSION_CLOSE', --- Mission has been closed for adventurers, but its not payed
		'MISSION_START', --- Mission has been payed, so it starts
		'MISSION_UNJOIN',
		'MISSION_DELETE',
		'MISSION_CANCEL',
		'MISSION_REOPEN',
		'ADVENTURER_REPORT',
		'REVIEW_DISPUTE',
		'REJECTED_REVIEW_DISPUTE',
		'MISSION_BAN',
		'USER_BAN',
		'ADVENTURER_KICKED_OUT',
		'REPORT_DISMISSED'
	)),
	status VARCHAR(20) CHECK (status IS NULL OR status IN ('PENDING','ACCEPTED','REJECTED','DISPUTED')),
	message VARCHAR(500),
	sender_id INT NOT NULL,
	recipient_id INT NOT NULL,
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	FOREIGN KEY (sender_id) REFERENCES APP_USER(uid) ON DELETE CASCADE,
	FOREIGN KEY (recipient_id) REFERENCES APP_USER (uid) ON DELETE CASCADE
);

CREATE UNIQUE INDEX unique_pending_join_notification
	ON notification 
	(action, sender_id, recipient_id, (payload->>'associated_mission_id'), (payload->>'associated_vacancy_id'))
	WHERE status = 'PENDING' AND action IN ('JOIN_REQUEST', 'MISSION_INVITE'); -- Prevents duplicate actionable requests due to retries or double clicks
CREATE INDEX idx_notification_recipient_date ON notification (recipient_id, date DESC);
CREATE INDEX idx_notification_action_status_vacancy ON notification (action, status, ((payload->>'associated_vacancy_id')::int));
CREATE INDEX idx_notification_action_status_mission_sender ON notification (action, status, ((payload->>'associated_mission_id')::int), sender_id);
CREATE INDEX idx_notification_action_status_date ON notification (action, status, date DESC);

CREATE TABLE REPORT (
	rid SERIAL PRIMARY KEY,
	date TIMESTAMP NOT NULL,
	sender_id INT NOT NULL,
	message VARCHAR(1000) NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'ANSWERED')),
	type VARCHAR(255) NOT NULL CHECK (type IN(
		'REPORT_PROFILE',
		'REPORT_MISSION',
		'REPORT_ADVENTURER',
		'REVIEW_DISPUTE',
		'REJECTED_REVIEW_DISPUTE'
	)),
	decision VARCHAR(255) CHECK (decision IN(
		'BAN_USER', 
		'BAN_MISSION', 
		'KICK_ADVENTURER_OUT', 
		'ACCEPT_ADVENTURERS_WORK', 
		'REJECT_ADVENTURERS_WORK',
		'DISMISS')),
	decision_reason VARCHAR(1000),
	resolved_by INT,
	conversation_id INT UNIQUE,
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	FOREIGN KEY (sender_id) REFERENCES APP_USER(uid) ON DELETE CASCADE,
	FOREIGN KEY (resolved_by) REFERENCES APP_USER(uid) ON DELETE CASCADE,
	FOREIGN KEY (conversation_id) REFERENCES CONVERSATION(cid) ON DELETE SET NULL
);
CREATE UNIQUE INDEX unique_active_profile_report
	ON report (sender_id, (payload->>'associated_user_id'))
	WHERE status = 'SENT' AND type = 'REPORT_PROFILE';
CREATE UNIQUE INDEX unique_active_mission_report
	ON report (sender_id, (payload->>'associated_mission_id'))
	WHERE status = 'SENT' AND type = 'REPORT_MISSION';
CREATE UNIQUE INDEX unique_active_vacancy_report
	ON report (sender_id, type, (payload->>'associated_mission_id'), (payload->>'associated_vacancy_id'))
	WHERE status = 'SENT' AND type IN ('REPORT_ADVENTURER', 'REVIEW_DISPUTE', 'REJECTED_REVIEW_DISPUTE');
CREATE INDEX idx_report_status_date ON report (status, date DESC);
CREATE INDEX idx_report_sender ON report (sender_id);

INSERT INTO app_user(username, email, firebase_uid, role, description, name, surnames, status)
VALUES('Hermyx_system', 'system@hermyx.com', 'firebase-system-uid', 'SYSTEM', 'Hermyx system account.', 'Hermyx', 'system', 'ACTIVE');
