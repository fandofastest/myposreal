"use client";
import React, { useEffect, useState } from "react";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: "", code: "", address: "", phone: "" });

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat stores");
      const data = await res.json();
      setStores(data.stores || []);
    } catch (e: any) {
      // ignore list error for now
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", phone: "" });
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ name: row.name || "", code: row.code || "", address: row.address || "", phone: row.phone || "" });
    setOpen(true);
  };

  const submitForm = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const url = editing ? `/api/stores/${editing._id}` : "/api/stores";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gagal menyimpan store");
      }
      setOpen(false);
      setMessage(editing ? "Store diperbarui" : "Store dibuat");
      fetchStores();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus store ini?")) return;
    try {
      const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus store");
      setMessage("Store dihapus");
      fetchStores();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <PageContainer title="Stores" description="Kelola stores">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Daftar Store</Typography>
          <Button variant="contained" onClick={openCreate}>Create</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stores.map((s) => (
              <TableRow key={s._id} hover>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.code}</TableCell>
                <TableCell>{s.address || '-'}</TableCell>
                <TableCell>{s.phone || '-'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(s)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete(s._id)}>Hapus</Button>
                </TableCell>
              </TableRow>
            ))}
            {stores.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Belum ada store.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Store" : "Create Store"}</DialogTitle>
        <DialogContent>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth margin="normal" required />
          <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth margin="normal" required />
          <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth margin="normal" />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
