import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart,
  Menu, Minus, Plus, Search, ShoppingBag, Sparkles, X,
} from "lucide-react";
import type { Category, CartItem, Order, Product, ProductOption, Profile } from "./lib/types";
import { money } from "./lib/types";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const FALLBACK_PRODUCTS: Product[] = [
  { id: "p1", name: "The Sera Tote", slug: "sera-tote", description: "An everyday silhouette in supple, responsibly sourced leather. Finished by hand with brushed brass hardware.", price: 28500, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85", category_id: "c1", inventory: 12, is_featured: true, is_new: true, is_bestseller: false },
  { id: "p2", name: "Noor Evening Clutch", slug: "noor-evening-clutch", description: "A sculptural evening companion, shaped with a softly structured profile and an enduring point of view.", price: 19800, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85", category_id: "c1", inventory: 8, is_featured: true, is_new: false, is_bestseller: true },
  { id: "p3", name: "Form Study 02", slug: "form-study-02", description: "A quiet statement in form. Made to be collected, carried, and kept close for years to come.", price: 34500, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85", category_id: "c1", inventory: 5, is_featured: true, is_new: true, is_bestseller: false },
  { id: "p4", name: "The Mini Crescent", slug: "mini-crescent", description: "A considered small-format bag for the essentials and the in-between moments.", price: 22500, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1000&q=85", category_id: "c1", inventory: 16, is_featured: true, is_new: false, is_bestseller: true },
  { id: "p5", name: "Still Life Object", slug: "still-life-object", description: "A tactile desk companion shaped to bring a little intention to the everyday.", price: 12400, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85", category_id: "c2", inventory: 9, is_featured: true, is_new: true, is_bestseller: false },
  { id: "p6", name: "The Brass Bookmark", slug: "brass-bookmark", description: "A small, weighty marker for the pages worth returning to.", price: 4800, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=85", category_id: "c3", inventory: 24, is_featured: true, is_new: false, is_bestseller: true },
];

const FALLBACK_CATEGORIES: Category[] = [
  { id: "c1", name: "Leather goods", slug: "leather-goods", description: null, image_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85" },
  { id: "c2", name: "Objects & more", slug: "objects", description: null, image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85" },
  { id: "c3", name: "The little things", slug: "accessories", description: null, image_url: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85" },
];
const optionKey = (options: Record<string, string> = {}) =>
  JSON.stringify(Object.entries(options).sort(([left], [right]) => left.localeCompare(right)));
const readStoredCart = (): CartItem[] => {
  try {
    return JSON.parse(localStorage.getItem("hadi-cart") ?? "[]") as CartItem[];
  } catch {
    localStorage.removeItem("hadi-cart");
    return [];
  }
};

type Modal = "account" | "cart" | "checkout" | "product" | "admin" | null;
type Toast = { id: number; message: string; tone?: "success" | "error" };

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, message, tone });
    window.setTimeout(() => setToast(current => current?.id === id ? null : current), 3200);
  }, []);

  const loadCatalog = useCallback(async () => {
    if (!supabase) {
      setProducts(FALLBACK_PRODUCTS.map(product => ({ ...product, categories: FALLBACK_CATEGORIES.find(item => item.id === product.category_id) ?? null })));
      setCategories(FALLBACK_CATEGORIES);
      return;
    }
    const [{ data: productData, error: productError }, { data: categoryData, error: categoryError }] = await Promise.all([
      supabase.from("products").select("*, categories(id,name,slug,description,image_url), product_options(id,required)").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    ]);
    if (productError || categoryError) {
      notify("Could not load the catalog. Check your Supabase setup.", "error");
      setProducts(FALLBACK_PRODUCTS.map(product => ({ ...product, categories: FALLBACK_CATEGORIES.find(item => item.id === product.category_id) ?? null })));
      setCategories(FALLBACK_CATEGORIES);
      return;
    }
    setProducts((productData ?? []) as Product[]);
    setCategories((categoryData ?? []) as Category[]);
  }, [notify]);

  const loadUserData = useCallback(async (userId: string) => {
    if (!supabase) return;
    const [{ data: profileData }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,username,role").eq("id", userId).maybeSingle(),
      supabase.from("cart_items").select("id,product_id,quantity,selected_options,products(*,categories(id,name,slug,description,image_url),product_options(id,option_values(id,price_delta)))").eq("user_id", userId),
    ]);
    setProfile(profileData as Profile | null);
    setCart((rows ?? []).flatMap(row => {
      const relatedProduct = row.products as Product[] | Product | null;
      const joinedProduct = Array.isArray(relatedProduct) ? relatedProduct[0] : relatedProduct;
      if (!joinedProduct) return [];
      const selectedOptions = (row.selected_options ?? {}) as Record<string, string>;
      const productWithOptions = joinedProduct as Product & { product_options?: ProductOption[] };
      const optionDelta = (productWithOptions.product_options ?? []).reduce((total, option) =>
        total + (Number(option.option_values.find(value => value.id === selectedOptions[option.id])?.price_delta) || 0), 0);
      return [{ id: row.id, product: joinedProduct, quantity: row.quantity, selected_options: selectedOptions, unit_price: joinedProduct.price + optionDelta }];
    }));
    setCartHydrated(true);
    const { data: saved } = await supabase.from("wishlist_items").select("product_id").eq("user_id", userId);
    setWishlist((saved ?? []).map(item => item.product_id));
  }, []);

  useEffect(() => {
    void loadCatalog();
    const guestWishlist = localStorage.getItem("hadi-wishlist");
    if (guestWishlist) setWishlist(JSON.parse(guestWishlist) as string[]);
    if (supabase) {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) void loadUserData(data.session.user.id);
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) void loadUserData(session.user.id);
        else {
          setProfile(null);
          setCart(readStoredCart());
          setCartHydrated(true);
        }
      });
      const catalogChannel = supabase.channel("storefront-catalog")
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => { void loadCatalog(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => { void loadCatalog(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "product_options" }, () => { void loadCatalog(); })
        .subscribe();
      return () => {
        listener.subscription.unsubscribe();
        void supabase?.removeChannel(catalogChannel);
      };
    }
    setCart(readStoredCart());
    setCartHydrated(true);
  }, [loadCatalog, loadUserData]);

  useEffect(() => {
    if (cartHydrated && !profile) localStorage.setItem("hadi-cart", JSON.stringify(cart));
  }, [cart, cartHydrated, profile]);

  const addToCart = async (product: Product, selectedOptions: Record<string, string> = {}, optionDelta = 0) => {
    const found = cart.find(item => item.product.id === product.id && optionKey(item.selected_options) === optionKey(selectedOptions));
    if (found) {
      await updateQuantity(found, found.quantity + 1);
      return;
    }
    if (supabase && profile) {
      const { data, error } = await supabase.from("cart_items").insert({ user_id: profile.id, product_id: product.id, quantity: 1, selected_options: selectedOptions }).select("id").single();
      if (error) { notify(error.message, "error"); return; }
      setCart(current => [...current, { id: data.id, product, quantity: 1, selected_options: selectedOptions, unit_price: product.price + optionDelta }]);
    } else {
      setCart(current => [...current, { id: `guest-${crypto.randomUUID()}`, product, quantity: 1, selected_options: selectedOptions, unit_price: product.price + optionDelta }]);
    }
    notify(`${product.name} added to your bag`);
  };

  const updateQuantity = async (item: CartItem, quantity: number) => {
    if (quantity < 1) {
      if (supabase && profile && !item.id.startsWith("guest-")) {
        const { error } = await supabase.from("cart_items").delete().eq("id", item.id);
        if (error) { notify(error.message, "error"); return; }
      }
      setCart(current => current.filter(row => row.id !== item.id));
      return;
    }
    if (supabase && profile && !item.id.startsWith("guest-")) {
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", item.id);
      if (error) { notify(error.message, "error"); return; }
    }
    setCart(current => current.map(row => row.id === item.id ? { ...row, quantity } : row));
  };

  const toggleWishlist = async (product: Product) => {
    const exists = wishlist.includes(product.id);
    if (supabase && profile) {
      const query = supabase.from("wishlist_items");
      const { error } = exists
        ? await query.delete().eq("user_id", profile.id).eq("product_id", product.id)
        : await query.insert({ user_id: profile.id, product_id: product.id });
      if (error) { notify(error.message, "error"); return; }
    }
    setWishlist(current => {
      const next = exists ? current.filter(id => id !== product.id) : [...current, product.id];
      if (!profile) localStorage.setItem("hadi-wishlist", JSON.stringify(next));
      return next;
    });
    notify(exists ? "Removed from saved pieces" : "Saved for later");
  };

  const visibleProducts = useMemo(() => {
    let rows = products.filter(product =>
      (category === "all" || product.categories?.slug === category || product.category_id === categories.find(item => item.slug === category)?.id) &&
      `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase()),
    );
    if (sort === "price-low") rows = [...rows].sort((a, b) => a.price - b.price);
    if (sort === "price-high") rows = [...rows].sort((a, b) => b.price - a.price);
    if (sort === "new") rows = [...rows].sort((a, b) => Number(b.is_new) - Number(a.is_new));
    return rows;
  }, [categories, category, products, search, sort]);
  const subtotal = cart.reduce((total, item) => total + (item.unit_price ?? item.product.price) * item.quantity, 0);

  const syncGuestCart = async (userId: string) => {
    if (!supabase || profile) return;
    const guest = readStoredCart().filter(item => item.id.startsWith("guest-"));
    let merged = true;
    for (const item of guest) {
      const { error } = await supabase.from("cart_items").upsert(
        { user_id: userId, product_id: item.product.id, quantity: item.quantity, selected_options: item.selected_options ?? {} },
        { onConflict: "user_id,product_id,selected_options" },
      );
      if (error) {
        merged = false;
        notify("Signed in, but your guest bag could not be merged. Your saved guest bag is still on this device.", "error");
      }
    }
    if (guest.length && merged) {
      localStorage.removeItem("hadi-cart");
      void loadUserData(userId);
    } else if (guest.length) {
      setCart(guest);
    }
  };

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { notify("Add your Supabase credentials to enable accounts.", "error"); return; }
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    setBusy(true);
    const signup = values.get("intent") === "signup";
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: values.get("name"), username: values.get("username") }, emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) { notify(result.error.message, "error"); return; }
    if (signup && !result.data.session) notify("Check your inbox to verify your email.");
    else {
      if (result.data.user) await syncGuestCart(result.data.user.id);
      notify(signup ? "Your account is ready." : "Welcome back.");
      setModal(null);
    }
  };

  const checkout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !profile) { setModal("account"); notify("Sign in to place your order.", "error"); return; }
    if (!cart.length) return;
    const values = new FormData(event.currentTarget);
    const phone = String(values.get("phone") ?? "").replace(/[\s-]/g, "");
    if (!/^(03\d{9}|\+923\d{9})$/.test(phone)) { notify("Enter a valid Pakistani mobile number.", "error"); return; }
    const phoneNormalized = phone.startsWith("03") ? `+92${phone.slice(1)}` : phone;
    setBusy(true);
    const { data, error } = await supabase.rpc("place_cod_order", {
      p_phone: phoneNormalized,
      p_shipping_address: {
        full_name: values.get("full_name"),
        address: values.get("address"),
        city: values.get("city"),
        postal_code: values.get("postal_code"),
        notes: values.get("notes"),
      },
      p_coupon_code: String(values.get("coupon") ?? "").trim() || null,
    });
    setBusy(false);
    if (error) { notify(error.message, "error"); return; }
    const created = data as Order;
    setOrder(created);
    setCart([]);
    setModal(null);
    navigate(`/order/${created.tracking_number}`);
    notify("Your order is confirmed.");
    const { error: emailError } = await supabase.functions.invoke("order-notification", {
      body: { order_id: created.id },
    });
    if (emailError) notify("Your order is saved, but its email notification could not be sent. Please check the email setup.", "error");
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setModal("product");
  };
  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setModal(null);
    notify("You have signed out.");
  };

  if (location.pathname.startsWith("/admin")) {
    return <AdminGate profile={profile} onOpenLogin={() => { navigate("/"); setModal("account"); }} onNotify={notify} products={products} categories={categories} onRefresh={loadCatalog} />;
  }

  const orderMatch = location.pathname.match(/^\/order\/([^/]+)$/);
  if (orderMatch) {
    return (
      <div className="order-page">
        <Link to="/" className="wordmark">HADI <span>ATELIER</span></Link>
        <div className="order-confirm">
          <div className="order-check"><Check size={23} /></div>
          <p className="eyebrow">A considered choice</p>
          <h1>Thank you<br />for your order.</h1>
          <p>We’ve received your order and will be in touch to confirm delivery details.</p>
          <div className="tracking-box"><span>Tracking reference</span><strong>{order?.tracking_number ?? decodeURIComponent(orderMatch[1])}</strong></div>
          <p className="muted-small">Payment by cash on delivery. Orders are currently shipped within Pakistan.</p>
          <Link to="/" className="button button-gold">Continue exploring <ArrowRight size={15} /></Link>
        </div>
      </div>
    );
  }

  if (location.pathname === "/reset-password") {
    return <ResetPasswordPage onNotify={notify} />;
  }
  if (location.pathname !== "/") {
    return <main className="order-page"><Link to="/" className="wordmark">HADI <span>ATELIER</span></Link><div className="order-confirm"><p className="eyebrow">A QUIET DETOUR</p><h1>This page<br />is not here.</h1><p>The link may have changed. The collection is still waiting.</p><Link to="/" className="button button-gold">Return to the collection <ArrowRight size={15} /></Link></div></main>;
  }

  return (
    <div className="site-shell">
      <div className="announcement">Cash on delivery across Pakistan <span>✦</span> Thoughtfully made in Lahore</div>
      <header className="site-header">
        <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X /> : <Menu />}</button>
        <nav className={`main-nav ${mobileMenu ? "nav-open" : ""}`}>
          <a href="#collection" onClick={() => setMobileMenu(false)}>Shop</a>
          <a href="#story" onClick={() => setMobileMenu(false)}>Our story</a>
          <a href="#journal" onClick={() => setMobileMenu(false)}>The journal</a>
        </nav>
        <Link to="/" className="wordmark" aria-label="Hadi Atelier home">HADI <span>ATELIER</span></Link>
        <div className="header-actions">
          <label className="search-control"><Search size={16} /><input value={search} onChange={event => { setSearch(event.target.value); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }} placeholder="Search" aria-label="Search pieces" /></label>
          <button className="icon-button account-button" onClick={() => setModal("account")} aria-label={profile ? `Account for ${profile.full_name ?? profile.email}` : "Open account"}><span className="desktop-label">{profile?.full_name?.split(" ")[0] ?? "Account"}</span><span className="mobile-label">Account</span></button>
          <button className="icon-button bag-button" onClick={() => setModal("cart")} aria-label={`Shopping bag, ${cart.reduce((n, item) => n + item.quantity, 0)} items`}><ShoppingBag size={18} /><span>Bag ({cart.reduce((n, item) => n + item.quantity, 0)})</span></button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-image" role="img" aria-label="Sculptural leather bag against an architectural backdrop" />
          <div className="hero-shade" />
          <div className="hero-copy">
            <p className="eyebrow">HADI ATELIER · LAHORE, PAKISTAN</p>
            <h1>Objects of<br /><em>intention.</em></h1>
            <p>Considered forms. Honest materials.<br />Made to move with you.</p>
            <a className="button button-gold" href="#collection">Discover the collection <ArrowRight size={15} /></a>
          </div>
          <p className="hero-caption">01 / THE AUTUMN EDIT</p>
          <a className="scroll-cue" href="#categories" aria-label="Scroll to explore"><ArrowDown size={16} /></a>
        </section>

        <section className="intro-section" id="story">
          <p className="eyebrow">A STUDY IN PURPOSE</p>
          <h2>Fewer things.<br /><em>More meaning.</em></h2>
          <p>Rooted in the richness of our heritage, shaped for the rhythms of now. Every piece begins with a material, a maker, and the belief that what we carry should carry meaning.</p>
          <a href="#journal" className="text-link">The atelier notes <ArrowUpRight size={15} /></a>
        </section>

        <section className="categories-section" id="categories">
          <div className="section-heading">
            <div><p className="eyebrow">FIND YOUR FORM</p><h2>Made for <em>the everyday.</em></h2></div>
            <a href="#collection" className="text-link desktop-only">Shop all pieces <ArrowRight size={15} /></a>
          </div>
          <div className="category-grid">
            {categories.map((item, index) => (
              <button key={item.id} className={`category-card category-card-${index + 1}`} onClick={() => { setCategory(item.slug); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }}>
                <img src={item.image_url || FALLBACK_CATEGORIES[index % FALLBACK_CATEGORIES.length].image_url!} alt={item.name} loading="lazy" />
                <span className="category-overlay"><span>{item.name}</span><ArrowUpRight size={17} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="collection-section" id="collection">
          <div className="section-heading collection-heading">
            <div><p className="eyebrow">THE ATELIER EDIT</p><h2>Pieces to <em>keep.</em></h2></div>
            <button className="filter-toggle" onClick={() => setFilterOpen(!filterOpen)}>{filterOpen ? "Close filters" : "Filter & sort"} <ChevronDown size={14} /></button>
          </div>
          <AnimatePresence>
            {filterOpen && <motion.div className="filter-row" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All pieces</option>{categories.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
              <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Featured</option><option value="new">New arrivals</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
            </motion.div>}
          </AnimatePresence>
          <div className="product-grid">
            {visibleProducts.length ? visibleProducts.map(product => <ProductCard key={product.id} product={product} isSaved={wishlist.includes(product.id)} onOpen={openProduct} onSave={toggleWishlist} onAdd={addToCart} />) : <p className="empty-state">No pieces found. Try another search or filter.</p>}
          </div>
          <p className="catalog-note">Showing {visibleProducts.length} of {products.length} pieces · More considered forms coming soon</p>
        </section>

        <section className="craft-section" id="journal">
          <div className="craft-image"><img src="https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1500&q=85" alt="Hands carefully finishing a leather piece in the atelier" loading="lazy" /></div>
          <div className="craft-copy"><p className="eyebrow">MADE BY HAND. MADE TO LAST.</p><h2>Good things<br />take <em>their time.</em></h2><p>Our pieces are made in small runs, with care at every turn. We work with skilled makers and materials that grow more beautiful with age—never in a hurry, never at the expense of how it’s made.</p><a className="text-link" href="mailto:hello@hadiatelier.com">A little more about us <ArrowRight size={15} /></a></div>
        </section>

        <section className="newsletter" id="newsletter">
          <Sparkles size={17} />
          <p className="eyebrow">A NOTE FROM THE ATELIER</p>
          <h2>Letters, <em>not noise.</em></h2>
          <p>First looks, thoughtful stories, and the occasional note from our makers.</p>
          <form onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const email = String(new FormData(form).get("email")).trim().toLowerCase(); if (!supabase) { notify("Newsletter signup is unavailable until Supabase is configured.", "error"); return; } const { error } = await supabase.from("newsletter_subscribers").insert({ email }); if (error) { notify(error.code === "23505" ? "You’re already on the list." : error.message, error.code === "23505" ? "success" : "error"); return; } notify("You’re on the list. We’ll be in touch."); form.reset(); }}>
            <input name="email" type="email" placeholder="Your email address" required aria-label="Email address" /><button type="submit" aria-label="Subscribe"><ArrowRight size={16} /></button>
          </form>
          <span className="newsletter-note">No noise, ever. Unsubscribe whenever you like.</span>
        </section>

        <section className="quote-section"><span>“</span><blockquote>Beauty is not an extra.<br />It is how we give a thing its due.</blockquote><p className="eyebrow">A THOUGHT FROM THE ATELIER</p></section>
      </main>

      <footer className="site-footer">
        <div className="footer-top"><div><Link to="/" className="wordmark">HADI <span>ATELIER</span></Link><p>Objects of intention.<br />Made in Pakistan.</p></div>
          <div className="footer-links"><div><p className="eyebrow">EXPLORE</p><a href="#collection">Shop all</a><a href="#story">Our story</a><a href="#journal">Journal</a></div><div><p className="eyebrow">THE ATELIER</p><a href="#newsletter">Letters from us <ArrowDown size={13} /></a><a href="mailto:hello@hadiatelier.com">Contact the atelier <ArrowUpRight size={13} /></a></div></div>
        </div><div className="footer-bottom"><span>© {new Date().getFullYear()} HADI ATELIER</span><span>Thoughtfully made in Lahore</span><button onClick={() => navigate("/admin")}>Atelier access</button></div>
      </footer>

      <AnimatePresence>
        {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}>
          <motion.div className={`modal-panel ${modal === "cart" || modal === "checkout" ? "modal-drawer" : ""}`} initial={{ opacity: 0, y: modal === "cart" || modal === "checkout" ? 0 : 14, x: modal === "cart" || modal === "checkout" ? 40 : 0 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, y: 10, x: 25 }} transition={{ duration: .22 }} role="dialog" aria-modal="true">
            <button className="modal-close icon-button" onClick={() => setModal(null)} aria-label="Close"><X size={19} /></button>
            {modal === "account" && <AccountPanel profile={profile} busy={busy} onSubmit={submitAuth} onSignOut={signOut} onNotify={notify} />}
            {modal === "cart" && <CartPanel cart={cart} subtotal={subtotal} onQuantity={updateQuantity} onCheckout={() => { if (!cart.length) return; if (!profile) { setModal("account"); notify("Sign in to continue to checkout.", "error"); return; } setModal("checkout"); }} onClose={() => setModal(null)} />}
            {modal === "checkout" && <CheckoutPanel cart={cart} subtotal={subtotal} busy={busy} onSubmit={checkout} onBack={() => setModal("cart")} />}
            {modal === "product" && selectedProduct && <ProductPanel product={selectedProduct} isSaved={wishlist.includes(selectedProduct.id)} onAdd={(options, delta) => { void addToCart(selectedProduct, options, delta); }} onSave={() => void toggleWishlist(selectedProduct)} onError={notify} />}
            {modal === "admin" && <p className="muted-small">Admin console</p>}
          </motion.div>
        </div>}
      </AnimatePresence>
      <AnimatePresence>{toast && <motion.div className={`toast ${toast.tone === "error" ? "toast-error" : ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span>{toast.tone === "error" ? "!" : <Check size={14} />}</span>{toast.message}</motion.div>}</AnimatePresence>
    </div>
  );
}

function ProductCard({ product, isSaved, onOpen, onSave, onAdd }: { product: Product; isSaved: boolean; onOpen: (product: Product) => void; onSave: (product: Product) => void; onAdd: (product: Product) => void }) {
  return (
    <article className="product-card">
      <button className="product-image" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
        <img src={product.image_url} alt={product.name} loading="lazy" />
        {(product.is_new || product.is_bestseller) && <span className="product-tag">{product.is_new ? "JUST ARRIVED" : "ATELIER FAVOURITE"}</span>}
      </button>
      <button className={`wishlist-button ${isSaved ? "is-saved" : ""}`} onClick={() => onSave(product)} aria-label={isSaved ? `Remove ${product.name} from saved pieces` : `Save ${product.name}`}><Heart size={17} fill={isSaved ? "currentColor" : "none"} /></button>
      <div className="product-meta"><div><button className="product-name" onClick={() => onOpen(product)}>{product.name}</button><p>{product.categories?.name ?? "HADI ATELIER"}</p></div><span className="product-price">{money(product.price)}</span></div>
      <button className="quick-add" onClick={() => product.product_options?.some(option => option.required) ? onOpen(product) : onAdd(product)} disabled={product.inventory < 1}>{product.inventory < 1 ? "Sold out" : product.product_options?.some(option => option.required) ? "Choose options" : "Add to bag"} <Plus size={14} /></button>
    </article>
  );
}

function AccountPanel({ profile, busy, onSubmit, onSignOut, onNotify }: { profile: Profile | null; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onSignOut: () => void; onNotify: (message: string, tone?: "success" | "error") => void }) {
  const [signup, setSignup] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!profile || !supabase) return;
    void supabase.from("orders").select("id,tracking_number,status,total,created_at,shipping_address").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setOrders((data ?? []) as Order[]));
  }, [profile]);
  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { onNotify("Supabase is not configured.", "error"); return; }
    const email = String(new FormData(event.currentTarget).get("email"));
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
    onNotify(error ? error.message : "If that email is registered, a reset link is on its way.", error ? "error" : "success");
  };
  if (profile) return <div className="account-panel"><p className="eyebrow">YOUR ATELIER ACCOUNT</p><h2>Welcome back,<br /><em>{profile.full_name?.split(" ")[0] ?? "friend"}.</em></h2><p className="account-email">{profile.email}</p>{profile.role === "admin" && <Link className="button button-outline full-button" to="/admin">Open atelier admin</Link>}<div className="account-orders"><h3>Your recent orders</h3>{orders.length ? orders.map(item => <div key={item.id}><span>{item.tracking_number}</span><span>{item.status} · {money(item.total)}</span></div>) : <p className="muted-small">Your next considered choice will appear here.</p>}</div><button className="text-link" onClick={onSignOut}>Sign out <ArrowRight size={14} /></button></div>;
  if (forgot) return <div className="account-panel"><button className="back-link" onClick={() => setForgot(false)}><ArrowLeft size={14} /> Back to sign in</button><p className="eyebrow">ACCOUNT RECOVERY</p><h2>Find your<br /><em>way back.</em></h2><form className="stack-form" onSubmit={resetPassword}><label>Email address<input name="email" type="email" required autoComplete="email" /></label><button className="button button-gold full-button">Send reset link</button></form></div>;
  return <div className="account-panel"><p className="eyebrow">{signup ? "A PLACE OF YOUR OWN" : "YOUR ATELIER ACCOUNT"}</p><h2>{signup ? <>Begin<br /><em>here.</em></> : <>Welcome<br /><em>back.</em></>}</h2><p>{signup ? "Create an account to keep your saved pieces and orders close." : "Sign in to keep your saved pieces and orders close."}</p>
    <form className="stack-form" onSubmit={onSubmit}>
      {signup && <><label>Your name<input name="name" autoComplete="name" minLength={2} required /></label><label>Username<input name="username" autoComplete="username" minLength={3} pattern="[a-zA-Z0-9_]+" required /></label></>}
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>
      <input type="hidden" name="intent" value={signup ? "signup" : "login"} />
      {!signup && <button className="text-link forgot-link" type="button" onClick={() => setForgot(true)}>Forgot password?</button>}
      <button className="button button-gold full-button" disabled={busy}>{busy ? "One moment…" : signup ? "Create account" : "Sign in"} <ArrowRight size={15} /></button>
    </form>
    <button className="account-switch" onClick={() => setSignup(!signup)}>{signup ? "Already have an account? " : "New to the atelier? "}<strong>{signup ? "Sign in" : "Create one"}</strong></button>
    <button className="google-button" onClick={async () => { if (!supabase) { onNotify("Add your Supabase credentials to enable Google sign in.", "error"); return; } const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin } }); if (error) onNotify(error.message, "error"); }}>Continue with Google</button>
  </div>;
}

function CartPanel({ cart, subtotal, onQuantity, onCheckout, onClose }: { cart: CartItem[]; subtotal: number; onQuantity: (item: CartItem, quantity: number) => void; onCheckout: () => void; onClose: () => void }) {
  return <div className="cart-panel"><div className="drawer-heading"><div><p className="eyebrow">THE ATELIER EDIT</p><h2>Your bag <span>({cart.reduce((n, item) => n + item.quantity, 0)})</span></h2></div><button className="back-link" onClick={onClose}>Continue shopping <ArrowRight size={14} /></button></div>
    {cart.length ? <>    <div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img src={item.product.image_url} alt={item.product.name} /><div className="cart-item-details"><strong>{item.product.name}</strong><span>{money(item.unit_price ?? item.product.price)}</span>{Object.keys(item.selected_options ?? {}).length > 0 && <span className="cart-item-customized">Custom details selected</span>}<div className="quantity-control"><button aria-label={`Remove one ${item.product.name}`} onClick={() => onQuantity(item, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label={`Add one ${item.product.name}`} onClick={() => onQuantity(item, item.quantity + 1)}><Plus size={13} /></button></div></div><button className="remove-item" onClick={() => onQuantity(item, 0)}>Remove</button></div>)}</div>
      <div className="cart-bottom"><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p><span className="muted-small">Shipping charges, if any, are not included. Confirm delivery before dispatch.</span><button className="button button-gold full-button" onClick={onCheckout}>Continue to checkout <ArrowRight size={15} /></button><div className="payment-note">Cash on delivery · Pakistan only</div></div></> : <div className="empty-cart"><ShoppingBag size={25} /><h3>A little room for something lovely.</h3><button className="button button-outline" onClick={onClose}>Explore the collection</button></div>}
  </div>;
}

function CheckoutPanel({ cart, subtotal, busy, onSubmit, onBack }: { cart: CartItem[]; subtotal: number; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onBack: () => void }) {
  return <div className="checkout-panel"><button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to your bag</button><p className="eyebrow">THE FINAL DETAILS</p><h2>On its way<br /><em>to you.</em></h2><form className="stack-form" onSubmit={onSubmit}>
      <label>Full name<input name="full_name" autoComplete="name" minLength={2} required /></label>
      <label>Pakistani mobile number<input name="phone" type="tel" placeholder="03XXXXXXXXX or +923XXXXXXXXX" autoComplete="tel" pattern="(03[0-9]{9}|\+923[0-9]{9})" required /></label>
      <label>Street address<input name="address" autoComplete="street-address" minLength={6} required /></label>
      <div className="form-row"><label>City<select name="city" required defaultValue=""><option value="" disabled>Select city</option>{["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Other"].map(city => <option key={city}>{city}</option>)}</select></label><label>Postal code<input name="postal_code" inputMode="numeric" autoComplete="postal-code" /></label></div>
      <label>Order note <span className="muted-small">(optional)</span><textarea name="notes" rows={2} /></label>
      <label>Coupon code <span className="muted-small">(optional)</span><input name="coupon" autoComplete="off" /></label>
      <div className="checkout-summary"><span>{cart.reduce((n, item) => n + item.quantity, 0)} items · Cash on delivery</span><strong>{money(subtotal)}</strong></div>
      <button className="button button-gold full-button" disabled={busy}>{busy ? "Placing your order…" : "Place order · Cash on delivery"} <ArrowRight size={15} /></button>
      <p className="checkout-terms">Your total includes pieces and coupon discounts only. We’ll confirm delivery arrangements before dispatch.</p>
    </form>
  </div>;
}

function ProductPanel({ product, isSaved, onAdd, onSave, onError }: { product: Product; isSaved: boolean; onAdd: (options: Record<string, string>, priceDelta: number) => void; onSave: () => void; onError: (message: string, tone?: "success" | "error") => void }) {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    if (!supabase || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id)) {
      setOptions([]);
      setSelection({});
      return () => { active = false; };
    }
    void supabase.from("product_options").select("id,name,required,option_values(id,label,price_delta,sort_order)").eq("product_id", product.id).order("sort_order").then(({ data, error }) => {
      if (!active) return;
      if (error) { onError("Could not load this piece’s customization options.", "error"); return; }
      const loaded = (data ?? []) as ProductOption[];
      setOptions(loaded);
      setSelection(Object.fromEntries(loaded.filter(option => option.required && option.option_values.length).map(option => [option.id, option.option_values[0].id])));
    });
    return () => { active = false; };
  }, [onError, product.id]);
  const optionTotal = options.reduce((total, option) => total + (Number(option.option_values.find(value => value.id === selection[option.id])?.price_delta) || 0), 0);
  const missingRequired = options.some(option => option.required && !selection[option.id]);
  return <div className="product-panel"><img src={product.image_url} alt={product.name} /><div className="product-panel-copy"><p className="eyebrow">{product.categories?.name ?? "HADI ATELIER"}</p><h2>{product.name}</h2><p className="product-panel-price">{money(product.price + optionTotal)}</p><p>{product.description}</p>
    {options.map(option => <label className="product-option" key={option.id}>{option.name}{option.required && <span> · required</span>}<select value={selection[option.id] ?? ""} onChange={event => setSelection(current => { const next = { ...current }; if (event.target.value) next[option.id] = event.target.value; else delete next[option.id]; return next; })} required={option.required}><option value="">{option.required ? "Choose an option" : "No preference"}</option>{option.option_values.map(value => <option key={value.id} value={value.id}>{value.label}{Number(value.price_delta) ? ` (+${money(Number(value.price_delta))})` : ""}</option>)}</select></label>)}
    <p className="stock-note">{product.inventory > 0 ? `${product.inventory} considered pieces remain` : "Currently out of stock"}</p><button className="button button-gold full-button" onClick={() => onAdd(selection, optionTotal)} disabled={!product.inventory || missingRequired}>Add to bag <ArrowRight size={15} /></button><button className="save-product" onClick={onSave}><Heart size={15} fill={isSaved ? "currentColor" : "none"} /> {isSaved ? "Saved for later" : "Save for later"}</button></div></div>;
}

function AdminGate({ profile, onOpenLogin, onNotify, products, categories, onRefresh }: { profile: Profile | null; onOpenLogin: () => void; onNotify: (message: string, tone?: "success" | "error") => void; products: Product[]; categories: Category[]; onRefresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!unlocked) return;
    const timeout = window.setTimeout(() => setUnlocked(false), 30 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [unlocked]);
  if (!profile) return <main className="admin-gate"><Link to="/" className="wordmark">HADI <span>ATELIER</span></Link><div><p className="eyebrow">PRIVATE ATELIER</p><h1>Admin access<br /><em>is reserved.</em></h1><p>Sign in with an authorized atelier account to continue.</p><button className="button button-gold" onClick={onOpenLogin}>Sign in <ArrowRight size={15} /></button><Link className="back-link" to="/">Return to the collection</Link></div></main>;
  if (profile.role !== "admin") return <main className="admin-gate"><Link to="/" className="wordmark">HADI <span>ATELIER</span></Link><div><p className="eyebrow">PRIVATE ATELIER</p><h1>This door<br /><em>is not yours.</em></h1><p>Your account does not have administrator access.</p><Link className="back-link" to="/">Return to the collection</Link></div></main>;
  if (!unlocked) return <main className="admin-gate"><Link to="/" className="wordmark">HADI <span>ATELIER</span></Link><form className="admin-unlock" onSubmit={async event => { event.preventDefault(); if (!supabase) return; setLoading(true); const favoriteCar = String(new FormData(event.currentTarget).get("favorite_car")); const { data, error } = await supabase.functions.invoke("admin-gate", { body: { favorite_car: favoriteCar } }); setLoading(false); if (error || !data?.verified) { onNotify(error?.message ?? "Verification failed.", "error"); return; } setUnlocked(true); onNotify("Welcome to the atelier."); }}><p className="eyebrow">A SECOND KEY</p><h1>One more<br /><em>quiet check.</em></h1><p>Verify your favorite car before continuing.</p><label>Favorite car<input name="favorite_car" required autoComplete="off" /></label><button className="button button-gold" disabled={loading}>{loading ? "Verifying…" : "Verify access"} <ArrowRight size={15} /></button><Link className="back-link" to="/">Return to the collection</Link></form></main>;
  return <main className="admin-page"><header><Link to="/" className="wordmark">HADI <span>ATELIER</span></Link><button className="back-link" onClick={() => navigate("/")}>View storefront <ArrowUpRight size={14} /></button></header><div className="admin-content"><p className="eyebrow">PRIVATE ATELIER · ADMINISTRATION</p><h1>Good morning,<br /><em>{profile.full_name?.split(" ")[0] ?? "Hadi"}.</em></h1><div className="admin-metrics"><article><span>Live pieces</span><strong>{products.length}</strong></article><article><span>Signed in as</span><strong className="admin-email">{profile.email}</strong></article><article><span>Connected store</span><strong>{isSupabaseConfigured ? "Supabase" : "Preview mode"}</strong></article></div>  {isSupabaseConfigured ? <AdminProducts products={products} categories={categories} onRefresh={onRefresh} onNotify={onNotify} /> : <p className="admin-note">Configure Supabase to manage products, orders, and inventory. No changes are saved in preview mode.</p>}<h2 className="admin-section-title">Orders</h2>{isSupabaseConfigured ? <AdminOrders onNotify={onNotify} /> : <p className="muted-small">Connect your Supabase project to see orders.</p>}</div></main>;
}

function AdminProducts({ products, categories, onRefresh, onNotify }: { products: Product[]; categories: Category[]; onRefresh: () => Promise<void>; onNotify: (message: string, tone?: "success" | "error") => void }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  return <section className="admin-products"><div className="admin-section-header"><h2>Products</h2><button className="button button-outline" onClick={() => setEditing({ id: "", name: "", slug: "", description: "", price: 0, compare_at_price: null, image_url: "", category_id: null, inventory: 0, is_featured: false, is_new: false, is_bestseller: false })}><Plus size={14} /> Add piece</button></div>
    {optionsProduct && <AdminOptionEditor product={optionsProduct} onClose={() => setOptionsProduct(null)} onNotify={onNotify} />}
    {editing && <form className="admin-product-form" onSubmit={async event => { event.preventDefault(); if (!supabase) return; const values = new FormData(event.currentTarget); const payload = { category_id: String(values.get("category_id") ?? "") || null, name: values.get("name"), slug: values.get("slug"), description: values.get("description"), price: Number(values.get("price")), image_url: values.get("image_url"), inventory: Number(values.get("inventory")), is_active: true, is_featured: values.has("is_featured"), is_new: values.has("is_new"), is_bestseller: values.has("is_bestseller") }; setSaving(true); const request = editing.id ? supabase.from("products").update(payload).eq("id", editing.id) : supabase.from("products").insert(payload); const { error } = await request; setSaving(false); if (error) { onNotify(error.message, "error"); return; } await onRefresh(); setEditing(null); onNotify("Piece saved."); }}><div className="admin-form-grid"><label>Product name<input name="name" defaultValue={editing.name} required /></label><label>Slug<input name="slug" defaultValue={editing.slug} placeholder="product-name" required /></label><label>Category<select name="category_id" defaultValue={editing.category_id ?? ""}><option value="">Uncategorized</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Price (PKR)<input name="price" type="number" min="1" defaultValue={editing.price || ""} required /></label><label>Inventory<input name="inventory" type="number" min="0" defaultValue={editing.inventory} required /></label><label className="admin-wide">Image URL<input name="image_url" type="url" defaultValue={editing.image_url} required /></label><label className="admin-wide">Upload product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async event => { const file = event.currentTarget.files?.[0]; const form = event.currentTarget.form; if (!file || !form || !supabase) return; const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const { error } = await supabase.storage.from("product-media").upload(path, file, { upsert: false }); if (error) { onNotify(error.message, "error"); return; } const { data } = supabase.storage.from("product-media").getPublicUrl(path); const imageInput = form.elements.namedItem("image_url"); if (imageInput instanceof HTMLInputElement) imageInput.value = data.publicUrl; onNotify("Image uploaded."); }} /></label><label className="admin-wide">Description<textarea name="description" rows={2} defaultValue={editing.description} required /></label><label className="checkbox-label"><input type="checkbox" name="is_featured" defaultChecked={editing.is_featured} /> Featured</label><label className="checkbox-label"><input type="checkbox" name="is_new" defaultChecked={editing.is_new} /> New arrival</label><label className="checkbox-label"><input type="checkbox" name="is_bestseller" defaultChecked={editing.is_bestseller} /> Atelier favourite</label></div><div className="admin-form-actions"><button type="button" className="back-link" onClick={() => setEditing(null)}>Cancel</button><button className="button button-gold" disabled={saving}>{saving ? "Saving…" : "Save piece"}</button></div></form>}
    <div className="admin-product-list">{products.map(product => <div key={product.id}><img src={product.image_url} alt="" /><span>{product.name}</span><span>{money(product.price)}</span><span>{product.inventory} in stock</span><button onClick={() => setEditing(product)} aria-label={`Edit ${product.name}`}>Edit</button><button onClick={() => setOptionsProduct(product)} aria-label={`Edit options for ${product.name}`}>Options</button><button onClick={async () => { if (!supabase || !window.confirm(`Delete ${product.name}?`)) return; const { error } = await supabase.from("products").delete().eq("id", product.id); if (error) { onNotify(error.message, "error"); return; } await onRefresh(); onNotify("Piece deleted."); }} aria-label={`Delete ${product.name}`}>Delete</button></div>)}</div>
  </section>;
}

function AdminOptionEditor({ product, onClose, onNotify }: { product: Product; onClose: () => void; onNotify: (message: string, tone?: "success" | "error") => void }) {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [busy, setBusy] = useState(false);
  const loadOptions = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("product_options").select("id,name,required,option_values(id,label,price_delta,sort_order)").eq("product_id", product.id).order("sort_order");
    if (error) onNotify(error.message, "error");
    else setOptions((data ?? []) as ProductOption[]);
  }, [onNotify, product.id]);
  useEffect(() => { void loadOptions(); }, [loadOptions]);
  return <div className="admin-option-editor"><div className="admin-section-header"><h3>Options · {product.name}</h3><button className="back-link" onClick={onClose}>Close</button></div>
    {options.map(option => <div className="admin-option-row" key={option.id}><div><strong>{option.name}{option.required ? " · required" : ""}</strong><span>{option.option_values.map(value => `${value.label}${Number(value.price_delta) ? ` (+${money(Number(value.price_delta))})` : ""}`).join(" · ")}</span></div><button className="back-link" onClick={async () => { if (!supabase || !window.confirm(`Remove ${option.name} and its values?`)) return; const { error } = await supabase.from("product_options").delete().eq("id", option.id); if (error) onNotify(error.message, "error"); else { await loadOptions(); onNotify("Product option removed."); } }}>Remove</button></div>)}
    <form className="admin-option-form" onSubmit={async event => { event.preventDefault(); if (!supabase) return; const form = event.currentTarget; const values = new FormData(form); const name = String(values.get("name")).trim(); const choices = String(values.get("values")).split(",").map(choice => { const trimmed = choice.trim(); const match = trimmed.match(/^(.*):\s*(-?\d+(?:\.\d+)?)$/); return { label: (match?.[1] ?? trimmed).trim(), price_delta: Number(match?.[2] ?? 0) }; }).filter(choice => choice.label); if (!name || !choices.length) { onNotify("Add an option name and at least one value.", "error"); return; } setBusy(true); const { data, error } = await supabase.from("product_options").insert({ product_id: product.id, name, required: values.has("required"), sort_order: options.length + 1 }).select("id").single(); if (error || !data) { setBusy(false); onNotify(error?.message ?? "Could not create option.", "error"); return; } const { error: valueError } = await supabase.from("option_values").insert(choices.map((choice, index) => ({ option_id: data.id, label: choice.label, price_delta: choice.price_delta, sort_order: index + 1 }))); setBusy(false); if (valueError) { const { error: cleanupError } = await supabase.from("product_options").delete().eq("id", data.id); onNotify(cleanupError ? `${valueError.message}. Cleanup also failed: ${cleanupError.message}` : valueError.message, "error"); return; } form.reset(); await loadOptions(); onNotify("Product option saved."); }}><label>Option name<input name="name" placeholder="Leather finish" required /></label><label>Choices <span className="muted-small">(comma-separated; optional price delta as “Gift box:1800”)</span><input name="values" placeholder="Cognac, Espresso, Gift box:1800" required /></label><label className="checkbox-label"><input type="checkbox" name="required" /> Required before checkout</label><button className="button button-outline" disabled={busy}>{busy ? "Saving…" : "Add option"}</button></form>
  </div>;
}

function AdminOrders({ onNotify }: { onNotify: (message: string, tone?: "success" | "error") => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const loadOrders = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("orders").select("id,tracking_number,status,total,created_at,shipping_address").order("created_at", { ascending: false }).limit(100);
    if (error) onNotify(error.message, "error");
    else setOrders((data ?? []) as Order[]);
  }, [onNotify]);
  useEffect(() => {
    if (!supabase) return;
    void loadOrders();
    const channel = supabase.channel("admin-order-updates").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { void loadOrders(); }).subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [loadOrders]);
  const exportOrders = () => {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = ["Tracking,Status,Total,City,Created", ...orders.map(order => [
      quote(order.tracking_number), quote(order.status), quote(order.total),
      quote(order.shipping_address.city ?? ""), quote(order.created_at),
    ].join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "hadi-atelier-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="admin-orders"><div className="admin-order-tools"><span className="muted-small">Live order updates · {orders.length} recent orders</span><button className="back-link" onClick={exportOrders}>Download CSV <ArrowDown size={13} /></button></div>{orders.length ? orders.map(order => <div key={order.id}><div><strong>{order.tracking_number}</strong><span>{new Date(order.created_at).toLocaleDateString()}</span></div><span>{order.shipping_address.city ?? "Pakistan"}</span><strong>{money(order.total)}</strong><select aria-label={`Update status for ${order.tracking_number}`} value={order.status} onChange={async event => { if (!supabase) return; const { error } = await supabase.from("orders").update({ status: event.target.value }).eq("id", order.id); if (error) onNotify(error.message, "error"); else { onNotify("Order status updated."); await loadOrders(); } }}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>) : <p className="muted-small">New orders will appear here.</p>}</div>;
}

function ResetPasswordPage({ onNotify }: { onNotify: (message: string, tone?: "success" | "error") => void }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return <main className="order-page"><Link to="/" className="wordmark">HADI <span>ATELIER</span></Link><form className="account-panel reset-panel" onSubmit={async event => { event.preventDefault(); if (!supabase) { onNotify("Supabase is not configured.", "error"); return; } const password = String(new FormData(event.currentTarget).get("password")); setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false); if (error) { onNotify(error.message, "error"); return; } onNotify("Your password has been updated."); navigate("/"); }}><p className="eyebrow">ACCOUNT RECOVERY</p><h2>A fresh<br /><em>beginning.</em></h2><p>Choose a new password for your atelier account.</p><div className="stack-form"><label>New password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label><button className="button button-gold full-button" disabled={busy}>{busy ? "Updating…" : "Update password"} <ArrowRight size={15} /></button></div></form></main>;
}

export default App;
