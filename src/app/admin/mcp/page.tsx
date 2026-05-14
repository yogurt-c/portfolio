import AdminBar from "@/components/admin/AdminBar";
import McpTokens from "@/components/admin/McpTokens";

export const dynamic = "force-dynamic";

export default function McpPage() {
  return (
    <>
      <AdminBar title="MCP" variant="form" />
      <McpTokens />
    </>
  );
}
