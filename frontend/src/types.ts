export interface Offer {
  id: number;
  product_id: number;
  seller_name: string;
  seller_rating: number;
  sales_count: number;
  price: number;
  original_price: number;
}

export interface Product {
  id: number;
  title: string;
  platform: string;
  region: string;
  genre: string;
  description: string;
  image: string;
  is_bestseller: number;
  is_deal: number;
  lowest_price?: number;
  original_price?: number;
  offer_count?: number;
  offers?: Offer[];
}

export interface BannerData {
  title: string;
  subtitle: string;
  ctaText: string;
  badge: string;
  productId: number;
  image: string;
}

export interface CartItem {
  offerId: number;
  productId: number;
  title: string;
  platform: string;
  region: string;
  image: string;
  sellerName: string;
  price: number;
  quantity: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface OrderItem {
  title: string;
  platform: string;
  seller: string;
  price: number;
  digital_key: string;
}

export interface Order {
  id: number;
  total_price: number;
  created_at: string;
  items: OrderItem[];
}
