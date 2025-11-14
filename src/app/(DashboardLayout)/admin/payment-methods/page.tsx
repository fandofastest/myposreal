"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, MenuItem, Select, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";

interface PMItem {
  _id: string;
  name: string;
  code: string;
  type: 'cash' | 'transfer' | 'ewallet';
  provider?: string;
  accountNumber?: string;
  accountName?: string;
  status: string;
}

export default function PaymentMethodsPage() {
  const [items, setItems] = useState<PMItem[]>([]);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: "", code: "", type: "cash", provider: "", accountNumber: "", accountName: "" });

  const isSuper = useMemo(() => Boolean(me?.roles?.includes("superadmin")), [me]);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.user);
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
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (isSuper && storeId) params.set("store", storeId);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/payment-methods?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat payment methods");
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMe(); fetchStores(); }, []);
  useEffect(() => { fetchItems(); }, [q, storeId, isSuper, page, limit]);

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", type: "cash", provider: "", accountNumber: "", accountName: "" }); setOpen(true); };
  const openEdit = (row: any) => { setEditing(row); setForm({ name: row.name || "", code: row.code || "", type: row.type || "cash", provider: row.provider || "", accountNumber: row.accountNumber || "", accountName: row.accountName || "" }); setOpen(true); };

  const submitForm = async () => {
    setError(null); setMessage(null); setSaving(true);
    try {
      if (editing) {
        const body = {
          ...form,
          provider: form.provider || undefined,
          accountNumber: form.accountNumber || undefined,
          accountName: form.accountName || undefined,
        };
        const res = await fetch(`/api/payment-methods/${editing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || "Gagal memperbarui metode bayar"); }
      } else {
        const payload: any = {
          ...form,
          provider: form.provider || undefined,
          accountNumber: form.accountNumber || undefined,
          accountName: form.accountName || undefined,
        };
        const url = new URL("/api/payment-methods", window.location.origin);
        if (isSuper && storeId) url.searchParams.set("store", storeId);
        const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || "Gagal membuat metode bayar"); }
      }
      setOpen(false); setMessage(editing ? "Metode bayar diperbarui" : "Metode bayar dibuat"); fetchItems();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus metode bayar ini?")) return;
    try { const res = await fetch(`/api/payment-methods/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Gagal menghapus metode bayar"); setMessage("Metode bayar dihapus"); fetchItems(); } catch (e: any) { setError(e.message); }
  };

  return (
    <PageContainer title="Payment Methods" description="Kelola metode pembayaran">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" gap={2} alignItems="center">
            <TextField size="small" label="Cari" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="outlined" onClick={fetchItems} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
          </Box>
          <Button variant="contained" onClick={openCreate} disabled={isSuper && !storeId}>Create</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Account</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it._id} hover>
                <TableCell>{it.name}</TableCell>
                <TableCell>{it.code}</TableCell>
                <TableCell>{it.type}</TableCell>
                <TableCell>{it.provider || '-'}</TableCell>
                <TableCell>{it.accountName ? `${it.accountName}${it.accountNumber ? ` (${it.accountNumber})` : ''}` : (it.accountNumber || '-')}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(it)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete(it._id)}>Hapus</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6}>Belum ada metode bayar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="body2">
            Page {page} of {Math.max(1, Math.ceil(total / limit))} • Total {total}
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            <Button size="small" variant="outlined" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="small" variant="outlined" disabled={loading || page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel id="limit-label">Rows</InputLabel>
              <Select labelId="limit-label" label="Rows" value={String(limit)} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Payment Method" : "Create Payment Method"}</DialogTitle>
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
          <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth margin="normal" required />
          <FormControl fullWidth margin="normal">
            <InputLabel id="type-label">Type</InputLabel>
            <Select labelId="type-label" label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
              <MenuItem value="ewallet">E-Wallet</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} fullWidth margin="normal" />
          <TextField label="Account Number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} fullWidth margin="normal" />
          <TextField label="Account Name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving || (isSuper && !storeId)}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
