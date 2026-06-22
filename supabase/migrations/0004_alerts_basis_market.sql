-- Allow the 'market' deal basis (a listing priced below the typical asking
-- price across everything matched in a run). Needed so a single real source
-- (e.g. eBay) can surface good deals without a second site for comparison.
alter table public.alerts drop constraint if exists alerts_basis_check;
alter table public.alerts add constraint alerts_basis_check
  check (basis in ('cross_site','history','max_price','market'));
