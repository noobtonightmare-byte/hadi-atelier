insert into public.categories (name, slug, description, image_url, sort_order) values
('Leather goods', 'leather-goods', 'Carry what matters, with intention.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85', 1),
('Objects & more', 'objects', 'Small objects, thoughtfully considered.', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85', 2),
('The little things', 'accessories', 'The finishing touch, never an afterthought.', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85', 3)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, image_url, inventory, is_active, is_featured, is_new, is_bestseller)
select c.id, product.name, product.slug, product.description, product.price, product.image_url, product.inventory, true, product.is_featured, product.is_new, product.is_bestseller
from (values
  ('leather-goods', 'sera-tote', 'The Sera Tote', 'An everyday silhouette in supple, responsibly sourced leather. Finished by hand with brushed brass hardware.', 28500::numeric, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85', 12, true, true, false),
  ('leather-goods', 'noor-evening-clutch', 'Noor Evening Clutch', 'A sculptural evening companion, shaped with a softly structured profile and an enduring point of view.', 19800::numeric, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85', 8, true, false, true),
  ('leather-goods', 'form-study-02', 'Form Study 02', 'A quiet statement in form. Made to be collected, carried, and kept close for years to come.', 34500::numeric, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85', 5, true, true, false),
  ('leather-goods', 'mini-crescent', 'The Mini Crescent', 'A considered small-format bag for the essentials and the in-between moments.', 22500::numeric, 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1000&q=85', 16, true, false, true),
  ('objects', 'still-life-object', 'Still Life Object', 'A tactile desk companion shaped to bring a little intention to the everyday.', 12400::numeric, 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85', 9, true, true, false),
  ('accessories', 'brass-bookmark', 'The Brass Bookmark', 'A small, weighty marker for the pages worth returning to.', 4800::numeric, 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=85', 24, true, false, true)
) as product(category_slug, slug, name, description, price, image_url, inventory, is_featured, is_new, is_bestseller)
join public.categories c on c.slug = product.category_slug
on conflict (slug) do nothing;

insert into public.product_options (product_id, name, required, sort_order)
select p.id, option_data.name, option_data.required, option_data.sort_order
from public.products p
cross join (values ('Leather finish', true, 1), ('Gift presentation', false, 2)) as option_data(name, required, sort_order)
where p.slug = 'sera-tote'
on conflict (product_id, name) do nothing;

insert into public.option_values (option_id, label, price_delta, sort_order)
select po.id, option_data.label, option_data.price_delta, option_data.sort_order
from public.product_options po
cross join (values
  ('Leather finish', 'Warm cognac', 0::numeric, 1),
  ('Leather finish', 'Deep espresso', 0::numeric, 2),
  ('Gift presentation', 'Standard packaging', 0::numeric, 1),
  ('Gift presentation', 'Atelier gift box', 1800::numeric, 2)
) as option_data(option_name, label, price_delta, sort_order)
where po.name = option_data.option_name
  and exists (select 1 from public.products p where p.id = po.product_id and p.slug = 'sera-tote')
on conflict (option_id, label) do nothing;
