import { createTheme } from "@mui/material/styles";

/** Shared Northstar foundations for the storefront and campaign workspace. */
export const northstar = {
  background: "#fafbf8", paper: "#ffffff", soft: "#eef3e7", border: "#e1e7db",
  ink: "#203b2d", muted: "#526249", green: "#254a39", sage: "#527741", lime: "#d5ee9c",
};
export const tokens = {
  bg: northstar.background, surface: northstar.paper, surface2: northstar.soft,
  border: northstar.border, text: northstar.ink, textDim: northstar.muted,
  // Existing console components use these aliases for their accent colors.
  amber: northstar.green, amberDim: "#1a3528", teal: northstar.sage, danger: "#b64b3c",
};
export const monoFont = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';
const fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

export const shopTheme = createTheme({
  palette: { mode: "light", primary: { main: northstar.green, contrastText: "#fff" }, secondary: { main: "#a9cf57" }, background: { default: northstar.background, paper: northstar.paper }, text: { primary: northstar.ink, secondary: "#526249" } },
  typography: { fontFamily, button: { textTransform: "none", fontWeight: 600 } },
  shape: { borderRadius: 10 }, components: {
    MuiInputBase: { styleOverrides: { input: { "&::placeholder": { color: "#526249", opacity: 1 } } } },
    MuiTypography: { defaultProps: { variantMapping: { subtitle1: "p", subtitle2: "p" } } },
    MuiButton: { styleOverrides: { root: { boxShadow: "none", minHeight: 44, minWidth: 44 } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
  },
});

export const theme = createTheme(shopTheme, {
  palette: { secondary: { main: northstar.sage, contrastText: "#fff" }, divider: northstar.border, error: { main: tokens.danger }, success: { main: northstar.sage } },
  shape: { borderRadius: 12 },
  typography: {
    h3: { fontWeight: 500, letterSpacing: "-1.4px" }, h4: { fontWeight: 500, letterSpacing: "-1px", fontSize: "2rem" },
    h5: { fontWeight: 500, letterSpacing: "-.5px" }, h6: { fontWeight: 600, fontSize: "1.05rem", letterSpacing: "-.25px" },
    body2: { lineHeight: 1.75 }, overline: { fontSize: ".63rem", fontWeight: 700, letterSpacing: ".15em" },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none", border: `1px solid ${northstar.border}`, boxShadow: "none" } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 13 } } },
    MuiCardContent: { styleOverrides: { root: { padding: 24, "&:last-child": { paddingBottom: 24 } } } },
    MuiButton: { styleOverrides: { root: { minHeight: 44, minWidth: 44, borderRadius: 7, boxShadow: "none", padding: "9px 17px", fontSize: ".78rem", "&:hover": { boxShadow: "none" } }, outlined: { borderColor: "#ced8c5" } } },
    MuiIconButton: { styleOverrides: { root: { color: northstar.muted } } },
    MuiChip: { styleOverrides: { root: { fontSize: ".69rem", fontWeight: 500, borderRadius: 6 }, outlined: { borderColor: "#d9e2d1" } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8, backgroundColor: "#fff", fontSize: ".85rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dbe2d4" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#98ae87" } } } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: ".83rem" } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: ".68rem", lineHeight: 1.6, marginTop: 7 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: northstar.border }, head: { color: northstar.muted, fontSize: ".7rem", backgroundColor: "#f4f7ef" }, body: { fontSize: ".78rem" } } },
    MuiTabs: { styleOverrides: { indicator: { height: 2 }, root: { borderBottom: `1px solid ${northstar.border}` } } },
    MuiTab: { styleOverrides: { root: { textTransform: "none", fontSize: ".79rem", minHeight: 46 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 9, fontSize: ".8rem" } } },
    MuiStepIcon: { styleOverrides: { root: { color: "#65745b", "&.Mui-active": { color: northstar.green }, "&.Mui-completed": { color: northstar.green } }, text: { fill: "#fff", fontWeight: 600 } } },
    MuiStepper: { styleOverrides: { root: { backgroundColor: "#f3f6ed", padding: "22px 12px", borderRadius: 10 } } },
    MuiStepLabel: { styleOverrides: { label: { fontSize: ".73rem" } } },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: "#eaf0e2" } } },
  },
});
