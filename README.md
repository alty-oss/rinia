<br /><br />

<p align="center">
  <img src="apps/web/public/brand/rinia-icon-dark.svg" alt="Rinia" width="96">
</p>
<h1 align="center">Rinia</h1>
<p align="center"><b>A calm workspace for projects, issues, and docs</b></p>

<p align="center">
    <a href="#-getting-started"><b>Getting started</b></a> •
    <a href="#-features"><b>Features</b></a> •
    <a href="https://github.com/alty-oss/rinia/issues"><b>Issues</b></a>
</p>

<br />

Rinia keeps each project in one place: an issue tracker with list and board views, a document editor, and the people working on it. No setup rituals, just a dark, fast interface that stays out of the way.

## 🌟 Features

- **Issues**
  Track work with project-scoped IDs such as `TK-184`. Switch between a list and a Kanban board, filter by assignee or label, and open any issue in a side peek without losing your place.

- **Documents**
  Write project pages in a block editor with slash commands, tables, and images. Changes save as you type, and drafts survive a refresh.

- **Projects**
  Give every project an icon, color, and banner. Invite members, manage labels, and follow the activity history.

- **Made to feel at home**
  Dark and light themes, keyboard shortcuts, and an interface in English and Portuguese.

## 🚀 Getting started

### Docker

The `Dockerfile` builds the web app and the API into a single image and applies pending migrations on startup.

```bash
docker build -t rinia .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  -e SPECIAL_REGISTRATION_CODE=... \
  rinia
```

### Local development

You need [Bun](https://bun.com) 1.3.14+ and PostgreSQL.

```bash
bun install
docker run --name rinia-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rinia -p 5432:5432 -d postgres:16
bun run db:migrate
bun run db:seed
```

The seed creates three projects with issues, labels, and documents, plus the accounts `admin`, `ana`, and `bruno`, all with the password `rinia1234`. Run `bun run db:reset` to drop the database and seed it again. Both commands refuse to run with `NODE_ENV=production` or against a database that is not on your machine.

Then start the API and the web app in separate terminals:

```bash
bun run dev:api   # http://localhost:3000
bun run dev:web   # http://localhost:5173
```

### Environment variables

Set these in `apps/api/.env`, or pass them to the container.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign sessions |
| `JWT_EXPIRES_IN` | Session lifetime, for example `7d` |
| `SPECIAL_REGISTRATION_CODE` | Code required to create an account |
| `ADMIN_USERNAMES` | Comma-separated admin usernames |
| `PORT` | API port, default `3000` |

## ⚙️ Built with

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.com/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## 🤝 Contributing

Found a bug or have an idea? [Open an issue](https://github.com/alty-oss/rinia/issues). Commits and pull requests follow Conventional Commits; see [AGENTS.md](./AGENTS.md).

Before opening a pull request, run:

```bash
bun run typecheck
bun run test
bun run build
```

`bun run test` never touches a database. Migrations and transactions are tested against PostgreSQL with `bun run test:db`: point `TEST_DATABASE_URL` at a local server where you can create databases, for example the `postgres` database of the container above. Each run creates its own database and drops it afterwards; without the variable those tests are skipped.
