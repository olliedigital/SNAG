-- SNAG is sneakers-only: drop the games category and the CheapShark source.
delete from public.watchlist_items where category <> 'sneakers';

alter table public.watchlist_items drop constraint if exists watchlist_items_category_check;
alter table public.watchlist_items add constraint watchlist_items_category_check check (category = 'sneakers');
alter table public.watchlist_items alter column category set default 'sneakers';

delete from public.sources where key = 'cheapshark';
