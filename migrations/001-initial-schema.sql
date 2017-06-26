-- Up
CREATE TABLE settings (
  id integer PRIMARY KEY,
  total_flight_time INTEGER,
  uav_speed FLOAT,
  start_location_lat FLOAT,
  start_location_lng FLOAT,
  end_location_lat FLOAT,
  end_location_lng FLOAT);

-- Down
DROP TABLE settings



