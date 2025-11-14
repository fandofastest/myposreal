  "use client";
import React, { useEffect, useMemo, useState } from "react";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import { Box, Button, Grid, Paper, TextField, Typography, Alert, Divider, Select, MenuItem, FormControl, InputLabel, Snackbar, ButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch, IconButton, Tooltip, Chip } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

interface ProductItem {
  _id: string;
  name: string;
  sku?: string;
  price: number;
  imageUrl?: string;
  unitPrices?: Array<{ code: string; price: number }>;
}

interface CartItem {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  qty: number;
  unitCode?: string;
  unitFactor?: number;
}


export default function PosSalesPage() {
  const [me, setMe] = useState<any>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  const [q, setQ] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [pmList, setPmList] = useState<any[]>([]);
  const [pmId, setPmId] = useState<string>("");
  const [pmType, setPmType] = useState<'cash' | 'transfer' | 'ewallet' | ''>('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [storeSetting, setStoreSetting] = useState<any>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [highContrast, setHighContrast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [favorites, setFavorites] = useState<Array<{ productId: string; unitCode: string }>>([]);
  const [recents, setRecents] = useState<Array<{ productId: string; unitCode: string; at: number }>>([]);
  const [holds, setHolds] = useState<Array<{ id: string; name: string; at: number; payload: any }>>([]);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdListOpen, setHoldListOpen] = useState(false);
  const [holdName, setHoldName] = useState("");

  // Favorites & Recents helpers
  const favKey = (pid: string, unit: string) => `${pid}::${unit}`;
  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem('pos_favorites') || '[]');
      const r = JSON.parse(localStorage.getItem('pos_recents') || '[]');
      if (Array.isArray(f)) setFavorites(f.filter((x: any) => x && x.productId && x.unitCode));
      if (Array.isArray(r)) setRecents(r.filter((x: any) => x && x.productId && x.unitCode && x.at));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('pos_favorites', JSON.stringify(favorites)); } catch {}
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem('pos_recents', JSON.stringify(recents.slice(0, 20))); } catch {}
  }, [recents]);
  useEffect(() => {
    try {
      const hs = JSON.parse(localStorage.getItem('pos_holds') || '[]');
      if (Array.isArray(hs)) setHolds(hs);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('pos_holds', JSON.stringify(holds)); } catch {}
  }, [holds]);
  const isFavorite = (pid: string, unit: string) => favorites.some(f => f.productId === pid && f.unitCode === unit);
  const toggleFavorite = (pid: string, unit: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.productId === pid && f.unitCode === unit);
      if (exists) return prev.filter(f => !(f.productId === pid && f.unitCode === unit));
      return [...prev, { productId: pid, unitCode: unit }];
    });
  };

  // Hold/Resume
  const openHold = () => { setHoldName(""); setHoldOpen(true); };
  const saveHold = () => {
    if (!cart.length) { setError('Cart kosong, tidak bisa hold'); return; }
    const id = `${Date.now()}`;
    const payload = {
      cart,
      customerId,
      pmId,
      pmType,
      discount,
      discountMode,
      storeId,
    };
    setHolds(prev => [{ id, name: holdName || `Hold ${new Date().toLocaleTimeString('id-ID')}`, at: Date.now(), payload }, ...prev].slice(0, 50));
    setHoldOpen(false);
    setMessage('Order di-hold');
    clearCart();
  };
  const resumeHold = (id: string) => {
    const h = holds.find(x => x.id === id);
    if (!h) return;
    const p = h.payload || {};
    setCart(p.cart || []);
    setCustomerId(p.customerId || "");
    setPmId(p.pmId || "");
    setPmType(p.pmType || "");
    setDiscount(typeof p.discount === 'number' ? p.discount : 0);
    setDiscountMode(p.discountMode === 'percent' ? 'percent' : 'amount');
    if (p.storeId) setStoreId(p.storeId);
    setHolds(prev => prev.filter(x => x.id !== id));
    setHoldListOpen(false);
    setMessage(`Lanjutkan: ${h.name}`);
  };
  const deleteHold = (id: string) => setHolds(prev => prev.filter(x => x.id !== id));
  const recordRecent = (pid: string, unit: string) => {
    setRecents(prev => {
      const map = new Map<string, { productId: string; unitCode: string; at: number }>();
      map.set(favKey(pid, unit), { productId: pid, unitCode: unit, at: Date.now() });
      for (const r of prev) map.set(favKey(r.productId, r.unitCode), r);
      const arr = Array.from(map.values()).sort((a, b) => b.at - a.at);
      return arr.slice(0, 20);
    });
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
      }
    } catch {}
  };

  const appendCashInput = (token: string) => {
    const s = String(amountPaid || 0);
    if (token === 'C') { setAmountPaid(0); return; }
    if (token === '<') { const ns = s.slice(0, -1); setAmountPaid(Number(ns || 0)); return; }
    const ns = (s === '0' ? '' : s) + token;
    setAmountPaid(Number(ns));
  };

  const getUnitPrice = (c: CartItem) => {
    if (!c.unitCode) return 0;
    const p = products.find(pp => pp._id === c.productId);
    const up = p?.unitPrices?.find(u => u.code === c.unitCode);
    if (up && typeof up.price === 'number') return up.price;
    return 0;
  };
  const subtotal = useMemo(() => cart.reduce((a, c) => a + getUnitPrice(c) * c.qty, 0), [cart, products]);
  const computed = useMemo(() => {
    const rate = typeof storeSetting?.taxRate === 'number' ? storeSetting.taxRate : 0;
    const inclusive = Boolean(storeSetting?.taxInclusive);
    const discRaw = Math.max(0, discount || 0);
    const disc = discountMode === 'percent' ? Math.min(100, discRaw) * subtotal / 100 : discRaw;
    const base = Math.max(0, subtotal - disc);
    let tax = 0;
    let total = 0;
    if (rate > 0) {
      if (inclusive) { tax = +(base * (rate / (100 + rate))).toFixed(0); total = base; }
      else { tax = +((base * rate) / 100).toFixed(0); total = base + tax; }
    } else { tax = 0; total = base; }
    return { disc, tax, total, base };
  }, [storeSetting, subtotal, discount, discountMode]);
  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const selectedStore = useMemo(() => stores.find((s) => s._id === storeId), [stores, storeId]);
  const selectedCustomer = useMemo(() => customers.find((c) => c._id === customerId), [customers, customerId]);
  const selectedPM = useMemo(() => pmList.find((m) => m._id === pmId), [pmList, pmId]);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.user);
      setIsSuper(Boolean(data?.user?.roles?.includes("superadmin")));
      if (data.user?.store) setStoreId(data.user.store);
    } catch {}
  };

  const fetchUnits = async () => {
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set('store', storeId);
      params.set('limit', '100');
      const res = await fetch(`/api/units?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setUnits(data.items || []);
    } catch {}
  };

  const fetchStoreSetting = async () => {
    try {
      const url = new URL('/api/settings', window.location.origin);
      if (isSuper && storeId) url.searchParams.set('store', storeId);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setStoreSetting(data.setting || null);
    } catch {}
  };

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStores(data.stores || []);
    } catch {}
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (isSuper && storeId) params.set("store", storeId);
      params.set("limit", "20");
      const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setProducts(data.items || []);
    } catch {}
    finally { setLoadingProducts(false); }
  };

  const fetchPaymentMethods = async () => {
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set("store", storeId);
      params.set("limit", "100");
      const res = await fetch(`/api/payment-methods?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setPmList(data.items || []);
    } catch {}
  };

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set("store", storeId);
      params.set("limit", "100");
      const res = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCustomers(data.items || []);
    } catch {}
  };

  useEffect(() => { fetchMe(); fetchStores(); }, []);
  useEffect(() => { fetchProducts(); fetchPaymentMethods(); fetchCustomers(); fetchStoreSetting(); fetchUnits(); }, [q, isSuper, storeId]);

  const addToCartWithUnit = (p: ProductItem, unitCode: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === p._id && i.unitCode === unitCode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      const up = p.unitPrices?.find(u => u.code === unitCode) as any;
      const factor = Number((up?.factor as number) || 1);
      const next = [...prev, { productId: p._id, name: p.name, sku: p.sku, price: p.price, qty: 1, unitCode, unitFactor: factor }];
      return next;
    });
    recordRecent(p._id, unitCode);
  };

  const updateQty = (id: string, unitCode: string | undefined, qty: number) => {
    setCart((prev) => prev.map((i) => (i.productId === id && i.unitCode === unitCode ? { ...i, qty: Math.max(1, qty) } : i)));
  };

  const removeItem = (id: string, unitCode: string | undefined) => setCart((prev) => prev.filter((i) => !(i.productId === id && i.unitCode === unitCode)));
  const clearCart = () => setCart([]);

  // unit per line; changing unit in-cart is disabled to allow multi-unit lines. Use product buttons to add different unit.

  const checkout = async () => {
    setError(null); setMessage(null); setSaving(true);
    try {
      if (cart.length === 0) throw new Error("Cart kosong");
      if (cart.some(c => !c.unitCode || getUnitPrice(c) <= 0)) throw new Error('Beberapa item belum memiliki unit atau harga unit');
      if (!pmId) throw new Error("Pilih metode bayar");
      if (pmType === 'cash') {
        if (!(amountPaid > 0)) throw new Error('Masukkan nominal bayar (cash)');
        if (amountPaid < computed.total) throw new Error('Nominal bayar kurang dari total');
      }
      const payload = {
        items: cart.map((c) => ({ productId: c.productId, qty: Math.max(1, Math.round(c.qty)), unitCode: c.unitCode || undefined })),
        paymentMethodId: pmId,
        customerId: customerId || undefined,
        amountPaid: pmType === 'cash' ? amountPaid : undefined,
        discount: discount || 0,
      };
      const url = new URL("/api/sales", window.location.origin);
      if (isSuper && storeId) url.searchParams.set("store", storeId);
      const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan penjualan");
      setMessage("Transaksi tersimpan");
      setReceipt(data);
      setSuccessOpen(true);
      clearCart();
      fetchProducts();
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  };

  return (
    <>
    <PageContainer title="POS Sales" description="Penjualan tunai">
      <Grid container spacing={3}>
        {isSuper && (
          <Grid size={12}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="store-label">Store</InputLabel>
              <Select labelId="store-label" label="Store" value={storeId} onChange={(e) => setStoreId(e.target.value)} required>
                {stores.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.name} ({s.code})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid size={12}>
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        </Grid>

        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" gap={2} alignItems="center" mb={2} sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <TextField size="small" label="Cari produk" value={q} onChange={(e) => setQ(e.target.value)} fullWidth />
              <Button variant="outlined" onClick={fetchProducts} disabled={loadingProducts}>{loadingProducts ? 'Loading...' : 'Refresh'}</Button>
              <ButtonGroup size="small" variant="outlined">
                <Button onClick={() => setViewMode('grid')} variant={viewMode === 'grid' ? 'contained' : 'outlined'}>Grid</Button>
                <Button onClick={() => setViewMode('list')} variant={viewMode === 'list' ? 'contained' : 'outlined'}>List</Button>
              </ButtonGroup>
              <FormControlLabel control={<Switch checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />} label="High Contrast" />
              <Button variant="outlined" onClick={toggleFullscreen}>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</Button>
              <Button variant="outlined" onClick={() => setHoldListOpen(true)}>Holds ({holds.length})</Button>
            </Box>
            {/* Quick panels: Favorites & Recent */}
            {(favorites.length > 0 || recents.length > 0) && (
              <Box sx={{ mb: 1 }}>
                {favorites.length > 0 && (
                  <Box mb={1}>
                    <Typography variant="subtitle2" mb={0.5}>Favorites</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {favorites.map((f, i) => {
                        const p = products.find(pp => pp._id === f.productId);
                        const price = p?.unitPrices?.find(u => u.code === f.unitCode)?.price || 0;
                        return (
                          <Chip key={`fav-${i}`} color="warning" label={`${p?.name || 'Produk'} • ${f.unitCode} • ${fmt(price)}`} onClick={() => p && addToCartWithUnit(p, f.unitCode)} onDelete={() => toggleFavorite(f.productId, f.unitCode)} />
                        );
                      })}
                    </Box>
                  </Box>
                )}
                {recents.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" mb={0.5}>Recent</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {recents.slice(0, 10).map((r, i) => {
                        const p = products.find(pp => pp._id === r.productId);
                        const price = p?.unitPrices?.find(u => u.code === r.unitCode)?.price || 0;
                        return (
                          <Chip key={`recent-${i}`} label={`${p?.name || 'Produk'} • ${r.unitCode} • ${fmt(price)}`} onClick={() => p && addToCartWithUnit(p, r.unitCode)} />
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            {viewMode === 'grid' ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, '@media (orientation: landscape)': { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } }}>
                {products.map((p) => (
                  <Paper key={p._id} sx={{ p: 1 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_IMAGE || '/images/placeholder.png'} alt={p.name} style={{ width: '100%', height: 92, objectFit: 'cover', borderRadius: 6 }} />
                    <Typography variant="body2" mt={0.5} noWrap>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.sku || '-'}</Typography>
                    <Box mt={0.5} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {(p.unitPrices || []).map((u) => (
                        <Box key={`${p._id}-${u.code}`} sx={{ display: 'flex', gap: 0.5 }}>
                          <Button fullWidth size="small" variant="contained" onClick={(e) => { e.stopPropagation(); addToCartWithUnit(p, u.code); }}>
                            {u.code} • {fmt(u.price)}
                          </Button>
                          <Tooltip title={isFavorite(p._id, u.code) ? 'Hapus favorit' : 'Tambah favorit'}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(p._id, u.code); }}>
                              {isFavorite(p._id, u.code) ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ))}
                      {(p.unitPrices || []).length === 0 && (
                        <Typography variant="caption" color="text.secondary">Belum ada harga unit</Typography>
                      )}
                    </Box>
                  </Paper>
                ))}
                {products.length === 0 && (
                  <Typography variant="body2">Tidak ada produk.</Typography>
                )}
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={1}>
                {products.map((p) => (
                  <Paper key={p._id} sx={{ p: 1 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_IMAGE || '/images/placeholder.png'} alt={p.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" noWrap>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.sku || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {(p.unitPrices || []).map((u) => (
                          <Box key={`${p._id}-${u.code}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Button size="small" variant="contained" onClick={() => addToCartWithUnit(p, u.code)}>
                              {u.code} • {fmt(u.price)}
                            </Button>
                            <IconButton size="small" onClick={() => toggleFavorite(p._id, u.code)}>
                              {isFavorite(p._id, u.code) ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        ))}
                        {(p.unitPrices || []).length === 0 && (
                          <Typography variant="caption" color="text.secondary">Belum ada harga unit</Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
                {products.length === 0 && (
                  <Typography variant="body2">Tidak ada produk.</Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Cart</Typography>
            <Divider sx={{ my: 1 }} />
            {cart.length === 0 && <Typography variant="body2">Belum ada item.</Typography>}
            {cart.map((c, idx) => (
              <Box key={`${c.productId}-${c.unitCode || 'none'}-${idx}`} display="flex" alignItems="center" justifyContent="space-between" gap={1} py={1}>
                <Box>
                  <Typography variant="subtitle2">{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.sku || '-'} • Unit: {c.unitCode}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Button size="small" variant="outlined" onClick={() => updateQty(c.productId, c.unitCode, Math.max(1, c.qty - 1))}>-</Button>
                  <TextField type="number" size="small" value={c.qty} onChange={(e) => updateQty(c.productId, c.unitCode, Number(e.target.value))} sx={{ width: 70 }} />
                  <Button size="small" variant="outlined" onClick={() => updateQty(c.productId, c.unitCode, c.qty + 1)}>+</Button>
                  <ButtonGroup size="small" variant="outlined">
                    {[1,2,5].map((v) => (
                      <Button key={v} onClick={() => updateQty(c.productId, c.unitCode, v)}>x{v}</Button>
                    ))}
                  </ButtonGroup>
                  <Typography variant="body2" width={80} textAlign="right">{fmt(getUnitPrice(c) * c.qty)}</Typography>
                  <Button size="small" color="error" onClick={() => removeItem(c.productId, c.unitCode)}>Hapus</Button>
                </Box>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">Total</Typography>
              <Typography variant="h6">{fmt(computed.total)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">{fmt(subtotal)}</Typography>
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Button size="small" variant={discountMode === 'amount' ? 'contained' : 'outlined'} onClick={() => setDiscountMode('amount')}>Nominal</Button>
                <Button size="small" variant={discountMode === 'percent' ? 'contained' : 'outlined'} onClick={() => setDiscountMode('percent')}>%</Button>
                <TextField type="number" size="small" label={discountMode === 'percent' ? 'Diskon %' : 'Diskon Rp'} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} sx={{ maxWidth: 180 }} />
                <Typography variant="body2">Potongan: {fmt(computed.disc)}</Typography>
              </Box>
              <Box display="flex" gap={1} flexWrap="wrap">
                {/* Quick presets */}
                {discountMode === 'percent' ? (
                  [5, 10, 15, 20].map((p) => (
                    <Button key={p} size="small" variant="outlined" onClick={() => setDiscount(p)}>{p}%</Button>
                  ))
                ) : (
                  [5000, 10000, 20000, 50000, 100000].map((v) => (
                    <Button key={v} size="small" variant="outlined" onClick={() => setDiscount(v)}>{fmt(v)}</Button>
                  ))
                )}
                <Button size="small" color="warning" onClick={() => setDiscount(0)}>Clear</Button>
              </Box>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2">Pajak</Typography>
              <Typography variant="body2">{fmt(computed.tax)}</Typography>
            </Box>
            <FormControl fullWidth margin="dense">
              <InputLabel id="customer-label">Customer (opsional)</InputLabel>
              <Select labelId="customer-label" label="Customer (opsional)" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <MenuItem value="">Tanpa Customer</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.name} ({c.code})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box mt={1}>
              <Typography variant="subtitle2" mb={0.5}>Metode Bayar</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                {pmList.map((m) => {
                  const active = pmId === m._id;
                  return (
                    <Paper key={m._id} onClick={() => { setPmId(m._id); setPmType(m.type); }} sx={{ p: 1.5, border: '2px solid', borderColor: active ? 'primary.main' : 'divider', cursor: 'pointer', borderRadius: 2, bgcolor: highContrast && active ? 'primary.light' : undefined, boxShadow: highContrast && active ? 3 : 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{m.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{m.type}</Typography>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
            {pmType === 'cash' && (
              <Box mt={1}>
                <TextField type="number" label="Nominal Bayar (Cash)" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} fullWidth size="medium" sx={{ '& .MuiInputBase-input': { fontSize: 18, py: 1.5 } }} />
                <Typography variant="body1" mt={0.5}>Kembali: {fmt(amountPaid > 0 ? Math.max(0, amountPaid - computed.total) : 0)}</Typography>
                <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                  {[computed.total, 50000, 100000, 200000, 500000, 1000000].map((v, i) => (
                    <Button key={i} size="medium" variant="outlined" onClick={() => setAmountPaid(v)}>{i === 0 ? 'Exact' : fmt(v)}</Button>
                  ))}
                  {[2000, 5000, 10000].map((v) => (
                    <Button key={`tip-${v}`} size="medium" variant="outlined" onClick={() => setAmountPaid((prev) => Math.max(0, Number(prev) || 0) + v)}>+{fmt(v)}</Button>
                  ))}
                  <Button size="medium" color="warning" onClick={() => setAmountPaid(0)}>Clear</Button>
                </Box>
                <Box mt={1} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                  {['1','2','3','4','5','6','7','8','9','00','0','<'].map((k) => (
                    <Button key={`key-${k}`} variant="contained" onClick={() => appendCashInput(k)} sx={{ py: 1.5, fontSize: 18 }}>{k}</Button>
                  ))}
                  <Button variant="outlined" color="warning" onClick={() => appendCashInput('C')} sx={{ gridColumn: 'span 3', py: 1.5, fontSize: 18 }}>Clear</Button>
                </Box>
              </Box>
            )}
            <Box display="flex" gap={1} mt={2} sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="outlined" onClick={openHold} disabled={saving || cart.length === 0} sx={{ py: 1.25, px: 2, fontSize: 16 }}>Hold</Button>
              <Button variant="outlined" onClick={clearCart} disabled={saving || cart.length === 0} sx={{ py: 1.25, px: 2, fontSize: 16 }}>Clear</Button>
              <Button variant="contained" onClick={checkout} disabled={saving || cart.length === 0 || !pmId || (isSuper && !storeId)} sx={{ py: 1.25, px: 2, fontSize: 16 }}>{saving ? 'Memproses...' : 'Checkout'}</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
    {/* Hold Dialog */}
    <Dialog open={holdOpen} onClose={() => setHoldOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Hold Order</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>Beri nama/nomor meja (opsional) untuk order ini.</Typography>
        <TextField autoFocus fullWidth label="Nama / Table / Catatan" value={holdName} onChange={(e) => setHoldName(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setHoldOpen(false)}>Batal</Button>
        <Button variant="contained" onClick={saveHold}>Simpan Hold</Button>
      </DialogActions>
    </Dialog>
    {/* Holds List Dialog */}
    <Dialog open={holdListOpen} onClose={() => setHoldListOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Daftar Hold</DialogTitle>
      <DialogContent>
        {holds.length === 0 ? (
          <Typography variant="body2">Belum ada hold.</Typography>
        ) : (
          <Box display="flex" flexDirection="column" gap={1}>
            {holds.map((h) => (
              <Paper key={h.id} sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle2">{h.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(h.at).toLocaleString('id-ID')}</Typography>
                </Box>
                <Box display="flex" gap={1}>
                  <Button size="small" variant="contained" onClick={() => resumeHold(h.id)}>Resume</Button>
                  <Button size="small" color="error" onClick={() => deleteHold(h.id)}>Delete</Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setHoldListOpen(false)}>Tutup</Button>
      </DialogActions>
    </Dialog>
    {/* Success / Receipt Dialog */}
    <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Transaksi Berhasil</DialogTitle>
      <DialogContent>
        {receipt ? (
          <Box id="receipt-area" sx={{ typography: 'body2' }}>
            {storeSetting?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storeSetting.logoUrl} alt="logo" style={{ width: 72, height: 72, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            )}
            <Typography variant="subtitle1" fontWeight={700} textAlign="center">{selectedStore?.name || 'Toko'}</Typography>
            {selectedStore?.address && (
              <Typography variant="caption" color="text.secondary" textAlign="center">{selectedStore.address}</Typography>
            )}
            {selectedStore?.phone && (
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">Telp: {selectedStore.phone}</Typography>
            )}
            {storeSetting?.receiptHeader && (
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ whiteSpace: 'pre-line', mt: 0.5 }}>{storeSetting.receiptHeader}</Typography>
            )}
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">#{receipt._id}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(receipt.paidAt || Date.now()).toLocaleString('id-ID')}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Kasir: {me?.email || '-'}</Typography>
              <Typography variant="caption" color="text.secondary">Customer: {selectedCustomer?.name || '-'}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            {receipt.items?.map((it: any) => (
              <Box key={it.product} display="flex" justifyContent="space-between" my={0.5}>
                <Box>
                  <Typography variant="body2">{it.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{it.qty} x {fmt(it.price)}</Typography>
                </Box>
                <Typography variant="body2">{fmt(it.subtotal)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" my={0.5}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">{fmt(receipt.subtotal || 0)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" my={0.5}>
              <Typography variant="body2">Diskon</Typography>
              <Typography variant="body2">{fmt(receipt.discount || 0)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" my={0.5}>
              <Typography variant="body2">Pajak</Typography>
              <Typography variant="body2">{fmt(receipt.tax || 0)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" my={0.5}>
              <Typography variant="body2">Total</Typography>
              <Typography variant="body2" fontWeight={700}>{fmt(receipt.total)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" my={0.5}>
              <Typography variant="body2">Metode</Typography>
              <Typography variant="body2">{receipt.paymentType}</Typography>
            </Box>
            {typeof receipt.amountPaid === 'number' && (
              <>
                <Box display="flex" justifyContent="space-between" my={0.5}>
                  <Typography variant="body2">Bayar</Typography>
                  <Typography variant="body2">{fmt(receipt.amountPaid)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" my={0.5}>
                  <Typography variant="body2">Kembali</Typography>
                  <Typography variant="body2">{fmt(receipt.change || 0)}</Typography>
                </Box>
              </>
            )}
            {storeSetting?.receiptFooter && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ whiteSpace: 'pre-line' }}>{storeSetting.receiptFooter}</Typography>
              </>
            )}
          </Box>
        ) : (
          <Typography variant="body2">Transaksi tersimpan.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSuccessOpen(false)}>Tutup</Button>
        <Button variant="contained" onClick={() => {
          const w = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
          if (!w) return;
          const html = document.getElementById('receipt-area')?.innerHTML || '';
          w.document.write(`<!doctype html><html><head><title>Struk</title><style>body{font-family: Arial; padding:12px;} hr{border:none;border-top:1px solid #ddd}</style></head><body>${html}</body></html>`);
          w.document.close();
          w.focus();
          w.print();
          w.close();
        }}>Print</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
