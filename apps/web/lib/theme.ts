import { createTheme } from "@mui/material/styles";

/**
 * Design direction: this is a tool an ad-ops person watches while campaigns
 * go live, not a marketing page. The palette borrows from broadcast/exchange
 * "on-air" panels: a dark control-room base, an amber signal for anything
 * live or actionable, teal for data/search (nodding at Algolia), and IDs/SKUs
 * always rendered in mono - the way a real bid log or exchange console does.
 */
export const tokens = {
  bg: "#0F1420",
  surface: "#161D2E",
  surface2: "#1E2740",
  border: "#2A3454",
  text: "#E8ECF3",
  textDim: "#8B93AB",
  amber: "#F5A524",
  amberDim: "#C7860F",
  teal: "#2DD4BF",
  danger: "#F0576B",
};

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: tokens.bg, paper: tokens.surface },
    primary: { main: tokens.amber, contrastText: "#161200" },
    secondary: { main: tokens.teal, contrastText: "#00201C" },
    error: { main: tokens.danger },
    text: { primary: tokens.text, secondary: tokens.textDim },
    divider: tokens.border,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    h2: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    h3: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    h4: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", border: `1px solid ${tokens.border}` },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.75rem" },
      },
    },
  },
});

export const monoFont = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';
