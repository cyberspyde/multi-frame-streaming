# Multi-Frame Streaming Dashboard

A modern, responsive web application for monitoring multiple video streams simultaneously in a grid layout. This dashboard provides a centralized view of various simulation sources and video content.

## Author
- **cyberspyde**

## Features
- **Dynamic Video Grid**: View multiple video frames in a responsive grid layout.
- **Source Filtering**: Organize and track videos from different simulated sources.
- **Responsive Design**: Fully optimized for various screen sizes using Tailwind CSS.
- **Real-time Simulation**: Mock data seeding for demonstration and testing.
- **Modern UI Components**: Built with Shadcn UI and Radix UI primitives.

## Technology Stack
- **Frontend**: React, TanStack Query, Radix UI, Lucide Icons, Wouter (Routing).
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL with Drizzle ORM.
- **Styling**: Tailwind CSS.
- **Development**: Vite.

## Getting Started

### Prerequisites
- Node.js (v20 or later)
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd multi-frame-streaming
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory and add your database connection string:
   ```env
   DATABASE_URL=postgres://user:password@localhost:5432/dbname
   ```

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Project Structure
- `client/`: React frontend application.
- `server/`: Express backend and database logic.
- `shared/`: Shared types and database schema.
- `script/`: Build and utility scripts.

## License
MIT
