import React, { useEffect, useState } from "react";
import Menuitems from "./MenuItems";
import { Box, Typography } from "@mui/material";
import {
  Logo,
  Sidebar as MUI_Sidebar,
  Menu,
  MenuItem,
  Submenu,
} from "react-mui-sidebar";
import { IconPoint } from '@tabler/icons-react';
import Link from "next/link";
import { usePathname } from "next/navigation";
// removed upgrade/placeholder block


const renderMenuItems = (items: any, pathDirect: any) => {

  return items.map((item: any) => {

    const Icon = item.icon ? item.icon : IconPoint;

    const itemIcon = <Icon stroke={1.5} size="1.3rem" />;

    if (item.subheader) {
      // Display Subheader
      return (
        <Menu
          subHeading={item.subheader}
          key={item.subheader}
        />
      );
    }

    //If the item has children (submenu)
    if (item.children) {
      return (
        <Box px={3} key={item.id}>
          <Submenu
            key={item.id}
            title={item.title}
            icon={itemIcon}
            borderRadius='7px'
          >
            {renderMenuItems(item.children, pathDirect)}
          </Submenu>
        </Box>
      );
    }

    // If the item has no children, render a MenuItem

    return (
      <Box px={3} key={item.id}>
        <MenuItem
          key={item.id}
          isSelected={pathDirect === item?.href}
          borderRadius='8px'
          icon={itemIcon}
          link={item.href}
          component={Link}
        >
          {item.title}
        </MenuItem >
      </Box>

    );
  });
};


const SidebarItems = () => {
  const pathname = usePathname();
  const pathDirect = pathname;
  const [isSuper, setIsSuper] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const roles = data?.user?.roles || [];
          if (mounted) {
            setIsSuper(Boolean(roles.includes('superadmin')));
            setIsAdmin(Boolean(roles.includes('admin') || roles.includes('superadmin')));
          }
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const data = await res.json();
        if (mounted && res.ok) setSetting(data.setting || null);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const itemsFiltered = Menuitems.filter((it: any) => {
    if (it.superOnly) return isSuper;
    if (it.adminOnly) return isAdmin;
    return true;
  });

  return (
    < >
      <MUI_Sidebar width={"100%"} showProfile={false} themeColor={"#5D87FF"} themeSecondaryColor={'#49beff'} >

        <Box px={2} py={2} component={Link as any} href="/" sx={{ textDecoration: 'none', display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setting?.logoUrl || '/images/placeholder.png'}
            alt="logo"
            style={{ height: 36, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
          />
          <Typography variant="subtitle2" textAlign="center" mt={0.5} noWrap sx={{ fontWeight: 700, fontSize: 13, color: 'inherit' }}>
            {typeof setting?.receiptHeader === 'string' && setting.receiptHeader.trim() ? (setting.receiptHeader.split('\n')[0]) : 'Point of Sale'}
          </Typography>
        </Box>

        {renderMenuItems(itemsFiltered, pathDirect)}
      </MUI_Sidebar>

    </>
  );
};
export default SidebarItems;
