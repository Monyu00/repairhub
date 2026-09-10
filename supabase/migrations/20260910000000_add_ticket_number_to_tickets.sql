-- Add generated ticket_number text column to allow searching by ticket ID in PostgREST
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number text GENERATED ALWAYS AS (id::text) STORED;

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets (ticket_number);
