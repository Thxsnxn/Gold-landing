# Gold Landing

Next.js landing page for live Thai gold prices.

## Features

- Main landing page with static banner images
- `/api/gold` endpoint for current gold prices
- Ornament price calculated from the buy price and `ORNAMENT_OFFSET`

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Set the ornament offset with an environment variable:

```bash
ORNAMENT_OFFSET=300
```

If `ORNAMENT_OFFSET` is not set, the app uses `300`.

## Static Banners

The landing page uses these static files:

- `public/uploads/banner1.png`
- `public/uploads/banner2.png`
- `public/uploads/banner3.png`
- `public/uploads/banner4.png`
- `public/uploads/banner5.png`
- `public/uploads/banner6.png`
- `public/uploads/banner7.png`
- `public/uploads/banner8.png`
- `public/uploads/banner9.png`
- `public/uploads/banner10.png`

Replace those files when the customer wants banner changes.
Missing banner files are skipped automatically, so you can use fewer than 10 images.

## Deploy To Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Use the default Next.js build settings:
   - Build Command: `npm run build`
   - Install Command: `npm install`
4. Add `ORNAMENT_OFFSET` in Vercel Project Settings if needed.
5. Deploy.

No VPS, PM2, or Nginx setup is required.
