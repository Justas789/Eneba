import React, { useEffect, useState } from 'react';
import {
  Search, ShoppingCart, User as UserIcon, ShieldCheck, Globe, Monitor,
  CheckCircle2, Sparkles, Tag, Trash2, KeyRound, CreditCard, LogOut, ArrowLeft, Star
} from 'lucide-react';
import { api } from './api';
import { BannerData, CartItem, Offer, Order, OrderItem, Product, User } from './types';

type View = 'home' | 'store' | 'product' | 'cart' | 'checkout' | 'success' | 'orders' | 'auth';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('eneba_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [searchQuery, setSearchQuery] = useState('');

  const [banner, setBanner] = useState<BannerData | null>(null);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('popular');
  const [loadingStore, setLoadingStore] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('eneba_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastOrder, setLastOrder] = useState<{ orderId: number; total: number; items: OrderItem[] } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('demo@eneba.com');
  const [authPassword, setAuthPassword] = useState('demo123');
  const [authError, setAuthError] = useState('');
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<View>('home');

  useEffect(() => {
    localStorage.setItem('eneba_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    api.getBanner().then(setBanner);
    api.getBestSellers().then(setBestSellers);
    api.getDeals().then(setDeals);
  }, []);

  useEffect(() => {
    if (view === 'store') {
      setLoadingStore(true);
      api.getProducts({
        search: searchQuery,
        platform: platformFilter,
        region: regionFilter,
        maxPrice: maxPriceFilter,
        sort: sortOrder,
      })
        .then(setProducts)
        .finally(() => setLoadingStore(false));
    }
  }, [view, searchQuery, platformFilter, regionFilter, maxPriceFilter, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setView('store');
  };

  const openProduct = async (id: number) => {
    const prod = await api.getProduct(id);
    setSelectedProduct(prod);
    setView('product');
    window.scrollTo(0, 0);
  };

  const addToCart = (product: Product, offer: Offer) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.offerId === offer.id);
      if (existing) {
        return prev.map((i) => (i.offerId === offer.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          offerId: offer.id,
          productId: product.id,
          title: product.title,
          platform: product.platform,
          region: product.region,
          image: product.image,
          sellerName: offer.seller_name,
          price: offer.price,
          quantity: 1,
        },
      ];
    });
    setView('cart');
  };

  const removeFromCart = (offerId: number) => {
    setCart((prev) => prev.filter((i) => i.offerId !== offerId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const proceedToCheckout = () => {
    if (!user) {
      setRedirectAfterAuth('checkout');
      setView('auth');
      return;
    }
    setView('checkout');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.checkout(
        cart.map((item) => ({ offerId: item.offerId, quantity: item.quantity }))
      );
      setLastOrder(result);
      setCart([]);
      setView('success');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res =
        authMode === 'login'
          ? await api.login(authEmail, authPassword)
          : await api.register(authName, authEmail, authPassword);

      localStorage.setItem('eneba_token', res.token);
      localStorage.setItem('eneba_user', JSON.stringify(res.user));
      setUser(res.user);
      setView(redirectAfterAuth);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('eneba_token');
    localStorage.removeItem('eneba_user');
    setUser(null);
    setView('home');
  };

  const openOrders = async () => {
    if (!user) {
      setRedirectAfterAuth('orders');
      setView('auth');
      return;
    }
    const list = await api.getOrders();
    setOrders(list);
    setView('orders');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1f0a4d] text-white">
      <header className="sticky top-0 z-50 bg-[#4618ac] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setSearchQuery('');
                setView('home');
              }}
              className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white"
            >
              <span className="bg-[#fad318] text-[#1f0a4d] px-2.5 py-0.5 rounded-md font-black">E</span>
              <span>eneba</span>
            </button>

            <nav className="hidden md:flex items-center gap-4 text-sm font-semibold">
              <button
                onClick={() => setView('home')}
                className={`px-3 py-1.5 rounded transition ${view === 'home' ? 'bg-white/15 text-[#fad318]' : 'hover:bg-white/10'}`}
              >
                Pradžia
              </button>
              <button
                onClick={() => setView('store')}
                className={`px-3 py-1.5 rounded transition ${view === 'store' ? 'bg-white/15 text-[#fad318]' : 'hover:bg-white/10'}`}
              >
                Parduotuvė (Katalogas)
              </button>
            </nav>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ieškokite žaidimų, papildymų (pvz. Cyberpunk, Elden)..."
                className="w-full bg-[#1f0a4d]/80 border border-white/25 focus:border-[#fad318] outline-none rounded-md pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/50 transition"
              />
            </div>
          </form>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('cart')}
              className="relative p-2.5 rounded-md hover:bg-white/10 transition"
              title="Krepšelis"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#fad318] text-[#1f0a4d] text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={openOrders}
                  className="text-sm font-semibold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-md flex items-center gap-2 transition"
                >
                  <KeyRound className="w-4 h-4 text-[#fad318]" />
                  <span className="hidden sm:inline">Mano raktai</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-md hover:bg-white/10 text-white/80 hover:text-white"
                  title="Atsijungti"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setRedirectAfterAuth('home');
                  setView('auth');
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md text-sm font-bold transition"
              >
                <UserIcon className="w-4 h-4 text-[#fad318]" />
                <span>Prisijungti</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {view === 'home' && (
          <div className="space-y-12">
            {banner && (
              <section className="relative rounded-xl overflow-hidden bg-[#2b0f6b] border border-white/10 shadow-2xl">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-80 object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1f0a4d] via-[#1f0a4d]/80 to-transparent flex flex-col justify-center p-8 md:p-12 max-w-2xl">
                  <span className="inline-block w-fit bg-[#fad318] text-[#1f0a4d] text-xs font-black px-3 py-1 rounded uppercase tracking-wider mb-3">
                    {banner.badge}
                  </span>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
                    {banner.title}
                  </h1>
                  <p className="text-white/80 text-sm md:text-base mb-6">
                    {banner.subtitle}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openProduct(banner.productId)}
                      className="bg-[#fad318] hover:bg-[#ffe042] text-[#1f0a4d] font-extrabold px-6 py-3 rounded-md transition shadow-lg"
                    >
                      {banner.ctaText}
                    </button>
                    <button
                      onClick={() => setView('store')}
                      className="bg-white/15 hover:bg-white/25 text-white font-bold px-6 py-3 rounded-md transition"
                    >
                      Visi žaidimai
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#fad318]" />
                  Perkamiausi žaidimai
                </h2>
                <button
                  onClick={() => setView('store')}
                  className="text-sm font-bold text-[#fad318] hover:underline"
                >
                  Žiūrėti visus →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {bestSellers.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={openProduct} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <Tag className="w-6 h-6 text-[#23d18b]" />
                  Dienos pasiūlymai
                </h2>
                <button
                  onClick={() => setView('store')}
                  className="text-sm font-bold text-[#fad318] hover:underline"
                >
                  Daugiau nuolaidų →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {deals.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={openProduct} />
                ))}
              </div>
            </section>
          </div>
        )}

        {view === 'store' && (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-64 shrink-0 bg-[#2b0f6b] p-5 rounded-xl border border-white/10 h-fit space-y-6">
              <h3 className="font-extrabold text-lg border-b border-white/10 pb-3">Filtrai</h3>

              <div>
                <label className="block text-xs font-bold uppercase text-white/70 mb-2">Platforma</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full bg-[#1f0a4d] border border-white/20 rounded-md p-2.5 text-sm"
                >
                  <option value="ALL">Visos platformos</option>
                  <option value="Steam">Steam</option>
                  <option value="PSN">PlayStation (PSN)</option>
                  <option value="Xbox">Xbox</option>
                  <option value="Rockstar">Rockstar</option>
                  <option value="GOG">GOG.com</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-white/70 mb-2">Regionas</label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full bg-[#1f0a4d] border border-white/20 rounded-md p-2.5 text-sm"
                >
                  <option value="ALL">Visi regionai</option>
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="EUROPE">EUROPE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-white/70 mb-2">Maksimali kaina (€)</label>
                <input
                  type="number"
                  placeholder="pvz. 30"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(e.target.value)}
                  className="w-full bg-[#1f0a4d] border border-white/20 rounded-md p-2.5 text-sm"
                />
              </div>

              <button
                onClick={() => {
                  setPlatformFilter('ALL');
                  setRegionFilter('ALL');
                  setMaxPriceFilter('');
                  setSearchQuery('');
                }}
                className="w-full py-2 text-xs font-bold text-[#fad318] hover:underline"
              >
                Išvalyti visus filtrus
              </button>
            </aside>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-[#2b0f6b] p-4 rounded-xl border border-white/10">
                <div>
                  <h1 className="text-xl font-extrabold">
                    {searchQuery ? `Paieškos rezultatai: "${searchQuery}"` : 'Visi žaidimai'}
                  </h1>
                  <p className="text-xs text-white/60">Rasta produktų: {products.length}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70">Rikiuoti:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-[#1f0a4d] border border-white/20 rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="popular">Populiariausi</option>
                    <option value="price_asc">Kaina: nuo mažiausios</option>
                    <option value="price_desc">Kaina: nuo didžiausios</option>
                    <option value="name_asc">Pavadinimas: A–Z</option>
                  </select>
                </div>
              </div>

              {loadingStore ? (
                <div className="text-center py-20 text-white/60">Kraunami produktai...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-[#2b0f6b] rounded-xl">
                  <p className="text-lg font-bold mb-2">Nieko nerasta</p>
                  <p className="text-sm text-white/60">Pabandykite pakeisti paieškos frazę arba filtrus.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onSelect={openProduct} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'product' && selectedProduct && (
          <div className="space-y-8">
            <button
              onClick={() => setView('store')}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Grįžti į katalogą
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-[#2b0f6b] p-6 md:p-8 rounded-xl border border-white/10">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="w-full h-80 object-cover rounded-lg shadow-lg"
              />
              <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="bg-[#4618ac] px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5 text-[#fad318]" /> {selectedProduct.platform}
                    </span>
                    <span className="bg-[#4618ac] px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-[#23d18b]" /> {selectedProduct.region}
                    </span>
                    <span className="bg-white/10 px-3 py-1 rounded text-xs font-semibold">
                      {selectedProduct.genre}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black mb-4">{selectedProduct.title}</h1>
                  <p className="text-white/80 leading-relaxed">{selectedProduct.description}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#23d18b] shrink-0" />
                    <span>Skaitmeninis raktas (Momentinis pristatymas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#fad318] shrink-0" />
                    <span>Patikrinti pardavėjai</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold mb-4">
                Pardavėjų pasiūlymai ({selectedProduct.offers?.length || 0})
              </h2>
              <div className="space-y-3">
                {selectedProduct.offers?.map((offer, index) => (
                  <div
                    key={offer.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border ${
                      index === 0
                        ? 'bg-[#351382] border-[#fad318]'
                        : 'bg-[#2b0f6b] border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{offer.seller_name}</span>
                        {index === 0 && (
                          <span className="bg-[#fad318] text-[#1f0a4d] text-[11px] font-black px-2 py-0.5 rounded">
                            GERIAUSIA KAINA
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/70 mt-1">
                        <span className="flex items-center gap-1 text-[#23d18b] font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" /> {offer.seller_rating}% teigiamų
                        </span>
                        <span>Pardavimų: {offer.sales_count}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-xs line-through text-white/50 block">
                          €{offer.original_price.toFixed(2)}
                        </span>
                        <span className="text-2xl font-black text-white">
                          €{offer.price.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => addToCart(selectedProduct, offer)}
                        className="bg-[#fad318] hover:bg-[#ffe042] text-[#1f0a4d] font-extrabold px-5 py-2.5 rounded-md transition"
                      >
                        Į krepšelį
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'cart' && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-extrabold mb-6">Jūsų krepšelis ({cartCount})</h1>
            {cart.length === 0 ? (
              <div className="bg-[#2b0f6b] p-12 rounded-xl text-center space-y-4">
                <p className="text-lg font-bold">Krepšelis šiuo metu tuščias</p>
                <button
                  onClick={() => setView('store')}
                  className="bg-[#fad318] text-[#1f0a4d] font-extrabold px-6 py-2.5 rounded-md"
                >
                  Naršyti žaidimus
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.offerId}
                      className="flex items-center justify-between gap-4 bg-[#2b0f6b] p-4 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <img src={item.image} alt={item.title} className="w-16 h-20 object-cover rounded" />
                        <div>
                          <h3 className="font-bold">{item.title}</h3>
                          <p className="text-xs text-white/60">
                            {item.platform} • {item.region} • Pardavėjas: {item.sellerName}
                          </p>
                          <p className="text-sm font-extrabold text-[#fad318] mt-1">
                            €{item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.offerId)}
                        className="p-2 text-white/50 hover:text-red-400"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-[#2b0f6b] p-6 rounded-xl border border-white/10 h-fit space-y-4">
                  <h3 className="font-extrabold text-lg">Užsakymo suvestinė</h3>
                  <div className="flex justify-between text-sm text-white/70">
                    <span>Prekės ({cartCount})</span>
                    <span>€{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/70">
                    <span>Aptarnavimo mokestis</span>
                    <span>€0.00</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 flex justify-between text-xl font-black">
                    <span>Viso:</span>
                    <span className="text-[#fad318]">€{cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={proceedToCheckout}
                    className="w-full bg-[#fad318] hover:bg-[#ffe042] text-[#1f0a4d] font-extrabold py-3 rounded-md transition"
                  >
                    Tęsti apmokėjimą
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'checkout' && (
          <div className="max-w-xl mx-auto bg-[#2b0f6b] p-8 rounded-xl border border-white/10">
            <h1 className="text-2xl font-extrabold mb-2 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#fad318]" /> Apmokėjimas (Testinis režimas)
            </h1>
            <p className="text-xs text-white/60 mb-6">
              Tikri pinigai nebus nuskaičiuoti. Po patvirtinimo iškart gausite skaitmeninius raktus.
            </p>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Mokėtojas</label>
                <input
                  type="text"
                  disabled
                  value={`${user?.name} (${user?.email})`}
                  className="w-full bg-[#1f0a4d]/60 border border-white/15 rounded p-2.5 text-sm text-white/70"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Testinės kortelės numeris</label>
                <input
                  type="text"
                  defaultValue="4532 •••• •••• 8899"
                  required
                  className="w-full bg-[#1f0a4d] border border-white/20 rounded p-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Galiojimo data</label>
                  <input
                    type="text"
                    defaultValue="12/28"
                    required
                    className="w-full bg-[#1f0a4d] border border-white/20 rounded p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">CVC</label>
                  <input
                    type="text"
                    defaultValue="777"
                    required
                    className="w-full bg-[#1f0a4d] border border-white/20 rounded p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="font-bold">Mokėtina suma:</span>
                <span className="text-2xl font-black text-[#fad318]">€{cartTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#23d18b] hover:bg-[#2be69b] text-[#1f0a4d] font-black py-3.5 rounded-md transition text-base"
              >
                Apmokėti ir gauti raktus
              </button>
            </form>
          </div>
        )}

        {view === 'success' && lastOrder && (
          <div className="max-w-2xl mx-auto bg-[#2b0f6b] p-8 rounded-xl border border-[#23d18b]/50 text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-[#23d18b] mx-auto" />
            <div>
              <h1 className="text-3xl font-black">Ačiū už pirkinį!</h1>
              <p className="text-white/70 text-sm mt-1">
                Užsakymas #{lastOrder.orderId} sėkmingai apmokėtas (€{lastOrder.total.toFixed(2)}).
              </p>
            </div>

            <div className="space-y-3 text-left">
              <h3 className="font-bold text-sm uppercase text-white/60">Jūsų skaitmeniniai raktai:</h3>
              {lastOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#1f0a4d] p-4 rounded-lg border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-bold">{item.title}</p>
                    <p className="text-xs text-white/60">Platforma: {item.platform}</p>
                  </div>
                  <div className="bg-[#4618ac] px-4 py-2 rounded font-mono font-bold text-[#fad318] tracking-wider select-all">
                    {item.digital_key}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={openOrders}
                className="bg-white/15 hover:bg-white/25 px-5 py-2.5 rounded-md font-bold text-sm"
              >
                Užsakymų istorija
              </button>
              <button
                onClick={() => setView('home')}
                className="bg-[#fad318] text-[#1f0a4d] px-5 py-2.5 rounded-md font-extrabold text-sm"
              >
                Tęsti apsipirkimą
              </button>
            </div>
          </div>
        )}

        {view === 'orders' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-extrabold">Mano užsakymų istorija ir raktai</h1>
            {orders.length === 0 ? (
              <p className="text-white/60 bg-[#2b0f6b] p-8 rounded-xl">Dar neturite jokių užsakymų.</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-[#2b0f6b] p-6 rounded-xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <div>
                      <span className="font-extrabold">Užsakymas #{order.id}</span>
                      <span className="text-xs text-white/60 ml-3">{order.created_at}</span>
                    </div>
                    <span className="font-black text-[#fad318]">€{order.total_price.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#1f0a4d] p-3 rounded text-sm">
                        <span>
                          {item.title} <span className="text-xs text-white/50">({item.platform})</span>
                        </span>
                        <code className="text-[#23d18b] font-bold select-all">{item.digital_key}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'auth' && (
          <div className="max-w-md mx-auto bg-[#2b0f6b] p-8 rounded-xl border border-white/10">
            <h1 className="text-2xl font-black mb-2">
              {authMode === 'login' ? 'Prisijungti prie Eneba' : 'Sukurti paskyrą'}
            </h1>
            <p className="text-xs text-white/60 mb-6">
              Demo paskyra jau įvesta: <b>demo@eneba.com</b> / <b>demo123</b>
            </p>

            {authError && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs p-3 rounded mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold mb-1">Vardas</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-[#1f0a4d] border border-white/20 rounded p-2.5 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold mb-1">El. paštas</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#1f0a4d] border border-white/20 rounded p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Slaptažodis</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#1f0a4d] border border-white/20 rounded p-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#fad318] hover:bg-[#ffe042] text-[#1f0a4d] font-extrabold py-3 rounded-md transition"
              >
                {authMode === 'login' ? 'Prisijungti' : 'Registruotis'}
              </button>
            </form>

            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full text-center text-xs text-white/70 hover:text-[#fad318] mt-4"
            >
              {authMode === 'login'
                ? 'Neturite paskyros? Užsiregistruokite'
                : 'Jau turite paskyrą? Prisijunkite'}
            </button>
          </div>
        )}
      </main>

      <footer className="bg-[#160638] border-t border-white/10 py-6 text-center text-xs text-white/50">
        Eneba Intern Assignment 2027 • Sukurta su React, TypeScript, PHP 8 ir SQLite
      </footer>
    </div>
  );
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: (id: number) => void }) {
  const discount =
    product.original_price && product.lowest_price
      ? Math.round(((product.original_price - product.lowest_price) / product.original_price) * 100)
      : 0;

  return (
    <div
      onClick={() => onSelect(product.id)}
      className="group bg-[#2b0f6b] hover:bg-[#351382] rounded-xl overflow-hidden border border-white/10 hover:border-[#fad318]/60 transition cursor-pointer flex flex-col shadow-lg"
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        <span className="absolute bottom-2 left-2 bg-[#1f0a4d]/90 backdrop-blur px-2.5 py-1 rounded text-xs font-bold">
          {product.platform}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm line-clamp-2 group-hover:text-[#fad318] transition">
            {product.title}
          </h3>
          <span className="text-[11px] font-extrabold text-[#23d18b] uppercase mt-1 block">
            {product.region}
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="text-[11px] text-white/50 block">Nuo</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black">€{Number(product.lowest_price).toFixed(2)}</span>
            {discount > 0 && (
              <span className="bg-[#23d18b]/20 text-[#23d18b] text-xs font-extrabold px-2 py-0.5 rounded">
                -{discount}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
