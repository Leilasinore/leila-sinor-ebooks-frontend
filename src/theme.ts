import { alpha, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#163C35", dark: "#0E2924", light: "#3F665E", contrastText: "#fff" },
    secondary: { main: "#D8763B", dark: "#B35625", light: "#F4A676" },
    background: { default: "#F7F5EF", paper: "#FFFEFA" },
    text: { primary: "#182522", secondary: "#66736F" },
    success: { main: "#2D7D5B" },
    warning: { main: "#C67A1B" },
    error: { main: "#B84A43" },
    divider: "#E4E1D8",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600, letterSpacing: "-0.035em" },
    h2: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600, letterSpacing: "-0.025em" },
    h3: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600 },
    h4: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600 },
    h5: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, minHeight: 44, paddingInline: 20 } },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: "1px solid #E7E3D9", boxShadow: "0 14px 45px rgba(35, 52, 47, .07)" },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
    MuiTableCell: {
      styleOverrides: { head: { color: "#66736F", fontWeight: 800, background: "#F7F5EF" } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: `radial-gradient(circle at 10% 0%, ${alpha("#D8763B", 0.07)}, transparent 26%), radial-gradient(circle at 90% 5%, ${alpha("#163C35", 0.07)}, transparent 24%)`,
          backgroundAttachment: "fixed",
        },
      },
    },
  },
});

export default theme;
