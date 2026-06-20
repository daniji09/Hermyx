-- Tables deletion
DROP TABLE IF EXISTS GUILD_MISSION;
DROP TABLE IF EXISTS GUILD_MEMBER;
DROP TABLE IF EXISTS MISSION_PARTICIPATION;
DROP TABLE IF EXISTS INVITATION;
DROP TABLE IF EXISTS TAG;
DROP TABLE IF EXISTS PAYMENT_METHOD;
DROP TABLE IF EXISTS ROLE; 
DROP TABLE IF EXISTS MISSION;
DROP TABLE IF EXISTS GUILD;
DROP TABLE IF EXISTS APP_USER;

-- Special options creation
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Tables creation
CREATE TABLE APP_USER (
	uid SERIAL PRIMARY KEY,
	username VARCHAR(20) NOT NULL UNIQUE,
	email VARCHAR(100) UNIQUE,
	firebase_uid VARCHAR(255) NOT NULL UNIQUE,
	google_account VARCHAR(255),
	description VARCHAR(500),
	name VARCHAR(50),
	surnames VARCHAR(100),
	location VARCHAR(300),
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
	difficulty INT NOT NULL,
	total_vacancies INT NOT NULL,
	occupied_vacancies INT NOT NULL,
	monetary_reward NUMERIC NOT NULL,
	status VARCHAR(20) NOT NULL CHECK (status IN ('draft','pending_payment',
    'funded',
    'in_progress',
    'delivered',
    'accepted',
    'releasing',
    'released',
	'partially_released',
    'refunding',
    'refunded',
    'canceled',
    'in_dispute')),
	owner_id INT NOT NULL,
	stripe_pi_id VARCHAR(255),
  	stripe_refund_id VARCHAR(255),
	FOREIGN KEY (owner_id) REFERENCES APP_USER(uid)
);

CREATE TABLE MISSION_PARTICIPATION (
	mid INT NOT NULL,
	adventurer_id INT NOT NULL,
	transfer_id VARCHAR(255),
  	amount_paid NUMERIC,
	FOREIGN KEY (mid) REFERENCES MISSION(mid),
	FOREIGN KEY (adventurer_id) REFERENCES APP_USER(uid),
	PRIMARY KEY (mid, adventurer_id)
);

CREATE TABLE INVITATION (
	iid SERIAL PRIMARY KEY,
	date TIMESTAMP NOT NULL,
	type VARCHAR(50) NOT NULL CHECK (type IN ('applicant_to_adventurer','adventurer_to_applicant')),
	status VARCHAR(20) NOT NULL CHECK (status IN ('pending','accepted','rejected')),
	sender_id INT NOT NULL,
	recipient_id INT NOT NULL,
	associated_mission_id INT NOT NULL,
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
