"use client";
import React, { useEffect, useMemo, useState } from "react";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import { Box, Button, Paper, TextField, Typography, Alert, Grid, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, Divider, MenuItem, Select, Stack, Chip } from "@mui/material";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function SalesHistoryPage() {
  const [me, setMe] = useState<any>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [storeSetting, setStoreSetting] = useState<any>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidId, setVoidId] = useState<string>("");
  const [voidReason, setVoidReason] = useState<string>("");
  const [voidLoading, setVoidLoading] = useState(false);
  const [range, setRange] = useState<'today'|'week'|'month'|'custom'>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [cashierId, setCashierId] = useState<string>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [staffOpts, setStaffOpts] = useState<any[]>([]);
  const [pmOpts, setPmOpts] = useState<any[]>([]);
  const [customerOpts, setCustomerOpts] = useState<any[]>([]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d: Date, withTime = false) => withTime
    ? d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const computeRange = () => {
    const today = new Date();
    if (range === 'today') {
      const s = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const e = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return { from: toYMD(s), to: toYMD(e) };
    }
    if (range === 'week') {
      const d = new Date(today);
      const day = (d.getDay()+6)%7; // Monday start
      const s = new Date(d); s.setDate(d.getDate()-day);
      const e = new Date(s); e.setDate(s.getDate()+6);
      return { from: toYMD(s), to: toYMD(e) };
    }
    if (range === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth()+1, 0);
      return { from: toYMD(s), to: toYMD(e) };
    }
    // custom
    return { from: startDate || '', to: endDate || '' };
  };

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.user);
      const roles: string[] = data?.user?.roles || [];
      setIsSuper(Boolean(roles.includes('superadmin')));
      setIsAdmin(Boolean(roles.includes('admin') || roles.includes('superadmin')));
      if (data.user?.store) setStoreId(data.user.store);
    } catch {}
  };

  const openVoidDialog = (id: string) => {
    setVoidId(id);
    setVoidReason("");
    setVoidOpen(true);
  };

  const confirmVoid = async () => {
    if (!voidId) return;
    setVoidLoading(true);
    try {
      const res = await fetch(`/api/sales/${voidId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void', reason: voidReason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal membatalkan transaksi');
      fetchList();
      if (receipt && receipt._id === voidId) setReceipt(data);
      setVoidOpen(false);
    } catch (e) {}
    finally { setVoidLoading(false); }
  };
  const fetchStores = async () => { try { const res = await fetch('/api/stores', { cache: 'no-store' }); if (!res.ok) return; const data = await res.json(); setStores(data.stores || []); } catch {} };
  const fetchStaff = async () => { try { const res = await fetch('/api/staff', { cache: 'no-store' }); if (!res.ok) return; const data = await res.json(); setStaffOpts(data.items || data.staff || []); } catch {} };
  const fetchPaymentMethods = async () => { try { const url = new URL('/api/payment-methods', window.location.origin); if (isSuper && storeId) url.searchParams.set('store', storeId); const res = await fetch(url.toString(), { cache: 'no-store' }); if (!res.ok) return; const data = await res.json(); setPmOpts(data.items || data.paymentMethods || []); } catch {} };
  const fetchCustomers = async () => { try { const url = new URL('/api/customers', window.location.origin); if (isSuper && storeId) url.searchParams.set('store', storeId); const res = await fetch(url.toString(), { cache: 'no-store' }); if (!res.ok) return; const data = await res.json(); setCustomerOpts(data.items || data.customers || []); } catch {} };

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isSuper && storeId) params.set('store', storeId);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const r = computeRange();
      if (r.from) params.set('from', r.from);
      if (r.to) params.set('to', r.to);
      if (cashierId) params.set('cashier', cashierId);
      if (paymentMethodId) params.set('paymentMethod', paymentMethodId);
      if (customerId) params.set('customer', customerId);
      const res = await fetch(`/api/sales?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) { setItems(data.items || []); setTotal(data.total || 0); }
    } catch {}
    finally { setLoading(false); }
  };

  const fetchStoreSetting = async () => {
    try { const url = new URL('/api/settings', window.location.origin); if (isSuper && storeId) url.searchParams.set('store', storeId); const res = await fetch(url.toString(), { cache: 'no-store' }); const data = await res.json(); if (res.ok) setStoreSetting(data.setting || null); } catch {}
  };

  const openReceipt = async (id: string) => {
    try {
      const res = await fetch(`/api/sales/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengambil struk');
      setReceipt(data);
      setOpen(true);
    } catch {}
  };

  useEffect(() => { fetchMe(); fetchStores(); fetchStaff(); }, []);
  useEffect(() => { fetchList(); fetchStoreSetting(); fetchPaymentMethods(); fetchCustomers(); }, [isSuper, storeId, page, limit, range, startDate, endDate, cashierId, paymentMethodId, customerId]);

  const rangeDates = useMemo(() => {
    const today = new Date();
    if (range === 'today') {
      const s = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const e = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23,59,59,999);
      return { start: s, end: e, label: fmtDate(s) };
    }
    if (range === 'week') {
      const d = new Date(today);
      const day = (d.getDay()+6)%7; // Monday start
      const s = new Date(d); s.setDate(d.getDate()-day); s.setHours(0,0,0,0);
      const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999);
      return { start: s, end: e, label: `${fmtDate(s)} - ${fmtDate(e)}` };
    }
    if (range === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth()+1, 0, 23,59,59,999);
      return { start: s, end: e, label: `${fmtDate(s)} - ${fmtDate(e)}` };
    }
    // custom
    const s = startDate ? new Date(startDate+"T00:00:00") : new Date(0);
    const e = endDate ? new Date(endDate+"T23:59:59") : new Date(8640000000000000);
    return { start: s, end: e, label: startDate && endDate ? `${fmtDate(s)} - ${fmtDate(e)}` : 'Semua' };
  }, [range, startDate, endDate]);

  const filtered = useMemo(() => {
    const s = rangeDates.start.getTime();
    const e = rangeDates.end.getTime();
    return items.filter(it => {
      const t = new Date(it.paidAt || it.createdAt).getTime();
      if (!(t >= s && t <= e)) return false;
      const cashierVal = (it.cashier && typeof it.cashier === 'object') ? it.cashier._id : it.cashier;
      if (cashierId && String(cashierVal || '') !== cashierId) return false;
      const pmVal = (it.paymentMethod && typeof it.paymentMethod === 'object') ? it.paymentMethod._id : it.paymentMethod;
      if (paymentMethodId && String(pmVal || '') !== paymentMethodId) return false;
      const custVal = (it.customer && typeof it.customer === 'object') ? it.customer._id : it.customer;
      if (customerId && String(custVal || '') !== customerId) return false;
      return true;
    });
  }, [items, rangeDates]);

  const summary = useMemo(() => {
    const totalAmt = filtered.reduce((a, b) => a + (b.total || 0), 0);
    const orders = filtered.length;
    const avg = orders ? Math.round(totalAmt / orders) : 0;
    const mixMap = new Map<string, number>();
    for (const s of filtered) {
      const k = (s.paymentType || s.paymentMethod?.name || 'lainnya').toLowerCase();
      mixMap.set(k, (mixMap.get(k)||0) + (s.total || 0));
    }
    const mix = Array.from(mixMap.entries()).map(([type, amount]) => ({ type, amount })).sort((a,b)=>b.amount-a.amount);
    return { totalAmt, orders, avg, mix };
  }, [filtered]);

  const exportCSV = () => {
    const header = ['ID','Tanggal','Total','Metode','Kasir','Pelanggan'];
    const lines = filtered.map((it:any) => {
      const d = fmtDate(new Date(it.paidAt || it.createdAt), true);
      const pmName = (it.paymentMethod && typeof it.paymentMethod === 'object') ? (it.paymentMethod.name || '') : (it.paymentType || '');
      const cashierName = (it.cashier && typeof it.cashier === 'object') ? (it.cashier.name || it.cashier.email || '') : ((() => { const s = staffOpts.find((s:any)=>String(s._id)===String(it.cashier)); return s?.name || s?.email || ''; })());
      const custName = (it.customer && typeof it.customer === 'object') ? (it.customer.name || '') : (customerOpts.find(c=>String(c._id)===String(it.customer))?.name || '');
      return [it._id, d, String(it.total||0), pmName, cashierName, custName]
        .map(v => String(v).replaceAll('"','""'))
        .map(v => `"${v}` + `"`).join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sales-${rangeDates.label.replaceAll(' ','')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const daySeries = useMemo(() => {
    if (!(range === 'week' || range === 'month')) return null;
    const start = new Date(rangeDates.start);
    const end = new Date(rangeDates.end);
    const cats: string[] = [];
    const vals: number[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      cats.push(label);
      const total = filtered
        .filter(it => {
          const tt = new Date(it.paidAt || it.createdAt);
          return tt.getFullYear()===d.getFullYear() && tt.getMonth()===d.getMonth() && tt.getDate()===d.getDate();
        })
        .reduce((a,b)=>a+(b.total||0),0);
      vals.push(total);
    }
    return { categories: cats, series: [{ name: 'Total', data: vals }] };
  }, [filtered, range, rangeDates]);

  return (
    <PageContainer title="Sales History" description="Riwayat penjualan dan reprint struk">
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Daftar Transaksi</Typography>
          <Box display="flex" gap={1}>
            <Select size="small" value={range} onChange={(e:any)=>setRange(e.target.value)}>
              <MenuItem value="today">Hari ini</MenuItem>
              <MenuItem value="week">Minggu ini</MenuItem>
              <MenuItem value="month">Bulan ini</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
            {range === 'custom' && (
              <>
                <TextField size="small" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
                <TextField size="small" type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
              </>
            )}
            <Select size="small" value={cashierId} displayEmpty onChange={(e:any)=>setCashierId(e.target.value)} sx={{ minWidth: 140 }}>
              <MenuItem value=""><em>Semua Kasir</em></MenuItem>
              {staffOpts.map((s:any)=>(<MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>))}
            </Select>
            <Select size="small" value={paymentMethodId} displayEmpty onChange={(e:any)=>setPaymentMethodId(e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value=""><em>Semua Metode</em></MenuItem>
              {pmOpts.map((p:any)=>(<MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>))}
            </Select>
            <Select size="small" value={customerId} displayEmpty onChange={(e:any)=>setCustomerId(e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value=""><em>Semua Pelanggan</em></MenuItem>
              {customerOpts.map((c:any)=>(<MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>))}
            </Select>
            <Button variant="text" onClick={()=>{setCashierId(''); setPaymentMethodId(''); setCustomerId('');}}>Clear</Button>
            <Button variant="outlined" onClick={fetchList} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
            <Button variant="contained" onClick={exportCSV}>Export CSV</Button>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DashboardCard title="Total Penjualan">
              <Typography variant="h5">{fmt(summary.totalAmt)}</Typography>
              <Typography variant="caption" color="text.secondary">{rangeDates.label}</Typography>
            </DashboardCard>
          </Grid>
        {daySeries && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12 }}>
              <DashboardCard title="Rekap Harian">
                <Chart
                  options={{
                    chart: { type: 'area', toolbar: { show: false }, height: 220 },
                    dataLabels: { enabled: false },
                    stroke: { curve: 'smooth', width: 3 },
                    xaxis: { categories: daySeries.categories },
                    tooltip: { y: { formatter: (val:number)=> new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val||0) } }
                  }}
                  series={daySeries.series as any}
                  type="area"
                  height={220}
                />
              </DashboardCard>
            </Grid>
          </Grid>
        )}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DashboardCard title="Jumlah Order">
              <Typography variant="h5">{summary.orders}</Typography>
              <Typography variant="caption" color="text.secondary">Transaksi</Typography>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DashboardCard title="Rata2 Keranjang">
              <Typography variant="h5">{fmt(summary.avg)}</Typography>
              <Typography variant="caption" color="text.secondary">Avg basket</Typography>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DashboardCard title="Payment Mix">
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {summary.mix.length === 0 && (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
                {summary.mix.map((p) => (
                  <Chip key={p.type} size="small" label={`${p.type}: ${fmt(p.amount)}`} />
                ))}
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Metode</TableCell>
              <TableCell>Kasir</TableCell>
              <TableCell>Pelanggan</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((it) => (
              <TableRow key={it._id} hover>
                <TableCell>{it._id}</TableCell>
                <TableCell>{fmtDate(new Date(it.paidAt || it.createdAt), true)}</TableCell>
                <TableCell>{fmt(it.total)}</TableCell>
                <TableCell>{it.paymentMethod?.name || it.paymentType}</TableCell>
                <TableCell>{(() => {
                  if (it.cashier && typeof it.cashier === 'object') return it.cashier.name || it.cashier.email || '-';
                  const s = staffOpts.find(s=>String(s._id)===String(it.cashier));
                  return s?.name || s?.email || '-';
                })()}</TableCell>
                <TableCell>{(it.customer && typeof it.customer === 'object' ? (it.customer.name || '') : customerOpts.find(c=>String(c._id)===String(it.customer))?.name) || '-'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openReceipt(it._id)}>Lihat/Print</Button>
                  {isAdmin && it.status !== 'voided' && (
                    <Button size="small" color="error" onClick={() => openVoidDialog(it._id)}>Void</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7}>Belum ada transaksi.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="body2">Page {page} of {Math.max(1, Math.ceil(total / limit))} • Total {total}</Typography>
          <Box display="flex" gap={1}>
            <Button size="small" variant="outlined" disabled={loading || page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
            <Button size="small" variant="outlined" disabled={loading || page >= Math.ceil(total / limit)} onClick={() => setPage(p => p+1)}>Next</Button>
          </Box>
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Struk Penjualan</DialogTitle>
        <DialogContent>
          {receipt ? (
            <Box id="history-receipt" sx={{ typography: 'body2' }}>
              {receipt.status === 'voided' && (
                <Typography variant="h6" color="error" textAlign="center">VOID</Typography>
              )}
              {storeSetting?.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storeSetting.logoUrl} alt="logo" style={{ width: 72, height: 72, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
              )}
              <Typography variant="subtitle1" fontWeight={700} textAlign="center">{stores.find(s => s._id === (storeId || receipt.store))?.name || 'Toko'}</Typography>
              {storeSetting?.receiptHeader && (
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ whiteSpace: 'pre-line', mt: 0.5 }}>{storeSetting.receiptHeader}</Typography>
              )}
              <Divider sx={{ my: 1 }} />
              {receipt.items?.map((it: any) => (
                <Box key={String(it.product)} display="flex" justifyContent="space-between" my={0.5}>
                  <Box>
                    <Typography variant="body2">{it.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{it.qty} x {fmt(it.price)}</Typography>
                  </Box>
                  <Typography variant="body2">{fmt(it.subtotal)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
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
            <Typography variant="body2">Memuat struk...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Tutup</Button>
          <Button variant="contained" onClick={() => {
            const w = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150'); if (!w) return;
            const html = document.getElementById('history-receipt')?.innerHTML || '';
            w.document.write(`<!doctype html><html><head><title>Struk</title><style>body{font-family: Arial; padding:12px;}</style></head><body>${html}</body></html>`);
            w.document.close(); w.focus(); w.print(); w.close();
          }}>Print</Button>
        </DialogActions>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={voidOpen} onClose={() => !voidLoading && setVoidOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Void Transaksi</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>Pembatalan akan mengembalikan stok untuk item yang track stock.</Typography>
          <TextField label="Alasan (opsional)" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} fullWidth multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidOpen(false)} disabled={voidLoading}>Batal</Button>
          <Button variant="contained" color="error" onClick={confirmVoid} disabled={voidLoading}>{voidLoading ? 'Memproses...' : 'Void'}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
