Below is a detailed plan for building your personal "Gooner Platform" web application. This plan is structured to be handed off to your senior developer for implementation. I've organized it into sections for clarity: **Overview**, **Architecture**, **Tech Stack**, **Key Features**, **Database Schema**, **Backend Implementation**, **Frontend Implementation**, **Storage and Video Handling**, **Security and Customization**, **Deployment and Scaling Considerations**, and **Potential Risks and Mitigations**.

The plan assumes the app is for personal use only (e.g., running on your local machine or a private server), as scraping/downloading videos from third-party.

---

### **Overview**
- **Purpose**: A personalized platform for discovering, watching, and managing adult videos from external sources. It allows adding "streams" (search queries or feeds from these sites), pulling videos, watching multiple videos simultaneously (e.g., in a grid or multi-player view), auto-saving videos in a compressed format by default, liking/disliking for categorization, and bulk actions like deleting disliked videos. Videos are stored locally for offline/lag-free playback.
- **User Flow**:
  1. User adds streams (e.g., search terms like "category:amateur" from Pornhub).
  2. App pulls video metadata and streams.
  3. User browses/watches videos (single or multi-view).
  4. Videos auto-save in compressed format unless deleted.
  5. User likes/dislikes videos, which categorizes them (e.g., "Favorites", "Disliked").
  6. Periodic cleanup: Auto-delete or prompt to uninstall (delete) highly disliked videos.
- **Scope**: MVP (Minimum Viable Product) focuses on core features. Future expansions could include AI-based recommendations or advanced customization.
- **Assumptions**: This is a single-user app (you). No multi-user auth needed. Videos are pulled via scraping or public APIs (if available); direct downloading may require tools like yt-dlp for handling streams.

---

### **Architecture**
- **High-Level Design**:
  - **Frontend**: Next.js (React-based) for a responsive UI, handling video players, grids, and interactions.
  - **Backend**: Node.js server (with Bun.js for runtime efficiency) to handle API requests, video pulling/downloading, database interactions, and file storage.
  - **Database**: PostgreSQL for storing video metadata, user preferences (likes/dislikes), categories, and stream configurations.
  - **Storage**: Local filesystem on Drive E: (e.g., E:\videos) for video files. Use subfolders for organization (e.g., E:\videos\favorites, E:\videos\disliked).
  - **Communication**: RESTful APIs between frontend and backend. Use WebSockets (e.g., via Socket.io) for real-time updates like download progress or multi-video syncing.
  - **Video Processing**: Use FFmpeg (via Node.js child processes) for compressing videos on download (e.g., reduce resolution to 720p, bitrate to 1-2 Mbps).
  - **Scraping/Pulling**: Implement custom scrapers for sites like Xvideos/Pornhub using libraries like Puppeteer or Cheerio. For video downloads, integrate yt-dlp (a YouTube-DL fork) to handle embedded streams.
- **Data Flow**:
  - Frontend requests video pulls → Backend scrapes metadata → Stores in DB → Downloads/compresses video to E: → Frontend displays and allows interactions.

---

### **Tech Stack**
- **Frontend**: Next.js (for SSR/SSG, routing), React (UI components), Tailwind CSS (styling), Video.js or React Player (for multi-video playback).
- **Backend**: Node.js (with Express.js for APIs), Bun.js (as runtime for faster execution, especially for I/O-heavy tasks like video processing).
- **Database**: PostgreSQL (with Prisma ORM for schema management and queries).
- **Video Tools**: yt-dlp (for downloading), FFmpeg (for compression/conversion).
- **Other Libraries**:
  - Axios/Cheerio/Puppeteer for scraping.
  - Socket.io for real-time (e.g., download status).
  - Sharp or FFmpeg for any thumbnail generation.
- **Environment**: Local development with Docker for containerization (e.g., Postgres in a container). Use .env files for configs like DB credentials and Drive E: path.

---

### **Key Features**
1. **Stream Management**:
   - Add/edit/delete streams (e.g., URL patterns or search queries like "pornhub.com/search?query=amateur").
   - Auto-pull videos periodically (e.g., cron job on backend).

2. **Video Pulling and Browsing**:
   - Scrape metadata (title, thumbnail URL, duration, source URL).
   - Display in a grid/list view with search/filter by category.

3. **Watching Videos**:
   - Multi-video playback: Grid view (e.g., 2x2 or customizable layout) with synchronized controls (play/pause all).
   - Single-video full-screen mode.
   - Progress tracking for watched videos.

4. **Saving/Deleting Videos**:
   - Auto-download and compress (default: 720p, H.264 codec, ~1.5 Mbps bitrate) to E:\videos.
   - Option to delete during/after watching (removes from DB and filesystem).
   - Customizable compression settings (e.g., via UI sliders for quality/bitrate).

5. **Likes/Dislikes and Categorization**:
   - Like/dislike buttons on video player/page.
   - Auto-categorize: e.g., >5 likes → "Favorites"; >3 dislikes → "Disliked".
   - Categories stored in DB; UI filters by category.

6. **Cleanup/Uninstall**:
   - Periodic scan (e.g., weekly cron) to identify most disliked videos.
   - Prompt user to bulk-delete (or auto-delete based on threshold).

7. **Customization**:
   - User settings page: Adjust compression levels, multi-view layout (e.g., 1-9 videos), auto-pull frequency, category thresholds.
   - Theme options (dark mode for "gooning").

---

### **Database Schema**
Use Prisma for schema definition. Key tables (in PostgreSQL):

- **Streams**:
  - id: UUID (primary key)
  - name: String (e.g., "Pornhub Amateur")
  - source: String (e.g., "pornhub")
  - query: String (e.g., "/search?query=amateur")
  - last_pulled: Timestamp

- **Videos**:
  - id: UUID (primary key)
  - title: String
  - source_url: String
  - thumbnail_url: String (scraped or generated)
  - duration: Integer (seconds)
  - file_path: String (e.g., "E:/videos/123.mp4")
  - compressed: Boolean
  - likes: Integer (default 0)
  - dislikes: Integer (default 0)
  - category: String (e.g., "Favorites", "Disliked") – computed or stored
  - watched: Boolean
  - stream_id: UUID (foreign key to Streams)
  - created_at: Timestamp

- **UserPreferences** (single row for your use):
  - id: UUID
  - compression_quality: String (e.g., "low", "medium")
  - multi_view_count: Integer (default 4)
  - auto_delete_threshold: Integer (e.g., dislikes > 5)

Indexes: On source_url (unique), likes/dislikes for sorting.

---

### **Backend Implementation**
- **Server Setup**: Express.js app running on Node.js/Bun. Routes:
  - GET /streams: List streams.
  - POST /streams: Add stream → Trigger initial pull.
  - GET /videos: List videos with filters (category, likes).
  - POST /videos/pull: Scrape and download from streams.
  - POST /videos/:id/like: Increment like/dislike → Update category.
  - DELETE /videos/:id: Remove from DB and E:.
- **Video Downloading**: Endpoint triggers yt-dlp child process to download, then FFmpeg to compress. Store path in DB.
- **Cron Jobs**: Use node-cron for periodic pulls and cleanups.
- **Error Handling**: Handle scraping failures (e.g., CAPTCHA), download errors, and storage limits on E:.

---

### **Frontend Implementation**
- **Pages/Routes** (Next.js):
  - /dashboard: Video grid with multi-player.
  - /streams: Manage streams.
  - /videos/:id: Single video player with like/dislike/delete.
  - /settings: Customization options.
- **Components**:
  - VideoPlayer: Custom React component using React Player for multi-instance support.
  - GridView: Dynamic grid for multiple videos.
  - LikeDislikeButtons: Update via API calls.
- **State Management**: Redux or Context API for global state (e.g., current videos playing).
- **UI/UX**: Responsive design (mobile-friendly). Dark theme default. Infinite scroll for video lists.

---

### **Storage and Video Handling**
- **Path**: Root at E:\videos. Subfolders: \original (if keeping high-res), \compressed, \categories\favorites, etc.
- **Compression Workflow**: On download → FFmpeg command: `ffmpeg -i input.mp4 -vf scale=1280:720 -b:v 1500k output.mp4`.
- **Limits**: Monitor E: space; add alerts if low (e.g., via fs module in Node.js).

---

### **Security and Customization**
- **Security**: Since personal, minimal auth (e.g., simple JWT if needed). Rate-limit scrapers to avoid bans. Use HTTPS locally if deployed.
- **Customization**: Expose settings in DB/UI. Allow scriptable extensions (e.g., custom scrapers via backend plugins).
- **Testing**: Unit tests for APIs (Jest), E2E for UI (Cypress). Test video downloads on sample sites.

---

### **Deployment and Scaling Considerations**
- **Local Deployment**: Run backend with `bun run server.js`, frontend with `next dev`. Use PM2 for process management.
- **Scaling**: For personal use, no need. If expanded, containerize with Docker Compose (Next.js + Node.js + Postgres).
- **Timeline Estimate**: MVP in 2-4 weeks (assuming senior dev full-time). Breakdown: 1 week setup/architecture, 1 week backend, 1 week frontend, 1 week testing/refinements.

---

### **Potential Risks and Mitigations**
- **Legal/Ethical**: Scraping/downloading may violate site TOS or copyrights. Mitigation: Use VPN, limit to personal use, avoid redistribution.
- **Technical**: Sites change layouts (breaking scrapers). Mitigation: Modular scrapers, easy to update.
- **Performance**: Video compression is CPU-intensive. Mitigation: Queue downloads, run in background.
- **Data Loss**: E: drive failure. Mitigation: Add backup options (e.g., cron to copy to another drive).

Hand this plan to your senior developer. They may need to refine based on specifics (e.g., exact scraping logic for each site). If you need code snippets or diagrams, let me know!