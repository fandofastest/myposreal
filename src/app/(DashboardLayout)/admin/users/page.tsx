"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, MenuItem, Select, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";

export default function UsersPage() {
  const [storeId, setStoreId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: "", email: "", password: "", storeId: "" });

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
      if (!res.ok) throw new Error("Gagal memuat stores");
      const data = await res.json();
      setStores(data.stores || []);
    } catch (e: any) {}
  };

  const fetchUsers = async () => {
    try {
      const url = "/api/users" + (storeId ? `?store=${storeId}` : "");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {}
  };

  useEffect(() => {
    fetchMe();
    fetchStores();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [storeId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", password: "", storeId: "" });
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ name: row.name || "", email: row.email || "", password: "", storeId: row.store || "" });
    setOpen(true);
  };

  const submitForm = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      if (editing) {
        const payload: any = { name: form.name, email: form.email };
        if (isSuper) payload.store = form.storeId || null;
        const res = await fetch(`/api/users/${editing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal memperbarui user");
        }
      } else {
        const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password, storeId: isSuper ? (form.storeId || undefined) : undefined, roles: ["admin"] }) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Gagal membuat user");
        }
      }
      setOpen(false);
      setMessage(editing ? "User diperbarui" : "User dibuat");
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus user ini?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus user");
      setMessage("User dihapus");
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <PageContainer title="Users" description="Kelola users untuk store">
      {!isSuper && (
        <Alert severity="warning" sx={{ mb: 2 }}>Hanya superadmin yang dapat mengakses halaman ini.</Alert>
      )}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Daftar User</Typography>
          <Button variant="contained" onClick={openCreate} disabled={!isSuper}>Create</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Store</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u._id} hover>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{Array.isArray(u.roles) ? u.roles.join(", ") : ""}</TableCell>
                <TableCell>{u.store || '-'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(u)} disabled={!isSuper}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete(u._id)} disabled={!isSuper}>Hapus</Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Belum ada user.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
        <DialogContent>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth margin="normal" required />
          <TextField type="email" label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth margin="normal" required />
          {!editing && (
            <TextField type="password" label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth margin="normal" required />
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel id="store-label">Store (opsional)</InputLabel>
            <Select labelId="store-label" label="Store (opsional)" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} disabled={!isSuper}>
              <MenuItem value="">Tanpa Store</MenuItem>
              {stores.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.name} ({s.code})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving || !isSuper}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
