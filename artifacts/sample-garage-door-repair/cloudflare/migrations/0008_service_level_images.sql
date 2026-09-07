-- Keep every service page paired with its reviewed, service-specific image.
UPDATE garage_content
SET image_url = '/images/curated/service-repair-cumming.jpg',
    image_alt = 'Garage door technician inspecting a white sectional door at a brick Cumming-area home',
    media_metadata_json = '{"sourceUrl":"original-generated-asset","license":"Original generated asset for Cumming Garage Door Service","attribution":"Cumming Garage Door Service","representative":true}'
WHERE kind = 'service' AND slug = 'garage-door-repair';

UPDATE garage_content
SET image_url = '/images/curated/service-spring-cumming.jpg',
    image_alt = 'Technician replacing the torsion spring assembly mounted above a residential sectional garage door',
    media_metadata_json = '{"sourceUrl":"original-generated-asset","license":"Original generated asset for Cumming Garage Door Service","attribution":"Cumming Garage Door Service","representative":true}'
WHERE kind = 'service' AND slug = 'broken-spring-replacement';

UPDATE garage_content
SET image_url = '/images/curated/service-cable-track-cumming.jpg',
    image_alt = 'Technician repairing a displaced roller, track, and loose lift cable on a crooked sectional door',
    media_metadata_json = '{"sourceUrl":"original-generated-asset","license":"Original generated asset for Cumming Garage Door Service","attribution":"Cumming Garage Door Service","representative":true}'
WHERE kind = 'service' AND slug = 'cable-roller-off-track-repair';

UPDATE garage_content
SET image_url = '/images/curated/service-opener-cumming.jpg',
    image_alt = 'Technician servicing a ceiling-mounted opener in a Cumming-area attached garage',
    media_metadata_json = '{"sourceUrl":"original-generated-asset","license":"Original generated asset for Cumming Garage Door Service","attribution":"Cumming Garage Door Service","representative":true}'
WHERE kind = 'service' AND slug = 'garage-door-opener-repair-installation';

UPDATE garage_content
SET image_url = '/images/curated/service-installation-cumming.jpg',
    image_alt = 'Installers fitting a new white sectional garage door at a brick Cumming-area home',
    media_metadata_json = '{"sourceUrl":"original-generated-asset","license":"Original generated asset for Cumming Garage Door Service","attribution":"Cumming Garage Door Service","representative":true}'
WHERE kind = 'service' AND slug = 'new-garage-door-installation';

UPDATE garage_content
SET image_url = '/images/curated/service-maintenance-cumming.jpg',
    image_alt = 'Technician lubricating and inspecting rollers, hinges, track, and fasteners during a garage-door tune-up',
    media_metadata_json = '{"sourceUrl":"original-generated-asset","license":"Original generated asset for Cumming Garage Door Service","attribution":"Cumming Garage Door Service","representative":true}'
WHERE kind = 'service' AND slug = 'garage-door-maintenance-tune-ups';

UPDATE garage_content
SET image_url = '/images/curated/service-commercial-cumming.jpg',
    image_alt = 'Small Cumming-area light-industrial building with commercial sectional overhead doors',
    media_metadata_json = '{"sourceUrl":"original-generated-asset","license":"Original generated asset for Cumming Garage Door Service","attribution":"Cumming Garage Door Service","representative":true}'
WHERE kind = 'service' AND slug = 'commercial-garage-door-services';