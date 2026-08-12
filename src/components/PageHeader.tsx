import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type Props = { eyebrow?: string; title: string; description?: string; action?: ReactNode };

export default function PageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "flex-end" }} justifyContent="space-between" spacing={2} mb={4}>
      <Box>
        {eyebrow && <Typography variant="overline" color="secondary.dark" fontWeight={800} letterSpacing=".15em">{eyebrow}</Typography>}
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: 34, md: 46 } }}>{title}</Typography>
        {description && <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>{description}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}
