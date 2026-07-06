# Local Development Setup
 
Steps to get the guitar-backend running locally.
 
## 1. Install Rust
 
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
 
Restart your shell or run `source "$HOME/.cargo/env"` afterward, then verify:
 
```bash
rustc --version
cargo --version
```
 
## 2. Install sqlx-cli
 
Used to run database migrations.
 
```bash
cargo install sqlx-cli --no-default-features --features postgres
```
 
> If you hit a version mismatch with your Rust toolchain, pin an older version instead:
> `cargo install sqlx-cli --version 0.8.2 --no-default-features --features postgres`
 
## 3. Start Postgres, Redis, and PgBouncer
 
Requires Docker and Docker Compose installed and running.
 
```bash
docker compose up -d postgres redis pgbouncer
```
 
Check they're healthy:
 
```bash
docker compose ps
docker compose logs postgres

docker compose up -d postgres redis pgbouncer

```
 
## 4. Configure environment variables
 
```bash
cp .env.example .env
```
 
Open `.env` and fill in the values — at minimum, confirm `DATABASE_URL` and `REDIS_URL` point at the right ports:
 
```env
DATABASE_URL=postgres://guitar:guitar_secret@localhost:5432/guitar_dev
REDIS_URL=redis://localhost:6379
```
 
> Note: migrations must run against Postgres directly (port `5432`), not through PgBouncer (`6432`).
 
## 5. Run migrations
 
```bash
sqlx migrate run
```
 
This creates all tables (users, chords, tunings, voicings, lessons, practice sessions, etc.) and seeds initial chord/tuning data.
 
## 6. Run the server
 
```bash
cargo run
```
 
The API will be available at `http://localhost:8080`.
 

