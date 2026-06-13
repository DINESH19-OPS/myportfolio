# Personal Portfolio Website

A full-stack personal portfolio that showcases projects and skills using:

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- Database: SQLite through Node's built-in `node:sqlite` module
- Deployment target: Heroku-compatible `Procfile`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app creates `data/portfolio.sqlite` automatically and seeds sample projects and skills on first run.

## API Endpoints

- `GET /api/profile` returns portfolio profile details.
- `GET /api/projects` returns project cards from the database.
- `GET /api/skills` returns grouped skill data from the database.
- `POST /api/messages` stores contact form submissions.
- `GET /api/health` returns server and database status.

## Customize

- Edit profile details in `server.js` inside the `/api/profile` route.
- Replace sample projects and skills by editing the seed arrays in `server.js`, or update the generated SQLite database directly.
- Replace `public/assets/portfolio-hero.png` with your own image if desired.

## Deploy To Heroku

1. Create a Heroku app.
2. Push this repository to Heroku.
3. Heroku will run `npm start` from the included `Procfile`.

For production, use a hosted database such as PostgreSQL if you need persistent data across dyno restarts. This local SQLite version is ideal for learning and local demos.
