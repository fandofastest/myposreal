"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, FormControlLabel, Checkbox, MenuItem, Select, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { alpha } from "@mui/material/styles";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost?: number;
  trackStock: boolean;
  status: string;
  category?: { _id: string; name: string } | null;
  imageUrl?: string;
  stock?: number;
  unitPrices?: Array<{ code: string; price: number }>;
}

export default function ProductsPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: "", sku: "", barcode: "", price: 0, cost: 0, trackStock: true, category: "", imageUrl: "", stock: 0, baseUnit: 'pcs', marginPct: undefined, unitPrices: [] });
  const [units, setUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [defaultProdImage, setDefaultProdImage] = useState<string>("");

  const isSuper = useMemo(() => Boolean(me?.roles?.includes("superadmin")), [me]);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.user);
    } catch {}
  };

  const fetchUnits = async () => {
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set("store", storeId);
      const res = await fetch(`/api/units?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnits(data.items || []);
    } catch {}
  };

  const fetchSetting = async () => {
    try {
      const url = new URL('/api/settings', window.location.origin);
      if (isSuper && storeId) url.searchParams.set('store', storeId);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setDefaultProdImage(data?.setting?.defaultProductImage || "");
    } catch {}
  };

  const onUploadImage = async (file: File) => {
    try {
      setUploading(true);
      const sigRes = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: 'pos/products' }) });
      if (!sigRes.ok) throw new Error('Gagal membuat signature');
      const { cloudName, apiKey, timestamp, signature, folder } = await sigRes.json();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      if (folder) fd.append('folder', folder);
      fd.append('signature', signature);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
      const data = await up.json();
      if (!up.ok) throw new Error(data?.error?.message || 'Upload gagal');
      setForm((f: any) => ({ ...f, imageUrl: data.secure_url }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set("store", storeId);
      const res = await fetch(`/api/categories?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.items || []);
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

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (isSuper && storeId) params.set("store", storeId);
      const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat produk");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {}
  };

  useEffect(() => {
    fetchMe();
    fetchStores();
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchSetting();
    fetchUnits();
  }, [q, storeId, isSuper]);

  const openCreate = () => {
    setEditing(null);
    const base = (units.find((u: any) => u.base) || {}).code || 'pcs';
    setForm({ name: "", sku: "", barcode: "", price: 0, cost: 0, trackStock: true, category: "", imageUrl: "", stock: 0, baseUnit: base, marginPct: undefined, unitPrices: [] });
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ name: row.name || "", sku: row.sku || "", barcode: row.barcode || "", price: row.price || 0, cost: row.cost || 0, trackStock: !!row.trackStock, category: row.category?._id || "", imageUrl: row.imageUrl || "", stock: row.stock || 0, baseUnit: row.baseUnit || ((units.find((u: any) => u.base) || {}).code || 'pcs'), marginPct: typeof row.marginPct === 'number' ? row.marginPct : undefined, unitPrices: Array.isArray(row.unitPrices) ? row.unitPrices : [] });
    setOpen(true);
  };

  const submitForm = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      if (editing) {
        const body = { ...form, unitPrices: form.unitPrices, baseUnit: form.baseUnit, imageUrl: form.imageUrl || undefined };
        const res = await fetch(`/api/products/${editing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal memperbarui produk");
        }
      } else {
        const payload: any = { ...form, unitPrices: form.unitPrices, baseUnit: form.baseUnit, imageUrl: form.imageUrl || undefined };
        const url = new URL("/api/products", window.location.origin);
        if (isSuper && storeId) url.searchParams.set("store", storeId);
        const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal membuat produk");
        }
      }
      setOpen(false);
      setMessage(editing ? "Produk diperbarui" : "Produk dibuat");
      fetchItems();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus produk");
      setMessage("Produk dihapus");
      fetchItems();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <PageContainer title="Products" description="Kelola produk toko">
      {!isSuper && (<Alert severity="info" sx={{ mb: 2 }}>Produk otomatis terikat dengan store Anda.</Alert>)}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" gap={2} alignItems="center">
            <TextField size="small" label="Cari" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="outlined" onClick={fetchItems}>Refresh</Button>
          </Box>
          <Button variant="contained" onClick={openCreate} disabled={isSuper && !storeId}>Create</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Barcode</TableCell>
              <TableCell>Harga Beli</TableCell>
              <TableCell>Harga per Unit</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell>Track</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it._id} hover>
                <TableCell>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.imageUrl || defaultProdImage || process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_IMAGE || '/images/placeholder.png'}
                    alt={it.name}
                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, opacity: it.imageUrl ? 1 : 0.8 }}
                  />
                </TableCell>
                <TableCell>{it.name}</TableCell>
                <TableCell>{it.sku}</TableCell>
                <TableCell>{it.barcode || '-'}</TableCell>
                <TableCell>{typeof it.cost === 'number' ? it.cost : '-'}</TableCell>
                <TableCell>
                  {units.length === 0 ? '-' : (
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {units.map((u) => {
                        const p = (it as any).unitPrices?.find((x: any) => x.code === u.code);
                        const val = typeof p?.price === 'number' ? p.price : null;
                        return (
                          <Box
                            key={u._id}
                            sx={(theme) => ({
                              bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.light, 0.18) : '#f5f5f5',
                              color: theme.palette.mode === 'dark' ? theme.palette.primary.light : 'inherit',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 1,
                            })}
                          >
                            <Typography variant="caption">{u.code}: {val != null ? val.toLocaleString('id-ID') : '-'}</Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </TableCell>
                <TableCell>{it.category?.name || '-'}</TableCell>
                <TableCell>{it.trackStock ? 'Yes' : 'No'}</TableCell>
                <TableCell>{typeof it.stock === 'number' ? it.stock : '-'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(it)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete(it._id)}>Hapus</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={10}>Belum ada produk.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Product" : "Create Product"}</DialogTitle>
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
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth margin="normal" required />
          <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} fullWidth margin="normal" required />
          <TextField label="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} fullWidth margin="normal" />
          <Box display="flex" gap={2} alignItems="center" mt={1} mb={1}>
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={defaultProdImage || process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_IMAGE || '/images/placeholder.png'} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, opacity: 0.6 }} />
            )}
            <Button component="label" variant="outlined" size="small" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input hidden type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
              }} />
            </Button>
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel id="category-label">Category</InputLabel>
            <Select labelId="category-label" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <MenuItem value="">Tanpa Kategori</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField type="number" label="Harga Beli (Cost)" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} fullWidth margin="normal" />
          <TextField type="number" label="Harga BASE (opsional)" value={form.price === 0 ? '' : form.price} onChange={(e) => setForm({ ...form, price: e.target.value === '' ? 0 : Number(e.target.value) })} fullWidth margin="normal" helperText="Jika kosong, gunakan harga per Unit di bawah" />
          <FormControlLabel control={<Checkbox checked={form.trackStock} onChange={(e) => setForm({ ...form, trackStock: e.target.checked })} />} label="Track Stock" />
          {form.trackStock && (
            <TextField type="number" label="Stock Awal" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} fullWidth margin="normal" />
          )}
          <Box display="flex" gap={2} flexWrap="wrap">
            <Box flex={1} minWidth={240}>
              <TextField label="Base Unit" value={form.baseUnit} onChange={() => {}} fullWidth margin="normal" InputProps={{ readOnly: true }} helperText="Diambil dari Unit base store" />
            </Box>
            <Box flex={1} minWidth={240}>
              <TextField type="number" label="Margin per Product (%)" value={form.marginPct ?? ''} onChange={(e) => setForm({ ...form, marginPct: e.target.value === '' ? undefined : Number(e.target.value) })} fullWidth margin="normal" />
            </Box>
          </Box>
          <Box mt={1}>
            <Typography variant="subtitle2" gutterBottom>Harga per Unit</Typography>
            {units.map((u) => (
              <Box key={u._id} display="flex" alignItems="center" gap={1} my={0.5}>
                <Typography variant="caption" sx={{ minWidth: 120 }}>{u.name} ({u.code})</Typography>
                <TextField type="number" size="small" label={`Harga ${u.code}`} value={(form.unitPrices?.find((p: any) => p.code === u.code)?.price) ?? ''} onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setForm((f: any) => {
                    const arr = Array.isArray(f.unitPrices) ? [...f.unitPrices] : [];
                    const idx = arr.findIndex((x: any) => x.code === u.code);
                    if (val === '') {
                      // remove if exists
                      return { ...f, unitPrices: arr.filter((x: any) => x.code !== u.code) };
                    }
                    if (idx >= 0) { arr[idx] = { ...arr[idx], code: u.code, price: Number(val) }; }
                    else { arr.push({ code: u.code, price: Number(val) }); }
                    return { ...f, unitPrices: arr };
                  });
                }} sx={{ width: 220 }} />
                <TextField type="number" size="small" label={`Factor ${u.code}`} value={(form.unitPrices?.find((p: any) => p.code === u.code)?.factor) ?? ''} onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setForm((f: any) => {
                    const arr = Array.isArray(f.unitPrices) ? [...f.unitPrices] : [];
                    const idx = arr.findIndex((x: any) => x.code === u.code);
                    if (val === '') {
                      // if removing factor, keep entry but delete factor field
                      if (idx >= 0) { arr[idx] = { ...arr[idx] }; delete (arr[idx] as any).factor; }
                      return { ...f, unitPrices: arr };
                    }
                    if (idx >= 0) { arr[idx] = { ...arr[idx], code: u.code, factor: Number(val) }; }
                    else { arr.push({ code: u.code, factor: Number(val) }); }
                    return { ...f, unitPrices: arr };
                  });
                }} sx={{ width: 180 }} />
              </Box>
            ))}
          </Box>
          
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving || (isSuper && !storeId)}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
