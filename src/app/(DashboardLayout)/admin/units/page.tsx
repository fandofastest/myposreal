"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, MenuItem, Select, FormControl, InputLabel, FormControlLabel, Checkbox, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";

interface UnitItem {
  _id: string;
  name: string;
  code: string;
  base: boolean;
  status: string;
}

export default function UnitsPage() {
  const [items, setItems] = useState<UnitItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: "", code: "", base: false });

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
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set("store", storeId);
      const res = await fetch(`/api/units?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat unit");
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
  }, [storeId, isSuper]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", base: false });
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ name: row.name || "", code: row.code || "", base: !!row.base });
    setOpen(true);
  };

  const submitForm = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/units/${editing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal memperbarui unit");
        }
      } else {
        const url = new URL("/api/units", window.location.origin);
        if (isSuper && storeId) url.searchParams.set("store", storeId);
        const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal membuat unit");
        }
      }
      setOpen(false);
      setMessage(editing ? "Unit diperbarui" : "Unit dibuat");
      fetchItems();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus unit ini?")) return;
    try {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus unit");
      setMessage("Unit dihapus");
      fetchItems();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <PageContainer title="Units" description="Kelola unit satuan">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Daftar Unit</Typography>
          <Button variant="contained" onClick={openCreate} disabled={isSuper && !storeId}>Create</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Base</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((u) => (
              <TableRow key={u._id} hover>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.code}</TableCell>
                <TableCell>{u.base ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(u)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete(u._id)}>Hapus</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Belum ada unit.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Unit" : "Create Unit"}</DialogTitle>
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
          <FormControlLabel control={<Checkbox checked={form.base} onChange={(e) => setForm({ ...form, base: e.target.checked })} />} label="Base Unit" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving || (isSuper && !storeId)}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
