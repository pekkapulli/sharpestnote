CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(255) UNIQUE NOT NULL,
    backend_code VARCHAR(255) NOT NULL
);

CREATE TABLE user_access (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    unit_id INT NOT NULL,
    has_access BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);