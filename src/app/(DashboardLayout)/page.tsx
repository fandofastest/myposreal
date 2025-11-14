'use client'
import { Box } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import StoreDashboard from '@/app/(DashboardLayout)/components/dashboard/StoreDashboard';

const Dashboard = () => {
  return (
    <PageContainer title="Dashboard" description="Ringkasan toko berbasis data real">
      <Box>
        <StoreDashboard />
      </Box>
    </PageContainer>
  );
}

export default Dashboard;
