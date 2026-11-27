import type { GetServerSideProps } from "next";

// Preserve previously shared search URLs after moving search into Campaigns.
export default function SearchRedirect() { return null; }
export const getServerSideProps: GetServerSideProps = async ({ resolvedUrl }) => ({
  redirect: { destination: `/${resolvedUrl.includes("?") ? resolvedUrl.slice(resolvedUrl.indexOf("?")) : ""}`, permanent: false },
});
