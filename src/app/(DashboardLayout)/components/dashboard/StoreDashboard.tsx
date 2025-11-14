"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Grid, Box, Typography, Stack, Chip, Avatar, Divider, LinearProgress } from "@mui/material";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

interface SaleItem {
  product: string;
  name: string;
  qty: number; // base qty
  price: number; // per base unit
  subtotal: number;
}

interface SaleDoc {
  _id: string;
  total: number;
  subtotal: number;
  discount?: number;
  tax?: number;
  createdAt: string;
  items: SaleItem[];
  paymentType?: string;
}

const currency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const StoreDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SaleDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Pull the latest 100 sales for lightweight client aggregations
        const res = await fetch("/api/sales?limit=100", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load sales");
        const data = await res.json();
        if (mounted) setSales(data.items || []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const today = useMemo(() => new Date(), []);

  const { todaySales, todayOrders, avgBasket, topProducts, paymentMix } = useMemo(() => {
    const todaySalesList = sales.filter(s => isSameDay(new Date(s.createdAt), today));
    const total = todaySalesList.reduce((a, b) => a + (b.total || 0), 0);
    const orders = todaySalesList.length;
    const avg = orders ? Math.round(total / orders) : 0;

    const productMap = new Map<string, { name: string; qty: number; subtotal: number }>();
    for (const s of todaySalesList) {
      for (const it of (s.items || [])) {
        const key = it.product;
        const cur = productMap.get(key) || { name: it.name, qty: 0, subtotal: 0 };
        cur.qty += it.qty || 0;
        cur.subtotal += it.subtotal || 0;
        productMap.set(key, cur);
      }
    }
    const top = Array.from(productMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.subtotal - a.subtotal)
      .slice(0, 5);

    const payMap = new Map<string, number>();
    for (const s of todaySalesList) {
      const k = (s.paymentType || "other").toLowerCase();
      payMap.set(k, (payMap.get(k) || 0) + (s.total || 0));
    }
    const mix = Array.from(payMap.entries())
      .map(([k, v]) => ({ type: k, amount: v }))
      .sort((a, b) => b.amount - a.amount);

    return { todaySales: total, todayOrders: orders, avgBasket: avg, topProducts: top, paymentMix: mix };
  }, [sales, today]);

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>{error}</Typography>
      )}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard title="Penjualan Hari Ini">
            <Typography variant="h4">{currency(todaySales)}</Typography>
            <Typography variant="caption" color="text.secondary">Total omzet</Typography>
          </DashboardCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard title="Order Hari Ini">
            <Typography variant="h4">{todayOrders}</Typography>
            <Typography variant="caption" color="text.secondary">Transaksi</Typography>
          </DashboardCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard title="Rata2 Keranjang">
            <Typography variant="h4">{currency(avgBasket)}</Typography>
            <Typography variant="caption" color="text.secondary">Avg basket size</Typography>
          </DashboardCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard title="Payment Mix">
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {paymentMix.length === 0 && (
                <Typography variant="body2" color="text.secondary">-</Typography>
              )}
              {paymentMix.map((p) => (
                <Chip key={p.type} size="small" label={`${p.type}: ${currency(p.amount)}`} />
              ))}
            </Stack>
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardCard title="Top Produk (Hari Ini)">
            {topProducts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Belum ada penjualan.</Typography>
            ) : (
              <Stack divider={<Divider flexItem />}>
                {topProducts.map((p) => (
                  <Stack key={p.id} direction="row" alignItems="center" justifyContent="space-between" py={1.0}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 28, height: 28 }}>{p.name?.charAt(0) || "?"}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Qty: {p.qty}</Typography>
                      </Box>
                    </Stack>
                    <Typography variant="subtitle2">{currency(p.subtotal)}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardCard title="Transaksi Terbaru">
            <Stack divider={<Divider flexItem />}>
              {sales.slice(0, 8).map((s) => (
                <Stack key={s._id} direction="row" alignItems="center" justifyContent="space-between" py={1.0}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{currency(s.total)}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(s.createdAt).toLocaleString("id-ID")}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">{(s.items?.[0]?.name || "")} {s.items && s.items.length > 1 ? `+${s.items.length - 1} lainnya` : ""}</Typography>
                </Stack>
              ))}
              {sales.length === 0 && (
                <Typography variant="body2" color="text.secondary">Belum ada transaksi.</Typography>
              )}
            </Stack>
          </DashboardCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StoreDashboard;
