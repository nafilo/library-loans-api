-- Opsional: data fiktif agar filter semua status bisa langsung didemokan.
insert into public.loans
  (id, member_code, member_name, book_code, book_title, loan_date, due_date, return_date, status, notes)
values
  ('11111111-1111-4111-8111-111111111111', 'AGT-001', 'Nadia Contoh', 'BK-001', 'Dasar Pemrograman JavaScript', '2026-10-01', '2026-10-08', null, 'Dipinjam', 'Data contoh responsi'),
  ('22222222-2222-4222-8222-222222222222', 'AGT-002', 'Bima Contoh', 'BK-002', 'Belajar REST API', '2026-09-15', '2026-09-22', null, 'Terlambat', 'Data contoh filter status'),
  ('33333333-3333-4333-8333-333333333333', 'AGT-001', 'Nadia Contoh', 'BK-003', 'Basis Data PostgreSQL', '2026-09-20', '2026-09-27', '2026-09-25', 'Dikembalikan', null)
on conflict (id) do nothing;
