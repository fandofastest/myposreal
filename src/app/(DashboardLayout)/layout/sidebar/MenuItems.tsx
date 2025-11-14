import {
  IconLayoutDashboard,
  IconBuildingStore,
  IconUsersGroup,
  IconSettings,
  IconCashRegister,
  IconHistory,
  IconPackage,
  IconTruckDelivery,
  IconUsers,
  IconCategory,
  IconRuler,
  IconShoppingCartPlus,
  IconId,
  IconCreditCard,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "HOME",
  },

  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    href: "/",
  },
  {
    id: uniqueId(),
    title: "POS Sales",
    icon: IconCashRegister,
    href: "/pos/sales",
  },
  {
    id: uniqueId(),
    title: "Sales History",
    icon: IconHistory,
    href: "/pos/sales/history",
  },
  {
    navlabel: true,
    subheader: "ADMIN",
  },
  {
    id: uniqueId(),
    title: "Products",
    icon: IconPackage,
    href: "/admin/products",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Suppliers",
    icon: IconTruckDelivery,
    href: "/admin/suppliers",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Customers",
    icon: IconUsers,
    children: [
      {
        id: uniqueId(),
        title: "Customers",
        icon: IconUsers,
        href: "/admin/customers",
        adminOnly: true,
      },
      {
        id: uniqueId(),
        title: "Customer Groups",
        icon: IconUsersGroup,
        href: "/admin/customer-groups",
        adminOnly: true,
      },
    ],
  },
  {
    id: uniqueId(),
    title: "Categories",
    icon: IconCategory,
    href: "/admin/categories",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Units",
    icon: IconRuler,
    href: "/admin/units",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Purchasing",
    icon: IconShoppingCartPlus,
    href: "/admin/purchasing",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Staff",
    icon: IconId,
    href: "/admin/staff",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Payment Methods",
    icon: IconCreditCard,
    href: "/admin/payment-methods",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Settings",
    icon: IconSettings,
    href: "/admin/settings",
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: "Stores",
    icon: IconBuildingStore,
    href: "/admin/stores",
    superOnly: true,
  },
  {
    id: uniqueId(),
    title: "Users",
    icon: IconUsersGroup,
    href: "/admin/users",
    superOnly: true,
  },

];

export default Menuitems;


