-- Create resolution enum
CREATE TYPE public.ticket_resolution AS ENUM ('approved', 'rejected', 'partial', 'refund', 'exchange');

-- Add resolution column to tickets
ALTER TABLE public.tickets
ADD COLUMN resolution text DEFAULT NULL;