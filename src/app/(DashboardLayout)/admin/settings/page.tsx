"use client";
import React, { useEffect, useMemo, useState } from "react";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

export default function SettingsPage() {
  const [me, setMe] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<null | "product" | "category" | "logo">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    defaultProductImage: "",
    defaultCategoryImage: "",
    logoUrl: "",
    receiptHeader: "",
    receiptFooter: "",
    taxRate: 0,
    taxInclusive: true,
    defaultMarginPct: 0,
  });

  const isSuper = useMemo(() => Boolean(me?.roles?.includes("superadmin")), [me]);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.user);
      if (data.user?.store) setStoreId(data.user.store);
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

  const fetchSettings = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const url = new URL("/api/settings", window.location.origin);
      url.searchParams.set("store", storeId);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        const s = data.setting || {};
        setForm({
          defaultProductImage: s.defaultProductImage || "",
          defaultCategoryImage: s.defaultCategoryImage || "",
          logoUrl: s.logoUrl || "",
          receiptHeader: s.receiptHeader || "",
          receiptFooter: s.receiptFooter || "",
          taxRate: typeof s.taxRate === 'number' ? s.taxRate : 0,
          taxInclusive: typeof s.taxInclusive === 'boolean' ? s.taxInclusive : true,
          defaultMarginPct: typeof s.defaultMarginPct === 'number' ? s.defaultMarginPct : 0,
        });
      } else {
        throw new Error(data.message || "Gagal mengambil settings");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async (file: File, key: "product" | "category") => {
    try {
      setUploadingKey(key);
      const folder = key === "product" ? "pos/settings" : "pos/settings";
      const sigRes = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder }) });
      if (!sigRes.ok) throw new Error('Gagal membuat signature');
      const { cloudName, apiKey, timestamp, signature, folder: signedFolder } = await sigRes.json();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      if (signedFolder) fd.append('folder', signedFolder);
      fd.append('signature', signature);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
      const data = await up.json();
      if (!up.ok) throw new Error(data?.error?.message || 'Upload gagal');
      if (key === "product") setForm((f: any) => ({ ...f, defaultProductImage: data.secure_url }));
      if (key === "category") setForm((f: any) => ({ ...f, defaultCategoryImage: data.secure_url }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingKey(null);
    }
  };

  const save = async () => {
    if (!storeId) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const url = new URL("/api/settings", window.location.origin);
      url.searchParams.set("store", storeId);
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProductImage: form.defaultProductImage || undefined,
          defaultCategoryImage: form.defaultCategoryImage || undefined,
          logoUrl: form.logoUrl || undefined,
          receiptHeader: form.receiptHeader || undefined,
          receiptFooter: form.receiptFooter || undefined,
          taxRate: typeof form.taxRate === 'number' ? form.taxRate : undefined,
          taxInclusive: typeof form.taxInclusive === 'boolean' ? form.taxInclusive : undefined,
          defaultMarginPct: typeof form.defaultMarginPct === 'number' ? form.defaultMarginPct : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan settings");
      setMessage("Settings tersimpan");
      await fetchSettings();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchMe();
    fetchStores();
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [storeId]);

  return (
    <PageContainer title="Settings" description="Store Settings">
      <DashboardCard title="Store Settings">
        <Grid container spacing={3}>
          {isSuper && (
            <Grid size={12}>
              <FormControl fullWidth>
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
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography variant="subtitle2">Logo Toko (untuk Struk)</Typography>
              <Box display="flex" gap={2} alignItems="center">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="logo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <img src={process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_IMAGE || '/images/placeholder.png'} alt="logo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, opacity: 0.6 }} />
                )}
                <Button component="label" variant="outlined" size="small" disabled={uploadingKey==="logo"}>
                  {uploadingKey === "logo" ? 'Uploading...' : 'Upload Logo'}
                  <input hidden type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setUploadingKey("logo");
                      const sigRes = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: 'pos/settings' }) });
                      if (!sigRes.ok) throw new Error('Gagal membuat signature');
                      const { cloudName, apiKey, timestamp, signature, folder } = await sigRes.json();
                      const fd = new FormData(); fd.append('file', file); fd.append('api_key', apiKey); fd.append('timestamp', String(timestamp)); if (folder) fd.append('folder', folder); fd.append('signature', signature);
                      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
                      const data = await up.json(); if (!up.ok) throw new Error(data?.error?.message || 'Upload gagal');
                      setForm((f: any) => ({ ...f, logoUrl: data.secure_url }));
                    } catch (e: any) { setError(e.message); } finally { setUploadingKey(null); }
                  }} />
                </Button>
              </Box>
              <TextField label="Logo URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} fullWidth />
            </Box>
          </Grid>

          <Grid size={12}>
            <TextField label="Receipt Header" value={form.receiptHeader} onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })} fullWidth multiline minRows={2} />
          </Grid>

          <Grid size={12}>
            <TextField label="Receipt Footer" value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} fullWidth multiline minRows={2} />
          </Grid>

          <Grid size={12}>
            <Box display="flex" gap={2} alignItems="center">
              <TextField type="number" label="Tax Rate (%)" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} sx={{ maxWidth: 240 }} />
              <FormControl>
                <InputLabel id="tax-inclusive-label">Mode Pajak</InputLabel>
                <Select labelId="tax-inclusive-label" label="Mode Pajak" value={form.taxInclusive ? 'inclusive' : 'exclusive'} onChange={(e) => setForm({ ...form, taxInclusive: e.target.value === 'inclusive' })} sx={{ minWidth: 200 }}>
                  <MenuItem value="inclusive">Inclusive (harga sudah termasuk pajak)</MenuItem>
                  <MenuItem value="exclusive">Exclusive (pajak di atas harga)</MenuItem>
                </Select>
              </FormControl>
              <TextField type="number" label="Default Margin (%)" value={form.defaultMarginPct} onChange={(e) => setForm({ ...form, defaultMarginPct: Number(e.target.value) })} sx={{ maxWidth: 240 }} />
            </Box>
          </Grid>

          <Grid size={12}>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" gap={2} alignItems="center">
                {form.defaultProductImage ? (
                  <img src={form.defaultProductImage} alt="product-default" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <img src={process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_IMAGE || '/images/placeholder.png'} alt="product-default" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, opacity: 0.6 }} />
                )}
                <Button component="label" variant="outlined" size="small" disabled={uploadingKey==="product"}>
                  {uploadingKey === "product" ? 'Uploading...' : 'Upload Default Product Image'}
                  <input hidden type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(file, "product");
                  }} />
                </Button>
              </Box>
              <TextField label="Default Product Image URL" value={form.defaultProductImage} onChange={(e) => setForm({ ...form, defaultProductImage: e.target.value })} fullWidth />
            </Box>
          </Grid>

          <Grid size={12}>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" gap={2} alignItems="center">
                {form.defaultCategoryImage ? (
                  <img src={form.defaultCategoryImage} alt="category-default" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <img src={process.env.NEXT_PUBLIC_DEFAULT_CATEGORY_IMAGE || '/images/placeholder.png'} alt="category-default" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, opacity: 0.6 }} />
                )}
                <Button component="label" variant="outlined" size="small" disabled={uploadingKey==="category"}>
                  {uploadingKey === "category" ? 'Uploading...' : 'Upload Default Category Image'}
                  <input hidden type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(file, "category");
                  }} />
                </Button>
              </Box>
              <TextField label="Default Category Image URL" value={form.defaultCategoryImage} onChange={(e) => setForm({ ...form, defaultCategoryImage: e.target.value })} fullWidth />
            </Box>
          </Grid>

          <Grid size={12}>
            <Box display="flex" gap={2}>
              <Button variant="contained" onClick={save} disabled={saving || loading || !storeId}>Simpan</Button>
            </Box>
          </Grid>
        </Grid>
      </DashboardCard>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)}>
        <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </PageContainer>
  );
}
