"use client";
import React, { useEffect, useMemo, useState } from "react";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, MenuItem, Select, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

export default function StaffPage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ name: "", email: "", password: "" });

  const isSuper = useMemo(() => Boolean(me?.roles?.includes("superadmin")), [me]);

  const fetchMe = async () => { try { const res = await fetch("/api/auth/me", { cache: "no-store" }); if (!res.ok) return; const data = await res.json(); setMe(data.user); if (data.user?.store) setStoreId(data.user.store); } catch {} };
  const fetchStores = async () => { try { const res = await fetch("/api/stores", { cache: "no-store" }); if (!res.ok) return; const data = await res.json(); setStores(data.stores || []); } catch {} };

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (isSuper && storeId) params.set("store", storeId);
      const res = await fetch(`/api/staff?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat staff");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {}
  };

  useEffect(() => { fetchMe(); fetchStores(); }, []);
  useEffect(() => { fetchItems(); }, [q, storeId, isSuper]);

  const openCreate = () => { setForm({ name: "", email: "", password: "" }); setOpen(true); };

  const submitForm = async () => {
    setError(null); setMessage(null); setSaving(true);
    try {
      const url = new URL("/api/staff", window.location.origin);
      if (isSuper && storeId) url.searchParams.set("store", storeId);
      const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat staff");
      setOpen(false); setMessage("Staff dibuat"); fetchItems();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <PageContainer title="Staff" description="Kelola staff/kasir">
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
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Store</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it._id} hover>
                <TableCell>{it.name}</TableCell>
                <TableCell>{it.email}</TableCell>
                <TableCell>{stores.find(s => s._id === it.store)?.name || '-'}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3}>Belum ada staff.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Buat Staff</DialogTitle>
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
          <TextField type="email" label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth margin="normal" required />
          <TextField type="password" label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth margin="normal" required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving || (isSuper && !storeId)}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
