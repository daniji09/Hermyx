-- Tables deletion
DROP TABLE IF EXISTS GUILD_MISSION;
DROP TABLE IF EXISTS GUILD_MEMBER;
DROP TABLE IF EXISTS NOTIFICATION;
DROP TABLE IF EXISTS INVITATION;
DROP TABLE IF EXISTS MISSION_PARTICIPATION;
DROP TABLE IF EXISTS TAG;
DROP TABLE IF EXISTS PAYMENT_METHOD;
DROP TABLE IF EXISTS ROLE; 
DROP TABLE IF EXISTS MISSION;
DROP TABLE IF EXISTS GUILD;
DROP TABLE IF EXISTS APP_USER;

-- Special options creation
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tables creation
CREATE TABLE APP_USER (
	uid SERIAL PRIMARY KEY,
	username VARCHAR(20) NOT NULL UNIQUE,
	email VARCHAR(100) UNIQUE,
	firebase_uid VARCHAR(255) NOT NULL UNIQUE,
	description VARCHAR(500),
	name VARCHAR(50),
	surnames VARCHAR(100),
	location geography(Point, 4326),
	avatar VARCHAR(255),
	configuration JSONB NOT NULL DEFAULT '{"show_missions_to_others": true}'::jsonb,
	stripe_customer_id VARCHAR(255),
  	stripe_connected_id VARCHAR(255)
);

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
	total_vacancies INT NOT NULL,
	occupied_vacancies INT NOT NULL,
	location geography(Point, 4326),
	total_payment NUMERIC NOT NULL,
	status VARCHAR(20) NOT NULL CHECK (status IN (
		'DRAFT',
		'OPENED',
		'PENDING_PAYMENT',
		'IN_PROGRESS',
		'REOPENED',
		'CANCELLING',
		'CANCELLED',
		'DELETED',
		'IN_DISPUTE',
		'FINISHED')),
	completion_date TIMESTAMP,
	owner_id INT NOT NULL,
	stripe_pi_id VARCHAR(255),
  	stripe_refund_id VARCHAR(255),
	FOREIGN KEY (owner_id) REFERENCES APP_USER(uid)
);

CREATE TABLE MISSION_PARTICIPATION (
	id SERIAL PRIMARY KEY,
	mid INT NOT NULL,
	adventurer_id INT,
  	monetary_reward NUMERIC NOT NULL,
	title VARCHAR(50),
	description VARCHAR(500),
	transfer_id VARCHAR(255),
  	amount_paid NUMERIC,
	status VARCHAR(20) NOT NULL DEFAULT 'joined' CHECK (status IN (
		'EMPTY',
		'JOINED',
		'IN_PROGRESS',
		'SUBMITTED',
		'ACCEPTED',
		'REJECTED',
		'IN_DISPUTE',
		'RELEASING',
		'RELEASED'
	)),
	review VARCHAR(500),
	FOREIGN KEY (mid) REFERENCES MISSION(mid),
	FOREIGN KEY (adventurer_id) REFERENCES APP_USER(uid)
);

CREATE TABLE NOTIFICATION (
	nid SERIAL PRIMARY KEY,
	date TIMESTAMP NOT NULL,
	seen BOOLEAN NOT NULL DEFAULT FALSE,
	type VARCHAR(50) NOT NULL CHECK (type IN ('invitation', 'mission')),
	kind VARCHAR(20) NOT NULL DEFAULT 'actionable' CHECK (kind IN ('informational', 'actionable')),
	action VARCHAR(50) NOT NULL DEFAULT 'mission_invite' CHECK (action IN (
		'join_request',
		'mission_invite',
		'participation_review',
		'participation_rejection_response',
		'participation_approved',
		'participation_disputed'
	)),
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	status VARCHAR(20) CHECK (status IS NULL OR status IN ('pending','accepted','rejected','disputed')),
	message VARCHAR(500),
	sender_id INT NOT NULL,
	recipient_id INT NOT NULL,
	associated_mission_id INT NOT NULL,
	associated_vacancy_id INT,
	FOREIGN KEY (sender_id) REFERENCES APP_USER(uid),
	FOREIGN KEY (recipient_id) REFERENCES APP_USER (uid),
	FOREIGN KEY (associated_mission_id) REFERENCES MISSION(mid)
);

CREATE TABLE GUILD (
	gid SERIAL PRIMARY KEY,
	name VARCHAR(30) NOT NULL,
	description VARCHAR(500) NOT NULL,
	country VARCHAR(200) NOT NULL,
	xp INT NOT NULL
);

CREATE TABLE TAG (
	gid INT NOT NULL,
	tag VARCHAR(20) NOT NULL,
	FOREIGN KEY (gid) REFERENCES GUILD(gid),
	PRIMARY KEY (gid, tag)
);

CREATE TABLE ROLE(
	gid INT NOT NULL,
	role VARCHAR(20),
	FOREIGN KEY (gid) REFERENCES GUILD(gid),
	PRIMARY KEY (gid, role)	
);

CREATE TABLE GUILD_MEMBER (
	uid INT NOT NULL,
	gid INT NOT NULL,
	xp INT NOT NULL,
	role VARCHAR(20) NOT NULL,
	FOREIGN KEY (uid) REFERENCES APP_USER(uid),
	FOREIGN KEY (gid) REFERENCES GUILD(gid),
	FOREIGN KEY (gid, role) REFERENCES ROLE(gid, role),
	PRIMARY KEY (uid, gid)
);

CREATE TABLE GUILD_MISSION (
	gid INT NOT NULL,
	mid INT NOT NULL,
	FOREIGN KEY (gid) REFERENCES GUILD(gid),
	FOREIGN KEY (mid) REFERENCES MISSION(mid),
	PRIMARY KEY (gid, mid)
);
