-- Jalankan di SQL Editor proyek Supabase (sekali pada database baru).
begin;

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  member_code text not null check (char_length(btrim(member_code)) between 1 and 50),
  member_name text not null check (char_length(btrim(member_name)) between 1 and 150),
  book_code text not null check (char_length(btrim(book_code)) between 1 and 50),
  book_title text not null check (char_length(btrim(book_title)) between 1 and 250),
  loan_date date not null,
  due_date date not null,
  return_date date,
  status text not null default 'Dipinjam' check (status in ('Dipinjam', 'Dikembalikan', 'Terlambat')),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_due_date check (due_date >= loan_date),
  constraint valid_return_date check (return_date is null or return_date >= loan_date),
  constraint valid_return_status check (
    (status = 'Dikembalikan' and return_date is not null)
    or (status in ('Dipinjam', 'Terlambat') and return_date is null)
  )
);

create index loans_status_idx on public.loans(status);
create index loans_member_code_idx on public.loans(member_code);
create index loans_book_code_idx on public.loans(book_code);
create index loans_created_at_id_idx on public.loans(created_at desc, id desc);

create function public.set_loan_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger loans_updated_at before update on public.loans
for each row execute function public.set_loan_updated_at();

-- Akses langsung dengan anon/publishable key ditutup. Backend memakai server key.
alter table public.loans enable row level security;
revoke all on public.loans from anon, authenticated;
grant select, insert, update, delete on public.loans to service_role;

commit;
