-- Club inquiry form submissions from the landing page
CREATE TABLE club_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  programme_info TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'onboarded', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE club_inquiries ENABLE ROW LEVEL SECURITY;

-- Only admins can view inquiries (service role used for inserts from Server Action)
CREATE POLICY "Admins can view inquiries"
  ON club_inquiries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND active = true
  ));
