import { Grid, Skeleton } from "@mui/material";

export default function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Skeleton variant="rounded" height={410} sx={{ borderRadius: 3 }} />
        </Grid>
      ))}
    </Grid>
  );
}
