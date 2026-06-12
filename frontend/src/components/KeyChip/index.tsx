import { Box } from "@mui/material";

export default function KeyChip({ label }: { label: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'surface.raised',
        border: 1,
        borderColor: 'border.subtle',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 500,
        color: 'text.secondary',
        minWidth: 28,
        textAlign: 'center',
        lineHeight: '20px',
      }}
    >
      {label}
    </Box>
  )
}