-- Add ആലിൻകീഴ് and വെള്ളൂർ to the branch catalogue.

insert into public.branches (name, branch_key, sort_order) values
  ('ആലിൻകീഴ്', 'ആലിൻകീഴ്', 21),
  ('വെള്ളൂർ', 'വെള്ളൂർ', 22)
on conflict (name) do update
  set branch_key = excluded.branch_key,
      sort_order = excluded.sort_order;
