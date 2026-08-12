import { useState } from "react";
import {
  AppBar, Badge, Box, Button, Container, Divider, Drawer, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Tooltip, Typography,
} from "@mui/material";
import {
  AutoStoriesRounded, CloseRounded, Inventory2Outlined, MenuRounded,
  PaymentsOutlined, ReceiptLongOutlined, ShoppingBagOutlined, StorefrontRounded,
} from "@mui/icons-material";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useCartStore } from "../store/cartStore";

const navItems = [
  { label: "Shop", to: "/", icon: <StorefrontRounded /> },
  { label: "Inventory", to: "/manage/books", icon: <Inventory2Outlined /> },
  { label: "Orders", to: "/manage/orders", icon: <ReceiptLongOutlined /> },
  { label: "Payments", to: "/manage/payments", icon: <PaymentsOutlined /> },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const count = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));

  const navigation = (
    <List sx={{ px: 1.5 }}>
      {navItems.map((item) => (
        <ListItemButton
          key={item.to}
          component={Link}
          to={item.to}
          selected={location.pathname === item.to}
          onClick={() => setMobileOpen(false)}
          sx={{ borderRadius: 2, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box minHeight="100vh">
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "rgba(255,254,250,.88)", backdropFilter: "blur(18px)" }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 68, md: 78 } }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" }, mr: 1 }} aria-label="Open menu">
              <MenuRounded />
            </IconButton>
            <Stack component={Link} to="/" direction="row" alignItems="center" spacing={1.25} sx={{ color: "primary.main", textDecoration: "none" }}>
              <Box sx={{ width: 39, height: 39, borderRadius: "12px 12px 12px 3px", bgcolor: "primary.main", color: "white", display: "grid", placeItems: "center" }}>
                <AutoStoriesRounded fontSize="small" />
              </Box>
              <Box>
                <Typography fontFamily="Georgia, serif" fontSize={19} fontWeight={700} lineHeight={1.05}>Leila Sinor</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: ".16em" }}>BOOKS & STORIES</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ ml: "auto", display: { xs: "none", md: "flex" } }}>
              {navItems.map((item) => (
                <Button key={item.to} component={Link} to={item.to} color={location.pathname === item.to ? "primary" : "inherit"} variant={location.pathname === item.to ? "soft" as never : "text"}>
                  {item.label}
                </Button>
              ))}
            </Stack>
            <Tooltip title="Shopping bag">
              <IconButton component={Link} to="/cart" color="primary" sx={{ ml: { xs: "auto", md: 1.5 }, bgcolor: "rgba(22,60,53,.07)" }} aria-label={`Shopping bag with ${count} items`}>
                <Badge badgeContent={count} color="secondary"><ShoppingBagOutlined /></Badge>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: 290 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" p={2}>
          <Typography variant="h6">Browse</Typography>
          <IconButton onClick={() => setMobileOpen(false)}><CloseRounded /></IconButton>
        </Stack>
        <Divider />
        {navigation}
      </Drawer>

      <Box component="main"><Outlet /></Box>

      <Box component="footer" sx={{ mt: 10, py: 5, borderTop: 1, borderColor: "divider", bgcolor: "rgba(255,254,250,.65)" }}>
        <Container maxWidth="xl">
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
            <Typography fontWeight={800} color="primary">Leila Sinor Books</Typography>
            <Typography variant="body2" color="text.secondary">Thoughtful books. Secure M-Pesa checkout. Built in Kenya.</Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
