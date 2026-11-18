import { BannerData, Order, Product, User } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('eneba_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  getBanner: async (): Promise<BannerData> => {
    const res = await fetch(`${API_URL}/home/banner`);
    return res.json();
  },
  getBestSellers: async (): Promise<Product[]> => {
    const res = await fetch(`${API_URL}/home/bestsellers`);
    return res.json();
  },
  getDeals: async (): Promise<Product[]> => {
    const res = await fetch(`${API_URL}/home/deals`);
    return res.json();
  },
  getProducts: async (params: {
    search?: string;
    platform?: string;
    region?: string;
    maxPrice?: string;
    sort?: string;
  }): Promise<Product[]> => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.platform) query.set('platform', params.platform);
    if (params.region) query.set('region', params.region);
    if (params.maxPrice) query.set('maxPrice', params.maxPrice);
    if (params.sort) query.set('sort', params.sort);
    const res = await fetch(`${API_URL}/products?${query.toString()}`);
    return res.json();
  },
  getProduct: async (id: number): Promise<Product> => {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (!res.ok) throw new Error('Produktas nerastas');
    return res.json();
  },
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Prisijungimo klaida');
    return data;
  },
  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registracijos klaida');
    return data;
  },
  checkout: async (items: { offerId: number; quantity: number }[]) => {
    const res = await fetch(`${API_URL}/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Apmokėjimo klaida');
    return data;
  },
  getOrders: async (): Promise<Order[]> => {
    const res = await fetch(`${API_URL}/orders`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Nepavyko gauti užsakymų');
    return res.json();
  },
};
