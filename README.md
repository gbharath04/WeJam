# WeJam

A full-stack Jam+Chat web service prototype with Spotify Premium authentication, room creation, live chat, and host UI customization.

## Features
- Spotify OAuth authentication for premium accounts only
- Room creation and join flow
- Real-time chat powered by Socket.IO
- Host-customizable room theme and layout settings
- Responsive UI built with Next.js and Tailwind CSS

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file in the project root with:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`

## Notes
- This example uses an in-memory session and room store.
- For production, replace the session store with a database and use HTTPS.
- Spotify streaming functionality requires Spotify Premium and valid OAuth scopes.
