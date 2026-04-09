
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  ticket_code text NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'admin',
  recipient_email text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read notifications"
  ON public.notifications FOR SELECT
  USING (true);

CREATE POLICY "Allow public update notifications"
  ON public.notifications FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_notifications_recipient_type ON public.notifications(recipient_type);
CREATE INDEX idx_notifications_recipient_email ON public.notifications(recipient_email);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
