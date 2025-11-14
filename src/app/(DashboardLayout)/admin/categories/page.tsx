"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, MenuItem, Select, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";

interface CategoryItem {
  _id: string;
  name: string;
  code: string;
  parent?: string | { _id: string; name: string } | null;
  status: string;
  imageUrl?: string;
}

export default function CategoriesPage() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: "", code: "", parent: "", imageUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [defaultCatImage, setDefaultCatImage] = useState<string>("");

  const isSuper = useMemo(() => Boolean(me?.roles?.includes("superadmin")), [me]);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.user);
    } catch {}
  };

  const fetchSetting = async () => {
    try {
      const url = new URL('/api/settings', window.location.origin);
      if (isSuper && storeId) url.searchParams.set('store', storeId);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setDefaultCatImage(data?.setting?.defaultCategoryImage || "");
    } catch {}
  };

  const onUploadImage = async (file: File) => {
    try {
      setUploading(true);
      const sigRes = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: 'pos/categories' }) });
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
      if (isSuper && storeId) params.set("store", storeId);
      const res = await fetch(`/api/categories?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat kategori");
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
    fetchSetting();
  }, [storeId, isSuper]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", parent: "", imageUrl: "" });
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ name: row.name || "", code: row.code || "", parent: (typeof row.parent === 'object' && row.parent)? row.parent._id : (row.parent || ""), imageUrl: row.imageUrl || "" });
    setOpen(true);
  };

  const submitForm = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      if (editing) {
        const payload: any = { name: form.name, code: form.code, parent: form.parent || undefined, imageUrl: form.imageUrl || undefined };
        const res = await fetch(`/api/categories/${editing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal memperbarui kategori");
        }
      } else {
        const payload: any = { name: form.name, code: form.code, parent: form.parent || undefined, imageUrl: form.imageUrl || undefined };
        const url = new URL("/api/categories", window.location.origin);
        if (isSuper && storeId) url.searchParams.set("store", storeId);
        const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal membuat kategori");
        }
      }
      setOpen(false);
      setMessage(editing ? "Kategori diperbarui" : "Kategori dibuat");
      fetchItems();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus kategori");
      setMessage("Kategori dihapus");
      fetchItems();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <PageContainer title="Categories" description="Kelola kategori dan subkategori">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Daftar Kategori</Typography>
          <Button variant="contained" onClick={openCreate} disabled={isSuper && !storeId}>Create</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c._id} hover>
                <TableCell>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.imageUrl || defaultCatImage || process.env.NEXT_PUBLIC_DEFAULT_CATEGORY_IMAGE || '/images/placeholder.png'}
                    alt={c.name}
                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, opacity: c.imageUrl ? 1 : 0.8 }}
                  />
                </TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.code}</TableCell>
                <TableCell>{(typeof c.parent === 'object' && c.parent) ? c.parent.name : (c.parent || '-')}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(c)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete(c._id)}>Hapus</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Belum ada kategori.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
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
          <Box display="flex" gap={2} alignItems="center" mt={1} mb={1}>
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={defaultCatImage || process.env.NEXT_PUBLIC_DEFAULT_CATEGORY_IMAGE || '/images/placeholder.png'} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, opacity: 0.6 }} />
            )}
            <Button component="label" variant="outlined" size="small" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input hidden type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
              }} />
            </Button>
          </Box>
          <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth margin="normal" required />
          <FormControl fullWidth margin="normal">
            <InputLabel id="parent-label">Parent (opsional)</InputLabel>
            <Select labelId="parent-label" label="Parent (opsional)" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
              <MenuItem value="">Tanpa Parent</MenuItem>
              {items.map((c) => (
                <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving || (isSuper && !storeId)}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
