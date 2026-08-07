import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Head>
        <title>Retail Media Console</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AppShell>
        <Component {...pageProps} />
      </AppShell>
    </ThemeProvider>
  );
}
