import { useId, useRef, useState } from "react";
import { Alert, Box, ButtonBase, Menu, MenuItem, Typography } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import type { Campaign, CampaignStatus as Status } from "@retail-media/shared";
import { CampaignStatus } from "./ConsoleComponents";

const statuses: Status[] = ["draft", "active", "paused", "ended"];

export function CampaignStatusControl({ campaign, onChange }: {
  campaign: Campaign;
  onChange: (status: Status) => Promise<void>;
}) {
  const id = useId();
  const savingRef = useRef(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(status: Status) {
    setAnchor(null);
    if (savingRef.current || status === campaign.status) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try { await onChange(status); }
    catch { setError("Status couldn’t be updated. Open the status menu to try again."); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return <Box sx={{ position: "relative", textAlign: "right", maxWidth: "100%" }}>
    <ButtonBase id={`${id}-button`} aria-label={`Change status for ${campaign.productName}, currently ${campaign.status}`}
      aria-haspopup="menu" aria-expanded={Boolean(anchor)} aria-controls={anchor ? `${id}-menu` : undefined}
      aria-describedby={error ? `${id}-error` : undefined} aria-busy={saving} aria-disabled={saving}
      onClick={(event) => { if (!savingRef.current) setAnchor(event.currentTarget); }}
      sx={{ minHeight: 44, minWidth: 44, borderRadius: 6, px: 0.5, gap: 0.25, opacity: saving ? 0.6 : 1,
        "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } }}>
      <CampaignStatus status={campaign.status} />
      <ArrowDropDownIcon fontSize="small" sx={{ color: "text.secondary" }} />
    </ButtonBase>
    <Typography component="span" role="status" sx={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{saving ? "Saving campaign status…" : ""}</Typography>
    <Menu id={`${id}-menu`} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
      PaperProps={{ role: "region", "aria-label": `Status options for ${campaign.productName}` }}
      MenuListProps={{ "aria-labelledby": `${id}-button` }}>
      {statuses.map((status) => <MenuItem key={status} role="menuitemradio" aria-checked={status === campaign.status}
        selected={status === campaign.status} onClick={() => void save(status)} sx={{ minHeight: 44 }}>
        {status[0].toUpperCase() + status.slice(1)}
      </MenuItem>)}
    </Menu>
    {error && <Alert id={`${id}-error`} severity="error" sx={{ maxWidth: 220, textAlign: "left", mt: 1 }}>{error}</Alert>}
  </Box>;
}
