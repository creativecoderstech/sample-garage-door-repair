CREATE TABLE IF NOT EXISTS garage_content (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('page','service','location','article','faq','project','trust')),
  slug TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  before_image_url TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  service_code TEXT NOT NULL DEFAULT '',
  reviewed_seed INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_seed IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kind, slug)
);
CREATE INDEX IF NOT EXISTS garage_content_status_sort ON garage_content(status, sort_order);
CREATE INDEX IF NOT EXISTS garage_content_parent ON garage_content(parent_id);

INSERT OR IGNORE INTO garage_content
(id,kind,slug,title,summary,body,seo_title,seo_description,parent_id,sort_order,status,verification_status,featured,service_code)
VALUES
('page-home','page','home','Garage Door Trouble? Start Here.','Practical guidance for garage-door problems, with a clear path to request an assessment.','Learn warning signs, safe troubleshooting boundaries, and how to prepare for an assessment. Business identity, coverage, pricing, and availability remain unconfirmed.','Garage Door Trouble? Start Here.','Practical guidance for garage-door problems, with a clear path to request an assessment.',NULL,10,'published','unverified',1,''),
('page-services','page','services','Garage Door Service Guides','Educational overviews of common repair and replacement categories.','These guides explain symptoms and useful questions. They do not claim that a particular business offers a service or has parts or appointments available.','Garage Door Service Guides','Educational garage-door service guides.',NULL,20,'published','unverified',0,''),
('page-service-area','page','service-area','Service-Area Planning','How to confirm coverage before relying on a garage-door provider.','Coverage is unconfirmed. Share the exact address and wait for confirmation before assuming travel area, timing, or availability.','Garage Door Service-Area Planning','Coverage confirmation guidance.',NULL,30,'published','unverified',0,''),
('page-about','page','about','How to Evaluate a Garage Door Provider','A checklist for comparing safety, diagnosis, documentation, and communication.','Ask who performs the work, how high-tension parts are handled, when pricing is approved, and what written terms apply. Verify credentials directly.','Evaluate a Garage Door Provider','Questions for evaluating a provider.',NULL,40,'published','unverified',0,''),
('page-blog','page','blog','Garage Door Safety Library','Original homeowner education about inspection and troubleshooting boundaries.','Read practical articles that help you observe symptoms without handling springs, cables, bottom brackets, or unstable doors.','Garage Door Safety Library','Original homeowner safety articles.',NULL,50,'published','unverified',0,''),
('page-contact','page','contact','Prepare a Service Request','Gather useful details without treating a request as a confirmed appointment.','Note symptoms, door position, and visible damage from a safe location. A request requires review and does not confirm coverage, price, or timing.','Prepare a Garage Door Request','Information to gather for a request.',NULL,60,'published','unverified',0,''),
('page-gallery','page','gallery','Project Planning Gallery','Representative project concepts and assessment topics.','Examples are educational planning material, not evidence of work completed by a particular business.','Garage Door Planning Gallery','Representative educational project concepts.',NULL,70,'published','unverified',0,''),
('page-faqs','page','faqs','Garage Door FAQs','Safety-first answers to common homeowner questions.','For a crooked, hanging, off-track, unusually heavy, spring-damaged, or cable-damaged door, stop using it and keep the area clear.','Garage Door FAQs','Safety-first garage-door answers.',NULL,80,'published','unverified',0,''),
('service-spring','service','broken-spring','Broken Spring Safety Guide','Recognize likely spring failure and avoid high-tension hazards.','A loud bang, spring gap, or suddenly heavy door may indicate failure. Do not touch springs, cables, or bottom brackets or force the door.','Broken Spring Safety Guide','Educational spring safety guidance.','page-services',110,'published','unverified',1,'broken-spring'),
('service-opener','service','opener-diagnostics','Opener and Sensor Diagnostics','Separate simple observations from adjustments requiring expertise.','Check power, remote batteries, and obvious obstructions. Never bypass sensors or increase force to overcome resistance.','Opener and Sensor Guide','Educational opener diagnostics.','page-services',120,'published','unverified',0,'opener-diagnostics'),
('service-track','service','off-track-door','Off-Track Door Safety Guide','What to do when rollers leave the track or a door hangs unevenly.','Stop operating the door and keep the area clear. Do not loosen hardware, pull cables, or force rollers into place.','Off-Track Door Safety','Educational off-track door guidance.','page-services',130,'published','unverified',1,'off-track-door'),
('service-hardware','service','cables-rollers-hinges','Cables, Rollers, and Hinges','Understand hardware that supports controlled travel.','Observe damage from a safe distance. Cables and bottom fixtures can remain under dangerous tension even when the door is closed.','Garage Door Hardware Guide','Educational hardware safety guidance.','page-services',140,'published','unverified',0,'cables-rollers-hinges'),
('service-replacement','service','door-replacement-planning','Door Replacement Planning','Compare condition, insulation, fit, safety, and design.','Have a qualified provider verify measurements, spring sizing, hardware, and written terms. Products and installation availability are unconfirmed.','Door Replacement Planning','Educational replacement planning.','page-services',150,'published','unverified',0,'door-replacement-planning'),
('location-atlanta','location','atlanta','Atlanta Coverage Guidance','Coverage is explicitly unconfirmed.','Ask the business to verify the exact Atlanta ZIP code, travel limits, schedule, and terms.','Atlanta Coverage Guidance','Atlanta coverage remains unconfirmed.','page-service-area',210,'published','unverified',0,''),
('location-marietta','location','marietta','Marietta Coverage Guidance','Coverage is explicitly unconfirmed.','Submit the Marietta address and wait for direct coverage and timing confirmation.','Marietta Coverage Guidance','Marietta coverage remains unconfirmed.','page-service-area',220,'published','unverified',0,''),
('location-decatur','location','decatur','Decatur Coverage Guidance','Coverage is explicitly unconfirmed.','A city name does not establish a service boundary; confirm the exact Decatur address.','Decatur Coverage Guidance','Decatur coverage remains unconfirmed.','page-service-area',230,'published','unverified',0,''),
('location-alpharetta','location','alpharetta','Alpharetta Coverage Guidance','Coverage is explicitly unconfirmed.','Confirm travel area, timing, and pricing for the exact Alpharetta address.','Alpharetta Coverage Guidance','Alpharetta coverage remains unconfirmed.','page-service-area',240,'published','unverified',0,''),
('article-balance','article','why-door-balance-matters','Why Garage Door Balance Matters','Balance affects opener strain, movement, and safe inspection.','Rapid dropping, uneven travel, or unusual heaviness calls for assessment. Do not test balance when spring or cable damage is suspected.','Why Door Balance Matters','Garage-door balance safety education.','page-blog',310,'published','unverified',1,''),
('article-sensors','article','safe-sensor-observations','Safe Observations for Reversing Doors','Check obvious obstructions without bypassing safety systems.','Clear objects and gently clean accessible lenses. Never bypass sensors or raise force settings to make a door close.','Safe Sensor Observations','Safety guidance for reversing doors.','page-blog',320,'published','unverified',0,''),
('article-request','article','prepare-for-an-assessment','How to Prepare for an Assessment','Useful notes and photos can support a clearer diagnosis.','From a safe location, record symptoms, sounds, visible damage, door position, opener model, and when the issue began.','Prepare for a Garage Door Assessment','Safe assessment preparation.','page-blog',330,'published','unverified',0,''),
('faq-heavy','faq','door-feels-heavy','Why does the door feel unusually heavy?','A spring may not be supporting the door correctly.','Stop operating it. Do not lift it, pull the release, or handle springs and cables.','Heavy Garage Door FAQ','What to do when a door feels heavy.','page-faqs',410,'published','unverified',0,''),
('faq-reverses','faq','door-reverses','Why does the door reverse?','An obstruction, sensor issue, binding, or another fault may be involved.','Clear obvious objects and clean accessible lenses. Do not bypass sensors or change force settings.','Reversing Door FAQ','Safe observations for reversing doors.','page-faqs',420,'published','unverified',0,''),
('faq-manual','faq','manual-opening','When is manual opening unsafe?','It is unsafe when a door is unstable or high-tension parts may be damaged.','Do not pull the release under a partly open, crooked, heavy, spring-damaged, or cable-damaged door.','Manual Opening FAQ','When not to open a door manually.','page-faqs',430,'published','unverified',0,''),
('faq-price','faq','pricing-and-timing','Are price and arrival time confirmed?','No business-specific price, coverage, or timing is verified.','Diagnosis, options, coverage, and scheduling require confirmation. A request is not an appointment.','Pricing and Timing FAQ','Garage-door pricing and timing confirmation.','page-faqs',440,'published','unverified',0,''),
('project-insulated','project','insulated-door-concept','Insulated Door Planning Concept','Representative comparison of insulation, seals, hardware, and fit.','This is a planning example, not a claim of completed work.','Insulated Door Planning','Representative door planning concept.','page-gallery',510,'published','unverified',1,''),
('project-opener','project','opener-layout-concept','Opener Layout Planning Concept','Representative review of headroom, power, controls, and sensors.','This example does not claim product availability or completed work.','Opener Layout Planning','Representative opener planning concept.','page-gallery',520,'published','unverified',0,''),
('project-hardware','project','hardware-renewal-concept','Hardware Renewal Planning Concept','Representative review of matched rollers, hinges, cables, and balance.','Educational material, not a portfolio claim. High-tension hardware requires trained handling.','Hardware Renewal Planning','Representative hardware planning concept.','page-gallery',530,'published','unverified',0,''),
('trust-identity','trust','business-identity','Business identity','Awaiting owner verification.','Business name, ownership, address, and contact channels are not verified.','Business Identity','Unpublished pending verification.',NULL,610,'draft','unverified',0,''),
('trust-credentials','trust','credentials','Credentials and insurance','Awaiting owner verification.','Licensing, insurance, training, and affiliations are not verified.','Credentials','Unpublished pending verification.',NULL,620,'draft','unverified',0,''),
('trust-warranty','trust','warranty','Warranty terms','Awaiting owner verification.','No warranty, guarantee, or refund terms are confirmed.','Warranty Terms','Unpublished pending verification.',NULL,630,'draft','unverified',0,''),
('trust-hours','trust','hours-and-availability','Hours and availability','Awaiting owner verification.','Hours, urgent response, timing, and coverage are not confirmed.','Hours and Availability','Unpublished pending verification.',NULL,640,'draft','unverified',0,'');

INSERT OR IGNORE INTO garage_content
(id,kind,slug,title,summary,body,seo_title,seo_description,parent_id,sort_order,status,verification_status,featured,service_code)
VALUES
('service-maintenance','service','maintenance-inspection','Maintenance and Inspection Guide','Plan periodic observation and professional safety checks without handling tensioned hardware.','Watch for new noises, uneven travel, damaged weather seals, frayed cables, or loose visible parts without touching them. A qualified provider can assess balance, hardware, safety reversal, and lubrication needs.','Maintenance and Inspection Guide','Educational garage-door maintenance guidance.','page-services',160,'published','unverified',0,'maintenance');

UPDATE garage_content
SET reviewed_seed=1,
    image_url='/images/garage/hero-door-forward.jpg',
    image_alt='Representative residential garage door',
    body=body || char(10) || char(10) ||
      'Before contacting a provider, record the door position, visible symptoms, and any unusual sounds from a safe distance. Do not stand beneath a moving or unstable door.' ||
      char(10) || char(10) ||
      'Coverage, scheduling, products, pricing, credentials, and written terms must be confirmed directly by the business; submitting a request does not create an appointment.';

UPDATE garage_content SET service_code='springs' WHERE id='service-spring';
UPDATE garage_content SET service_code='opener' WHERE id='service-opener';
UPDATE garage_content SET service_code='repair' WHERE id IN ('service-track','service-hardware');
UPDATE garage_content SET service_code='installation' WHERE id='service-replacement';