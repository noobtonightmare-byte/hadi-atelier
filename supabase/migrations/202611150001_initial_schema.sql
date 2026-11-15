create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  username text unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  image_url text not null,
  inventory integer not null default 0 check (inventory >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_active_created_idx on public.products (is_active, created_at desc);
create index products_category_idx on public.products (category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0
);
create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  required boolean not null default false,
  sort_order integer not null default 0,
  unique (product_id, name)
);
create table public.option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options(id) on delete cascade,
  label text not null,
  price_delta numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  unique (option_id, label)
);
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text not null,
  poster_url text,
  placement text not null default 'homepage',
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  target_url text,
  is_active boolean not null default false,
  sort_order integer not null default 0
);
create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order numeric(12,2) not null default 0,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  usage_count integer not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  check (discount_type <> 'percent' or discount_value <= 100)
);
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 20),
  selected_options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, selected_options)
);
create table public.wishlist_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  tracking_number text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  phone text not null,
  shipping_address jsonb not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  coupon_code text,
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_tracking_idx on public.orders (tracking_number);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_snapshot jsonb not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create table public.order_customizations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  option_name text not null,
  option_value text not null,
  price_delta numeric(12,2) not null default 0
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table public.admin_security_config (
  singleton boolean primary key default true check (singleton),
  favorite_car_hash text not null,
  updated_at timestamptz not null default now()
);
create table public.admin_gate_attempts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  failed_count integer not null default 0,
  locked_until timestamptz
);
create table public.admin_verifications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verified_until timestamptz not null
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, username, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'user'
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin_verified()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.admin_verifications v on v.user_id = p.id
    where p.id = (select auth.uid()) and p.role = 'admin' and v.verified_until > now()
  );
$$;

create or replace function public.verify_admin_gate(p_answer text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  expected_hash text;
  attempts public.admin_gate_attempts%rowtype;
begin
  if current_user_id is null or not exists (
    select 1 from public.profiles
    where id = current_user_id and role = 'admin' and lower(email) = 'haadmuhammad@gmail.com'
  ) then
    return false;
  end if;

  select * into attempts from public.admin_gate_attempts where user_id = current_user_id for update;
  if attempts.locked_until is not null and attempts.locked_until > now() then
    return false;
  end if;

  select favorite_car_hash into expected_hash
  from public.admin_security_config where singleton = true;
  if expected_hash is null or p_answer is null or length(p_answer) > 200
    or extensions.crypt(lower(trim(p_answer)), expected_hash) <> expected_hash then
    insert into public.admin_gate_attempts as current_attempt (user_id, failed_count, locked_until)
    values (current_user_id, 1, null)
    on conflict (user_id) do update set
      failed_count = case
        when current_attempt.locked_until is not null and current_attempt.locked_until <= now() then 1
        else current_attempt.failed_count + 1
      end,
      locked_until = case
        when current_attempt.locked_until is not null and current_attempt.locked_until <= now() then null
        when current_attempt.failed_count >= 4 then now() + interval '15 minutes'
        else null
      end;
    delete from public.admin_verifications where user_id = current_user_id;
    return false;
  end if;

  delete from public.admin_gate_attempts where user_id = current_user_id;
  insert into public.admin_verifications (user_id, verified_until)
  values (current_user_id, now() + interval '30 minutes')
  on conflict (user_id) do update set verified_until = excluded.verified_until;
  return true;
end;
$$;

create or replace function public.set_profile_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin_verified() or p_role not in ('user', 'admin') then
    raise exception 'Administrator verification required';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

create or replace function public.place_cod_order(p_phone text, p_shipping_address jsonb, p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  cart_row public.cart_items%rowtype;
  product_row public.products%rowtype;
  option_row record;
  order_uuid uuid := gen_random_uuid();
  tracking text := 'HA-' || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));
  order_item_uuid uuid;
  line_price numeric(12,2);
  subtotal_amount numeric(12,2) := 0;
  discount_amount numeric(12,2) := 0;
  total_amount numeric(12,2);
  coupon_row public.coupons%rowtype;
begin
  if current_user_id is null then raise exception 'Sign in before placing an order'; end if;
  if p_phone !~ '^\+923[0-9]{9}$' then raise exception 'Enter a valid Pakistani mobile number'; end if;
  if coalesce(trim(p_shipping_address ->> 'full_name'), '') = ''
    or coalesce(trim(p_shipping_address ->> 'address'), '') = ''
    or coalesce(trim(p_shipping_address ->> 'city'), '') = '' then
    raise exception 'Complete your delivery details';
  end if;

  for cart_row in
    select * from public.cart_items where user_id = current_user_id for update
  loop
    select * into product_row from public.products
    where id = cart_row.product_id and is_active = true for update;
    if not found then raise exception 'A piece in your bag is no longer available'; end if;
    if cart_row.quantity > product_row.inventory then raise exception 'Not enough stock for %', product_row.name; end if;
    if jsonb_typeof(cart_row.selected_options) <> 'object' then
      raise exception 'Invalid options for %', product_row.name;
    end if;
    line_price := product_row.price;

    if exists (
      select 1
      from jsonb_each_text(cart_row.selected_options) as selected(key, value)
      left join public.product_options po on po.id::text = selected.key and po.product_id = product_row.id
      left join public.option_values ov on ov.id::text = selected.value and ov.option_id = po.id
      where po.id is not null and ov.id is null
    ) then
      raise exception 'Invalid options for %', product_row.name;
    end if;

    for option_row in
      select po.id as option_id, po.name as option_name, po.required,
             ov.id as value_id, ov.label, ov.price_delta
      from jsonb_each_text(cart_row.selected_options) as selected(key, value)
      join public.product_options po on po.id::text = selected.key and po.product_id = product_row.id
      join public.option_values ov on ov.id::text = selected.value and ov.option_id = po.id
    loop
      line_price := line_price + option_row.price_delta;
    end loop;
    if line_price < 0 then raise exception 'Invalid option pricing for %', product_row.name; end if;

    if exists (
      select 1 from public.product_options po
      where po.product_id = product_row.id and po.required
        and not (cart_row.selected_options ? po.id::text)
    ) then
      raise exception 'Choose all required options for %', product_row.name;
    end if;

    subtotal_amount := subtotal_amount + line_price * cart_row.quantity;
    insert into public.order_items (order_id, product_id, product_snapshot, quantity, unit_price, line_total)
    values (
      order_uuid, product_row.id,
      jsonb_build_object('name', product_row.name, 'slug', product_row.slug, 'image_url', product_row.image_url),
      cart_row.quantity, line_price, line_price * cart_row.quantity
    ) returning id into order_item_uuid;

    insert into public.order_customizations (order_item_id, option_name, option_value, price_delta)
    select order_item_uuid, po.name, ov.label, ov.price_delta
    from jsonb_each_text(cart_row.selected_options) as selected(key, value)
    join public.product_options po on po.id::text = selected.key and po.product_id = product_row.id
    join public.option_values ov on ov.id::text = selected.value and ov.option_id = po.id;

    update public.products set inventory = inventory - cart_row.quantity where id = product_row.id;
  end loop;
  if subtotal_amount = 0 then raise exception 'Your bag is empty'; end if;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select * into coupon_row from public.coupons
    where lower(code) = lower(trim(p_coupon_code)) and is_active
      and starts_at <= now() and (expires_at is null or expires_at > now())
      and (usage_limit is null or usage_count < usage_limit)
    for update;
    if not found then raise exception 'That coupon is not valid'; end if;
    if subtotal_amount < coupon_row.minimum_order then raise exception 'Your order does not meet the coupon minimum'; end if;
    discount_amount := case when coupon_row.discount_type = 'percent'
      then round(subtotal_amount * coupon_row.discount_value / 100, 2)
      else least(coupon_row.discount_value, subtotal_amount) end;
    update public.coupons set usage_count = usage_count + 1 where id = coupon_row.id;
  end if;
  total_amount := greatest(subtotal_amount - discount_amount, 0);

  insert into public.orders (id, user_id, tracking_number, phone, shipping_address, subtotal, discount, coupon_code, total)
  values (order_uuid, current_user_id, tracking, p_phone, p_shipping_address, subtotal_amount, discount_amount, nullif(trim(p_coupon_code), ''), total_amount);
  delete from public.cart_items where user_id = current_user_id;
  return jsonb_build_object('id', order_uuid, 'tracking_number', tracking, 'status', 'pending', 'total', total_amount, 'created_at', now(), 'shipping_address', p_shipping_address);
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_options enable row level security;
alter table public.option_values enable row level security;
alter table public.videos enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;
alter table public.coupons enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_customizations enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.admin_security_config enable row level security;
alter table public.admin_gate_attempts enable row level security;
alter table public.admin_verifications enable row level security;

create policy "Profiles are visible to their owner or verified admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin_verified());
revoke update on public.profiles from authenticated;
grant update (full_name, username) on public.profiles to authenticated;
create policy "Users update their own basic profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Active categories are public" on public.categories for select using (is_active or public.is_admin_verified());
create policy "Admins manage categories" on public.categories for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Active products are public" on public.products for select using (is_active or public.is_admin_verified());
create policy "Admins manage products" on public.products for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Product images are public for active products" on public.product_images for select using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin_verified())));
create policy "Admins manage product images" on public.product_images for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Product options are public for active products" on public.product_options for select using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin_verified())));
create policy "Admins manage product options" on public.product_options for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Option values are public for visible products" on public.option_values for select using (exists (select 1 from public.product_options po join public.products p on p.id = po.product_id where po.id = option_id and (p.is_active or public.is_admin_verified())));
create policy "Admins manage option values" on public.option_values for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Active videos are public" on public.videos for select using (is_active or public.is_admin_verified());
create policy "Admins manage videos" on public.videos for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Active banners are public" on public.banners for select using (is_active or public.is_admin_verified());
create policy "Admins manage banners" on public.banners for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Public site settings are readable" on public.site_settings for select using (is_public or public.is_admin_verified());
create policy "Admins manage site settings" on public.site_settings for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Admins manage coupons" on public.coupons for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Users manage their cart" on public.cart_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users manage their wishlist" on public.wishlist_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users and admins view orders" on public.orders for select to authenticated using (user_id = (select auth.uid()) or public.is_admin_verified());
revoke update on public.orders from authenticated;
grant update (status) on public.orders to authenticated;
create policy "Admins update order status" on public.orders for update to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Order items are visible to their owner or admin" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_admin_verified())));
create policy "Customizations are visible to their owner or admin" on public.order_customizations for select to authenticated using (exists (select 1 from public.order_items oi join public.orders o on o.id = oi.order_id where oi.id = order_item_id and (o.user_id = (select auth.uid()) or public.is_admin_verified())));
create policy "Approved reviews are public" on public.reviews for select using (is_approved or user_id = (select auth.uid()) or public.is_admin_verified());
create policy "Users create their own reviews" on public.reviews for insert to authenticated with check (user_id = (select auth.uid()) and is_approved = false);
create policy "Users edit their own pending reviews" on public.reviews for update to authenticated using (user_id = (select auth.uid()) and not is_approved) with check (user_id = (select auth.uid()) and not is_approved);
create policy "Admins moderate reviews" on public.reviews for all to authenticated using (public.is_admin_verified()) with check (public.is_admin_verified());
create policy "Anyone can subscribe" on public.newsletter_subscribers for insert to anon, authenticated
with check (
  length(email) <= 320
  and email = lower(trim(email))
  and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);
create policy "Admins view subscribers" on public.newsletter_subscribers for select to authenticated using (public.is_admin_verified());

revoke all on public.admin_security_config, public.admin_gate_attempts, public.admin_verifications from anon, authenticated;
revoke all on function public.verify_admin_gate(text) from public;
grant execute on function public.verify_admin_gate(text) to authenticated;
revoke all on function public.place_cod_order(text, jsonb, text) from public;
grant execute on function public.place_cod_order(text, jsonb, text) to authenticated;
revoke all on function public.set_profile_role(uuid, text) from public;
grant execute on function public.set_profile_role(uuid, text) to authenticated;
grant execute on function public.is_admin_verified() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 10485760, array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;
create policy "Product media is publicly readable" on storage.objects for select using (bucket_id = 'product-media');
create policy "Verified admins upload product media" on storage.objects for insert to authenticated with check (bucket_id = 'product-media' and public.is_admin_verified());
create policy "Verified admins update product media" on storage.objects for update to authenticated using (bucket_id = 'product-media' and public.is_admin_verified()) with check (bucket_id = 'product-media' and public.is_admin_verified());
create policy "Verified admins delete product media" on storage.objects for delete to authenticated using (bucket_id = 'product-media' and public.is_admin_verified());

do $$
declare
  realtime_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach realtime_table in array array['orders', 'products', 'categories', 'product_options', 'option_values'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = realtime_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', realtime_table);
      end if;
    end loop;
  end if;
end;
$$;
