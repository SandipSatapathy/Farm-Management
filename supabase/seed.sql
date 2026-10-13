-- Seed Data for Labour & Farm Operations Management System
-- Farm: 'Greenfield Agri Farms' (Nashik, Maharashtra)
-- Financial Year: FY 2026-27

insert into public.farms (id, name, address, currency_code, timezone, financial_year_start_month, financial_year_start_day)
values (
  '11111111-1111-1111-1111-111111111111',
  'Greenfield Agro Farms',
  'Survey No. 42, Dindori Road, Nashik, Maharashtra 422004',
  'INR',
  'Asia/Kolkata',
  4,
  1
) on conflict (id) do nothing;

-- Labourers Seed
insert into public.labourers (id, farm_id, labour_code, full_name, phone, work_category, wage_basis, base_rate, is_active)
values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'LAB-001', 'Ramesh Jadhav', '9822012345', 'Harvester / Field Hand', 'daily', 550.00, true),
  ('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'LAB-002', 'Sunita Patil', '9822054321', 'Weeding & Pruning', 'daily', 450.00, true),
  ('a1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'LAB-003', 'Kailash Shinde', '9822098765', 'Irrigation & Spraying', 'daily', 600.00, true),
  ('a1111111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'LAB-004', 'Mangala Pawar', '9822011223', 'Sorting & Packing', 'daily', 450.00, true),
  ('a1111111-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'LAB-005', 'Ganesh More', '9822033445', 'Tractor Operator & Mechanic', 'daily', 700.00, true)
on conflict (id) do nothing;

-- Machinery Seed
insert into public.machinery (id, farm_id, asset_code, name, asset_type, ownership_type, registration_reference, make, model, meter_type, initial_meter, is_active)
values
  ('m1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'TRC-01', 'Mahindra 575 DI (Red)', 'tractor', 'owned', 'MH-15-AB-4021', 'Mahindra', '575 DI Sarpanch', 'hour_meter', 1240.50, true),
  ('m1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'TRC-02', 'John Deere 5050D', 'tractor', 'owned', 'MH-15-CD-8910', 'John Deere', '5050D PowerPro', 'hour_meter', 820.00, true),
  ('m1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'HRV-01', 'Kubota Combine Harvester', 'harvester', 'hired', 'KA-04-E-1234', 'Kubota', 'DC-68G', 'hour_meter', 450.00, true)
on conflict (id) do nothing;
