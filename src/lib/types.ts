export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  image_url: string;
  category_id: string | null;
  inventory: number;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  categories?: Category | null;
  product_options?: ProductOption[];
};

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  selected_options?: Record<string, string>;
  unit_price?: number;
};

export type ProductOption = {
  id: string;
  name: string;
  required: boolean;
  option_values: { id: string; label: string; price_delta: number; sort_order: number }[];
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  role: "user" | "admin";
};

export type Order = {
  id: string;
  tracking_number: string;
  status: string;
  total: number;
  created_at: string;
  shipping_address: Record<string, string>;
};

export const money = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
