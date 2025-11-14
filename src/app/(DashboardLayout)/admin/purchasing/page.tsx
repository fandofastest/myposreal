"use client";
import React, { useEffect, useMemo, useState } from "react";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, MenuItem, Select, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from "@mui/material";

interface Supplier { _id: string; name: string; }
interface Product { _id: string; name: string; sku?: string; price: number; baseUnit?: string; purchaseUnits?: Array<{ name: string; conversionToBase: number }>; }
interface PItem { productId: string; name: string; sku?: string; cost: number; qty: number; subtotal: number; }

export default function PurchasingPage() {
  const [me, setMe] = useState<any>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState<string>("");
  const [pItems, setPItems] = useState<PItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [qProd, setQProd] = useState("");

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const subtotal = useMemo(() => pItems.reduce((a, b) => a + (b.cost * b.qty), 0), [pItems]);
  const computed = useMemo(() => {
    const rate = typeof settings?.taxRate === 'number' ? settings.taxRate : 0;
    const inclusive = Boolean(settings?.taxInclusive);
    const disc = Math.max(0, discount || 0);
    const base = Math.max(0, subtotal - disc);
    let tax = 0; let totalVal = 0;
    if (rate > 0) {
      if (inclusive) { tax = +(base * (rate / (100 + rate))).toFixed(0); totalVal = base; }
      else { tax = +((base * rate) / 100).toFixed(0); totalVal = base + tax; }
    } else { totalVal = base; }
    return { disc, tax, total: totalVal };
  }, [settings, subtotal, discount]);

  const fetchMe = async () => { try { const res = await fetch('/api/auth/me', { cache: 'no-store' }); if (!res.ok) return; const data = await res.json(); setMe(data.user); const roles: string[] = data?.user?.roles || []; setIsSuper(Boolean(roles.includes('superadmin'))); if (data.user?.store) setStoreId(data.user.store); } catch {} };
  const fetchStores = async () => { try { const res = await fetch('/api/stores', { cache: 'no-store' }); if (!res.ok) return; const data = await res.json(); setStores(data.stores || []); } catch {} };
  const fetchSuppliers = async () => { try { const res = await fetch('/api/suppliers', { cache: 'no-store' }); const data = await res.json(); if (res.ok) setSuppliers(data.items || []); } catch {} };
  const fetchProducts = async () => { try { const params = new URLSearchParams(); if (qProd) params.set('q', qProd); if (isSuper && storeId) params.set('store', storeId); const res = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' }); const data = await res.json(); if (res.ok) setProducts(data.items || []); } catch {} };
  const fetchSettings = async () => { try { const url = new URL('/api/settings', window.location.origin); if (isSuper && storeId) url.searchParams.set('store', storeId); const res = await fetch(url.toString(), { cache: 'no-store' }); const data = await res.json(); if (res.ok) setSettings(data.setting || {}); } catch {} };
  const fetchUnits = async () => { try { const params = new URLSearchParams(); if (isSuper && storeId) params.set('store', storeId); const res = await fetch(`/api/units?${params.toString()}`, { cache: 'no-store' }); const data = await res.json(); if (res.ok) setUnits(data.items || []); } catch {} };

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set('store', storeId);
      params.set('page', String(page)); params.set('limit', String(limit));
      const res = await fetch(`/api/purchases?${params.toString()}`, { cache: 'no-store' }); const data = await res.json();
      if (res.ok) { setItems(data.items || []); setTotal(data.total || 0); }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMe(); fetchStores(); fetchSuppliers(); }, []);
  useEffect(() => { fetchList(); fetchProducts(); fetchSettings(); }, [isSuper, storeId, page, limit, qProd]);

  const addItem = (p: Product) => {
    setPItems(prev => {
      const idx = prev.findIndex(x => x.productId === p._id);
      if (idx >= 0) {
        const copy = [...prev];
        const it = copy[idx];
        it.qty += 1; it.subtotal = it.cost * it.qty; return copy;
      }
      return [...prev, { productId: p._id, name: p.name, sku: p.sku, cost: p.price, qty: 1, subtotal: p.price * 1 }];
    });
  };
  const setItemField = (id: string, field: 'cost' | 'qty', value: number) => {
    setPItems(prev => prev.map(it => it.productId === id ? { ...it, [field]: value, subtotal: (field === 'cost' ? value : it.cost) * (field === 'qty' ? value : it.qty) } : it));
  };
  const removeItem = (id: string) => setPItems(prev => prev.filter(it => it.productId !== id));
  

  const openCreate = () => { setSupplierId(""); setPItems([]); setDiscount(0); setNote(""); setOpen(true); };
  const submitCreate = async () => {
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload = { supplierId, items: pItems.map(it => ({ productId: it.productId, cost: it.cost, qty: it.qty })), discount: discount || 0, note };
      const url = new URL('/api/purchases', window.location.origin); if (isSuper && storeId) url.searchParams.set('store', storeId);
      const res = await fetch(url.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Gagal membuat pembelian');
      setOpen(false); fetchList(); setMessage('Pembelian dibuat (draft)');
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveId, setReceiveId] = useState<string>("");
  
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  const [receiveOverrides, setReceiveOverrides] = useState<Record<string, { price?: number | ''; marginPct?: number | ''; unitPrices?: Record<string, number | ''> }>>({});
  const [unitsAll, setUnitsAll] = useState<any[]>([]);
  const openReceive = async (id: string) => {
    setReceiveId(id); setReceiveItems([]); setReceiveOverrides({});
    try {
      const res = await fetch(`/api/purchases/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setReceiveItems(data.items || []);
      }
    } catch {}
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set('store', storeId);
      const resU = await fetch(`/api/units?${params.toString()}`, { cache: 'no-store' });
      const dU = await resU.json();
      if (resU.ok) setUnitsAll(dU.items || []);
    } catch {}
    setReceiveOpen(true);
  };
  
  const setOverrideUnitPrice = (productId: string, code: string, value: number | '') => {
    setReceiveOverrides(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        unitPrices: { ...(prev[productId]?.unitPrices || {}), [code]: value },
      }
    }));
  };
  const doReceive = async () => {
    try {
      const overrides = Object.entries(receiveOverrides).map(([pid, v]) => ({
        productId: pid,
        unitPrices: v.unitPrices ? Object.entries(v.unitPrices)
          .filter(([code, val]) => val !== '' && typeof val === 'number')
          .map(([code, val]) => ({ code, price: val as number })) : undefined,
      }))
        .filter(o => Array.isArray(o.unitPrices));
      const res = await fetch(`/api/purchases/${receiveId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'receive', overrides }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Gagal receive'); setMessage('Pembelian diterima, harga jual diperbarui'); setReceiveOpen(false); setDetailOpen(false); fetchList();
    } catch (e: any) { setError(e.message); }
  };

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<any>(null);
  const openDetail = async (id: string) => {
    try { const res = await fetch(`/api/purchases/${id}`, { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Gagal memuat detail'); setDetailDoc(data); setDetailOpen(true); } catch (e: any) { setError(e.message); }
  };

  return (
    <>
    <PageContainer title="Purchasing" description="Pembelian dan penerimaan stok">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Daftar Pembelian</Typography>
          <Button variant="contained" onClick={openCreate} disabled={isSuper && !storeId}>Create</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Supplier</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it._id} hover>
                <TableCell>{it.supplier?.name || '-'}</TableCell>
                <TableCell>{new Date(it.createdAt).toLocaleString('id-ID')}</TableCell>
                <TableCell>{fmt(it.total)}</TableCell>
                <TableCell>{it.status}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openDetail(it._id)}>Lihat</Button>
                  {it.status === 'draft' && (
                    <Button size="small" onClick={() => openReceive(it._id)}>Receive</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={5}>Belum ada pembelian.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Buat Pembelian</DialogTitle>
        <DialogContent>
          {isSuper && (
            <FormControl fullWidth margin="normal">
              <InputLabel id="store-label">Store</InputLabel>
              <Select labelId="store-label" label="Store" value={storeId} onChange={(e) => setStoreId(e.target.value)} required>
                {stores.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.name} ({s.code})</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel id="supplier-label">Supplier</InputLabel>
            <Select labelId="supplier-label" label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              {suppliers.map(s => (
                <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box display="flex" gap={1} alignItems="center" my={1}>
            <TextField label="Cari Produk" size="small" value={qProd} onChange={(e) => setQProd(e.target.value)} />
            <Button variant="outlined" onClick={fetchProducts}>Cari</Button>
          </Box>

          <Grid container spacing={2}>
            <Grid size={12}>
              <Paper sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" mb={1}>Produk</Typography>
                <Grid container spacing={1}>
                  {products.map(p => (
                    <Grid key={p._id} size={12}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                        <Box minWidth={0} flex={1}>
                          <Typography variant="body2" noWrap>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.sku || '-'}</Typography>
                        </Box>
                        <Button size="small" variant="outlined" onClick={() => addItem(p)}>Tambah</Button>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" mb={1}>Item Pembelian</Typography>
                {pItems.length === 0 && <Typography variant="body2">Belum ada item.</Typography>}
                {pItems.map(it => (
                  <Box key={it.productId} display="flex" alignItems="center" gap={1} py={0.5}>
                    <Box minWidth={0} flex={1}>
                      <Typography variant="body2" noWrap>{it.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{it.sku || '-'}</Typography>
                    </Box>
                    <TextField size="small" type="number" label="Cost" value={it.cost} onChange={(e) => setItemField(it.productId, 'cost', Number(e.target.value))} sx={{ width: 110 }} />
                    <TextField size="small" type="number" label="Qty" value={it.qty} onChange={(e) => setItemField(it.productId, 'qty', Number(e.target.value))} sx={{ width: 90 }} />
                    <Typography variant="body2" width={100} textAlign="right">{fmt(it.subtotal)}</Typography>
                    <Button size="small" color="error" onClick={() => removeItem(it.productId)}>Hapus</Button>
                  </Box>
                ))}
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" my={0.5}><Typography variant="body2">Subtotal</Typography><Typography variant="body2">{fmt(subtotal)}</Typography></Box>
                <Box display="flex" justifyContent="space-between" my={0.5}>
                  <TextField size="small" type="number" label="Diskon" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} sx={{ maxWidth: 160 }} />
                  <Typography variant="body2">{fmt(computed.disc)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" my={0.5}><Typography variant="body2">Pajak</Typography><Typography variant="body2">{fmt(computed.tax)}</Typography></Box>
                <Box display="flex" justifyContent="space-between" my={0.5}><Typography variant="subtitle2">Total</Typography><Typography variant="subtitle2">{fmt(computed.total)}</Typography></Box>
              </Paper>
            </Grid>
          </Grid>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitCreate} disabled={saving || (isSuper && !storeId) || !supplierId || pItems.length === 0}>{saving ? 'Menyimpan...' : 'Simpan Draft'}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
    <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Detail Pembelian</DialogTitle>
      <DialogContent>
        {detailDoc ? (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Supplier</Typography>
              <Typography variant="body2">{detailDoc.supplier?.name || '-'}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Tanggal</Typography>
              <Typography variant="body2">{new Date(detailDoc.createdAt).toLocaleString('id-ID')}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            {(detailDoc.items || []).map((it: any) => (
              <Box key={String(it.product)} display="flex" justifyContent="space-between" my={0.5}>
                <Box>
                  <Typography variant="body2">{it.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{it.qty} x {fmt(it.cost)}</Typography>
                </Box>
                <Typography variant="body2">{fmt(it.subtotal)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" my={0.5}><Typography variant="body2">Subtotal</Typography><Typography variant="body2">{fmt(detailDoc.subtotal || 0)}</Typography></Box>
            <Box display="flex" justifyContent="space-between" my={0.5}><Typography variant="body2">Diskon</Typography><Typography variant="body2">{fmt(detailDoc.discount || 0)}</Typography></Box>
            <Box display="flex" justifyContent="space-between" my={0.5}><Typography variant="body2">Pajak</Typography><Typography variant="body2">{fmt(detailDoc.tax || 0)}</Typography></Box>
            <Box display="flex" justifyContent="space-between" my={0.5}><Typography variant="subtitle2">Total</Typography><Typography variant="subtitle2">{fmt(detailDoc.total || 0)}</Typography></Box>
            <Box mt={1}>{detailDoc.note && (<Typography variant="caption" color="text.secondary">Catatan: {detailDoc.note}</Typography>)}</Box>
          </Box>
        ) : (
          <Typography variant="body2">Memuat...</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDetailOpen(false)}>Tutup</Button>
        {detailDoc?.status === 'draft' && (
          <Button variant="contained" onClick={() => openReceive(detailDoc._id)}>Receive</Button>
        )}
      </DialogActions>
    </Dialog>
    {/* Receive Dialog */}
    <Dialog open={receiveOpen} onClose={() => setReceiveOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Receive Pembelian</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>Stok akan ditambahkan. Isi Harga per Unit (opsional). Yang dikosongkan tidak akan mengubah harga lama.</Typography>
        {receiveItems.map((it: any) => {
          const ov = receiveOverrides[String(it.product)] || {};
          return (
            <Box key={String(it.product)} my={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" noWrap>{it.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Last cost/base: {fmt(it.cost || 0)}</Typography>
                </Box>
              </Box>
              <Box display="flex" flexDirection="column" gap={0.5} mt={0.5}>
                {unitsAll.map((u) => (
                  <Box key={u._id} display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" sx={{ minWidth: 120 }}>{u.name} ({u.code})</Typography>
                    <TextField type="number" size="small" label={`Harga ${u.code}`} value={ov.unitPrices?.[u.code] ?? ''} onChange={(e) => setOverrideUnitPrice(String(it.product), u.code, e.target.value === '' ? '' : Number(e.target.value))} sx={{ width: 180 }} />
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReceiveOpen(false)}>Batal</Button>
        <Button variant="contained" onClick={doReceive}>Receive</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
