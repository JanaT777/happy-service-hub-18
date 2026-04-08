
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Tickets table for reminder tracking
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  order_number text,
  status text NOT NULL DEFAULT 'new',
  request_type text NOT NULL DEFAULT 'other',
  description text,
  needs_info_since timestamptz,
  needs_info_message text,
  reminders_sent integer NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reminder log
CREATE TABLE public.ticket_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  ticket_code text NOT NULL,
  reminder_number integer NOT NULL,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_reminder_log ENABLE ROW LEVEL SECURITY;

-- Public read for tickets (no auth yet)
CREATE POLICY "Allow public read tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tickets" ON public.tickets FOR UPDATE USING (true) WITH CHECK (true);

-- Public read for reminder log
CREATE POLICY "Allow public read reminder_log" ON public.ticket_reminder_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert reminder_log" ON public.ticket_reminder_log FOR INSERT WITH CHECK (true);
