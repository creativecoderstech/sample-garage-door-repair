PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_garage_production.sql','2026-09-03 13:11:52');
CREATE TABLE business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE services (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  starting_price INTEGER NOT NULL,
  duration TEXT NOT NULL,
  emergency INTEGER NOT NULL DEFAULT 0 CHECK (emergency IN (0, 1)),
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1))
);
INSERT INTO "services" ("id","slug","name","description","starting_price","duration","emergency","verified") VALUES(1,'broken-spring','Broken Spring Repair','High-cycle spring replacement with a complete safety inspection.',189,'60–90 min',1,0);
INSERT INTO "services" ("id","slug","name","description","starting_price","duration","emergency","verified") VALUES(2,'opener-repair','Opener Repair & Installation','Quiet smart openers, remotes, keypads, sensors, gears, and motor diagnostics.',149,'60–120 min',0,0);
INSERT INTO "services" ("id","slug","name","description","starting_price","duration","emergency","verified") VALUES(3,'off-track-door','Off-Track Door Rescue','Safe realignment of rollers, tracks, and cables before more damage occurs.',169,'60–90 min',1,0);
INSERT INTO "services" ("id","slug","name","description","starting_price","duration","emergency","verified") VALUES(4,'new-door','New Garage Door Installation','Insulated steel, carriage-house, and modern glass doors measured and installed precisely.',1299,'4–6 hours',0,0);
INSERT INTO "services" ("id","slug","name","description","starting_price","duration","emergency","verified") VALUES(5,'cable-roller','Cable, Roller & Hinge Repair','Restore smooth, quiet travel with matched hardware and professional balancing.',129,'45–90 min',1,0);
INSERT INTO "services" ("id","slug","name","description","starting_price","duration","emergency","verified") VALUES(6,'maintenance','Safety Tune-Up','A 25-point inspection, balance test, lubrication, and safety-reversal verification.',89,'45 min',0,0);
CREATE TABLE service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  street_address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'GA',
  zip TEXT NOT NULL,
  service TEXT NOT NULL,
  urgency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE rate_limits (
  rate_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (rate_key, window_start)
);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788441360,2);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:3824cde32825e5583b2cadc184b82e827608e55d06d443223bb8c475866779a3',1788441360,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('assistant:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788441000,3);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788445860,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:1ddcd730a0d8d8d7c0366d17db459e44c367a0d5a23ef6826ef62f82f7dfb9ec',1788446640,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:0c0c013235f26adf533a2d24ff3a82aa2a2e9c29daedcb5aeb3fbbb8b9dfe7aa',1788448380,2);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:0c0c013235f26adf533a2d24ff3a82aa2a2e9c29daedcb5aeb3fbbb8b9dfe7aa',1788448440,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788455460,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:2b9b8bbc5ea731b0884ffd8102df387babd4f531eb899821bc1b7e4d7a722988',1788460620,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:3f4f3ef764993ed100cca1675e70ae5b49221fe70186658667eeaf93c3b9df00',1788460740,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788461220,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788461460,3);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788461700,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788462780,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:fe0fb8aec8805f58eaf32a5dad7ad330686e4b3e9360477b9b4f59ffae1184d8',1788463020,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788463080,3);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:ae89ca391707c234be46ace7b9f67572687e8cf822f7b1728bc328604a390b78',1788463140,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:b6dbd97653e4bf8fc0a7e853b3f420fb50eac2191ab6313ad31e4ef0247ff33a',1788463140,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788463200,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:4618f59076dd9d1df3a1c9215f0ac23acc66736fb46490853fbd72d8535ebd92',1788463380,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788463500,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:99f8dc358d037755869d3f554052ccb5800f2f0b9f93c2865248cec22e4e087b',1788463500,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788463560,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788464340,4);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('assistant:f346ecb39fb1be7fe857eaa03be156fd0454afbb1a44b169ea403afe3be6c7f6',1788464400,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:77e119c3a54b5f9da5ba2ffcb2fc2fc97913a090da9006d6767feb988e138dc8',1788467820,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:50471398392db32ebdd6b8d1471cc911f04bf6bd0fadd954dbf8746b3a9f13d2',1788478380,2);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:50471398392db32ebdd6b8d1471cc911f04bf6bd0fadd954dbf8746b3a9f13d2',1788478440,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('assistant:50471398392db32ebdd6b8d1471cc911f04bf6bd0fadd954dbf8746b3a9f13d2',1788478200,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:50471398392db32ebdd6b8d1471cc911f04bf6bd0fadd954dbf8746b3a9f13d2',1788478500,2);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:50471398392db32ebdd6b8d1471cc911f04bf6bd0fadd954dbf8746b3a9f13d2',1788478560,4);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:7d926defad45ed1c3a1e33db017da9af6724a0319e29c9d20b1f176ef6221880',1788480240,2);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:85e736413ccf9607908a8f486ebbd9b58eb3b321aa5775c18266e0f706840383',1788482820,2);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:7eb99a55ccae02582f93827f07f687a5f869baba813202de7c8b4ece25173496',1788497280,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:3400cfb959f093b1824976c2beea8927fd22b198e10d3e3a18f7b0a4e34da0e9',1788535200,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:487e87b13634234264170b8cec1c28a66c31c99645d824f10e9fbc69f0487d1b',1788601020,1);
INSERT INTO "rate_limits" ("rate_key","window_start","count") VALUES('analytics:1a9bbdd0a9a538fdf7b0e91e29842dd5b5210a75992a4bd9fe98c358503060be',1788603240,1);
CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(1,'iframe_referral','/','2026-09-03T13:16:38.727Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(2,'service_view','/','2026-09-03T13:16:44.193Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(3,'iframe_referral','/','2026-09-03T13:16:48.853Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(4,'iframe_referral','/admin','2026-09-03T14:31:21.803Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(5,'iframe_referral','/','2026-09-03T14:44:14.382Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(6,'iframe_referral','/','2026-09-03T15:13:44.388Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(7,'service_view','/','2026-09-03T15:13:47.653Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(8,'iframe_referral','/','2026-09-03T15:14:00.871Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(9,'iframe_referral','/admin','2026-09-03T17:11:00.977Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(10,'iframe_referral','/','2026-09-03T18:37:38.841Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(11,'iframe_referral','/','2026-09-03T18:39:30.412Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(12,'iframe_referral','/admin','2026-09-03T18:47:23.321Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(13,'iframe_referral','/admin','2026-09-03T18:51:03.787Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(14,'iframe_referral','/admin','2026-09-03T18:51:05.357Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(15,'iframe_referral','/admin','2026-09-03T18:51:06.297Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(16,'iframe_referral','/admin','2026-09-03T18:55:51.539Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(17,'iframe_referral','/admin','2026-09-03T19:13:19.181Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(18,'iframe_referral','/','2026-09-03T19:17:29.049Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(19,'iframe_referral','/admin','2026-09-03T19:18:10.312Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(20,'iframe_referral','/','2026-09-03T19:18:38.329Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(21,'booking_start','/','2026-09-03T19:18:51.534Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(22,'iframe_referral','/','2026-09-03T19:19:19.413Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(23,'iframe_referral','/','2026-09-03T19:19:20.414Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(24,'iframe_referral','/gallery','2026-09-03T19:20:19.984Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(25,'iframe_referral','/gallery','2026-09-03T19:23:52.760Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(26,'iframe_referral','/','2026-09-03T19:25:28.688Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(27,'iframe_referral','/contact','2026-09-03T19:25:33.469Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(28,'booking_start','/contact','2026-09-03T19:26:20.353Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(29,'iframe_referral','/','2026-09-03T19:39:08.903Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(30,'iframe_referral','/admin','2026-09-03T19:39:44.956Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(31,'iframe_referral','/admin','2026-09-03T19:39:50.872Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(32,'iframe_referral','/','2026-09-03T19:39:57.449Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(33,'iframe_referral','/admin','2026-09-03T20:37:03.873Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(34,'iframe_referral','/','2026-09-03T23:33:49.344Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(35,'service_view','/','2026-09-03T23:33:52.064Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(36,'booking_start','/','2026-09-03T23:34:06.005Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(37,'service_view','/','2026-09-03T23:35:45.039Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(38,'service_view','/','2026-09-03T23:35:58.810Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(39,'service_view','/','2026-09-03T23:36:01.689Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(40,'service_view','/','2026-09-03T23:36:26.086Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(41,'service_view','/','2026-09-03T23:36:28.640Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(42,'service_view','/','2026-09-03T23:36:31.290Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(43,'iframe_referral','/','2026-09-04T00:04:39.640Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(44,'service_view','/','2026-09-04T00:04:39.888Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(45,'iframe_referral','/','2026-09-04T00:47:16.183Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(46,'service_view','/','2026-09-04T00:47:16.406Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(47,'iframe_referral','/','2026-09-04T04:48:19.642Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(48,'iframe_referral','/','2026-09-04T15:20:02.213Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(49,'iframe_referral','/','2026-09-05T09:37:04.900Z');
INSERT INTO "analytics_events" ("id","event_name","path","created_at") VALUES(50,'iframe_referral','/','2026-09-05T10:14:42.860Z');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('analytics_events',50);
CREATE INDEX service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX service_requests_status ON service_requests(status);
CREATE INDEX rate_limits_expiry ON rate_limits(window_start);
CREATE INDEX analytics_events_created_at ON analytics_events(created_at DESC);
