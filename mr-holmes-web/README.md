# mr-holmes-web

FastAPI web wrapper around [lucksi/mr.holmes](https://github.com/Lucksi/Mr.Holmes) phone OSINT. Single-page form, mobile-friendly.

**Disclaimer:** for educational / authorized research only. The mr.holmes source is GPL-3.0; this wrapper does not vendor it — `setup.sh` clones it during the Render build.

## Deploy to Render free tier (from iPhone Safari)

1. Open <https://render.com> → **Sign up with GitHub** (authorize).
2. Tap **New +** → **Web Service**.
3. Connect this repo (`Driks2024/UI-TARS-desktop`), pick branch **`claude/setup-mr-holmes-PvaVe`**.
4. Fill in:
   - **Name:** anything (e.g. `mr-holmes-osint`)
   - **Region:** any
   - **Branch:** `claude/setup-mr-holmes-PvaVe`
   - **Root Directory:** `mr-holmes-web`
   - **Runtime:** `Python 3`
   - **Build Command:** `bash setup.sh`
   - **Start Command:** `cd mr.holmes && python3 app.py`
   - **Plan:** **Free**
5. Tap **Create Web Service**. First build takes ~3-5 min.
6. Open the assigned URL (e.g. `https://mr-holmes-osint.onrender.com`) in Safari.

## Caveats

- Render free tier sleeps after 15 min idle — first request after sleep takes ~30-60 s to wake.
- Some target sites may block Render IPs; geocoding is fail-soft so the scan won't crash.
- The form is **public** — anyone with the URL can scan numbers. Add HTTP basic-auth in `app.py` if you want to lock it down.

## Local run

```bash
cd mr-holmes-web
bash setup.sh
cd mr.holmes
python3 app.py   # http://127.0.0.1:8000
```

## Endpoints

- `GET /` — form
- `POST /scan` — runs scan, returns HTML report
- `GET /health` — JSON health check
