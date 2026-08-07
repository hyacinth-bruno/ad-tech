import { AppBar, Toolbar, Typography, Box, Stack, Button, Container } from "@mui/material";
import Link from "next/link";
import { tokens, monoFont } from "@/lib/theme";

function LiveDot() {
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: tokens.amber,
        boxShadow: `0 0 0 0 ${tokens.amber}`,
        animation: "pulse 1.8s ease-out infinite",
        "@keyframes pulse": {
          "0%": { boxShadow: `0 0 0 0 ${tokens.amber}66` },
          "70%": { boxShadow: `0 0 0 6px ${tokens.amber}00` },
          "100%": { boxShadow: `0 0 0 0 ${tokens.amber}00` },
        },
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    />
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ borderBottom: `1px solid ${tokens.border}`, backdropFilter: "blur(6px)" }}>
        <Toolbar sx={{ gap: 3 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <LiveDot />
            <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
              Retail Media Console
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" gap={1}>
            <Link href="/" passHref legacyBehavior>
              <Button component="a" color="inherit">
                Campaigns
              </Button>
            </Link>
            <Link href="/campaigns/new" passHref legacyBehavior>
              <Button component="a" variant="contained" color="primary">
                New campaign
              </Button>
            </Link>
            <Link href="/preview" passHref legacyBehavior>
              <Button component="a" color="secondary" variant="outlined">
                Live preview
              </Button>
            </Link>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 5 }}>
        {children}
      </Container>
      <Box component="footer" sx={{ borderTop: `1px solid ${tokens.border}`, py: 3, mt: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="caption" sx={{ fontFamily: monoFont, color: "text.secondary" }}>
            campaign-api :4001 · ad-delivery-api :4002 · demo build
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
