-- =======================================================
-- Digital OMS - Supabase Migration Schema
-- Instructions: Run this script in the Supabase SQL Editor.
-- =======================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'staff')) NOT NULL DEFAULT 'staff',
  status TEXT CHECK (status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Protect profiles with RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by authenticated users." ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    -- Make the first user an admin by default if needed, otherwise staff
    COALESCE(new.raw_user_meta_data->>'role', 'staff'),
    'active'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when auth.users is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  alternative_number TEXT,
  email TEXT,
  country TEXT,
  address TEXT,
  customer_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers viewable by authenticated users" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Customers insertable by authenticated users" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Customers updatable by authenticated users" ON customers FOR UPDATE USING (auth.role() = 'authenticated');

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  default_price NUMERIC,
  required_documents JSONB,
  internal_instruction TEXT,
  public_instruction TEXT,
  estimated_days INTEGER,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services viewable by authenticated users" ON services FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Services insertable by authenticated users" ON services FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Services updatable by authenticated users" ON services FOR UPDATE USING (auth.role() = 'authenticated');

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  service_name_snapshot TEXT NOT NULL,
  nepali_year INTEGER NOT NULL,
  nepali_month INTEGER NOT NULL,
  monthly_sequence INTEGER NOT NULL,
  final_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  extra_charge NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  order_status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('Normal', 'Urgent', 'Very Urgent')) DEFAULT 'Normal',
  source TEXT,
  assigned_to UUID REFERENCES profiles(id),
  deadline_date DATE,
  public_note TEXT,
  internal_note TEXT,
  tracking_token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Public tracking access rule
CREATE POLICY "Orders viewable by public using tracking token" ON orders FOR SELECT USING (true);
CREATE POLICY "Orders insertable by authenticated users" ON orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Orders updatable by authenticated users" ON orders FOR UPDATE USING (auth.role() = 'authenticated');

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  amount_received NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_id TEXT,
  payment_date DATE NOT NULL,
  screenshot_url TEXT,
  received_by UUID REFERENCES profiles(id),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payments viewable by public for tracking" ON payments FOR SELECT USING (true);
CREATE POLICY "Payments insertable by authenticated users" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Payments updatable by authenticated users" ON payments FOR UPDATE USING (auth.role() = 'authenticated');

-- Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  receipt_number TEXT UNIQUE NOT NULL,
  receipt_type TEXT DEFAULT 'Payment Received Slip',
  pdf_url TEXT,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Receipts viewable by public for tracking" ON receipts FOR SELECT USING (true);
CREATE POLICY "Receipts insertable by authenticated users" ON receipts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Order Files Table
CREATE TABLE IF NOT EXISTS order_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  visibility TEXT CHECK (visibility IN ('internal', 'public')) DEFAULT 'internal',
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE order_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Files viewable by public for tracking based on visibility" ON order_files FOR SELECT USING (visibility = 'public' OR auth.role() = 'authenticated');
CREATE POLICY "Files insertable by authenticated users" ON order_files FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Files deletable by authenticated users" ON order_files FOR DELETE USING (auth.role() = 'authenticated');

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs viewable by authenticated users" ON activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Logs insertable by authenticated users" ON activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Feature Settings Table
CREATE TABLE IF NOT EXISTS feature_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE feature_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings viewable by authenticated users" ON feature_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Settings updatable by admins" ON feature_settings FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System Settings viewable by authenticated users" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System Settings updatable by admins" ON system_settings FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =======================================================
-- Seeding Initial Settings Data
-- =======================================================
INSERT INTO feature_settings (feature_key, feature_name, is_enabled) VALUES
('staff_can_view_all_orders', 'Staff can view all orders', true),
('staff_can_delete_orders', 'Staff can delete orders', false),
('staff_can_edit_payment', 'Staff can edit payment', false),
('staff_can_create_services', 'Staff can create services', false),
('staff_can_assign_orders', 'Staff can assign orders', true),
('payment_screenshot_upload', 'Payment Screenshot Upload', true),
('receipt_generation', 'Receipt Generation', true),
('public_tracking_page', 'Public Tracking Page', true),
('final_file_public_download', 'Final File Public Download', true),
('document_upload_module', 'Document Upload Module', true),
('basic_reports', 'Basic Reports', true)
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value) VALUES
('company_info', '{"company_name": "Digital Solution Pvt. Ltd.", "pan_number": "000000000", "address": "Kathmandu, Nepal", "phone": "+977-9800000000", "email": "info@digitalsolution.dummy", "website": "www.digitalsolution.dummy"}'::jsonb),
('receipt_settings', '{"receipt_footer_note": "Thank you for doing business with us.", "receipt_terms": "Advance amounts are non-refundable."}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO services (service_name, category, default_price, status) VALUES
('International Driving Permit', 'Documentation', 5000, 'active'),
('Shram / Labour Permit Support', 'Documentation', 2000, 'active'),
('Social Security Fund Support', 'Documentation', 1000, 'active'),
('Police Clearance Certificate Support', 'Documentation', 1500, 'active'),
('National ID Support', 'Documentation', 500, 'active'),
('Passport / Online Form Support', 'Documentation', 800, 'active'),
('AI Training Registration', 'Training', 10000, 'active'),
('Digital Marketing Training Registration', 'Training', 15000, 'active')
ON CONFLICT DO NOTHING;

-- Supabase Storage Buckets
-- You will need to create buckets 'order_files' and 'receipts' manually or via API.
-- bucket: order_files
-- bucket: receipts
