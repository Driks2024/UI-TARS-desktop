"""Mr.Holmes phone OSINT — combined orchestrator + FastAPI web app.

On Render:
  - setup.sh clones lucksi/mr.holmes into ./mr.holmes and copies this file in
  - cd mr.holmes && python3 app.py

Locally:
  - clone lucksi/mr.holmes, install requirements, copy app.py into the folder
  - python3 app.py
"""
import os
import sys
import re
import io
import html
import shutil
import builtins
import contextlib
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.chdir(HERE)
sys.path.insert(0, str(HERE))

ANSI_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
_USER_AGENT = "MrHolmesScan/1.0 (+research)"
_orig_urlopen = urllib.request.urlopen


def _urlopen_with_ua(url, *args, **kwargs):
    if isinstance(url, str):
        url = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    elif isinstance(url, urllib.request.Request) and not url.has_header("User-agent"):
        url.add_header("User-Agent", _USER_AGENT)
    return _orig_urlopen(url, *args, **kwargs)


urllib.request.urlopen = _urlopen_with_ua


def _patch_input():
    builtins.input = lambda *a, **k: "2"


def _ensure_dirs(num: str):
    report_dir = HERE / "GUI" / "Reports" / "Phone" / num
    if report_dir.exists():
        shutil.rmtree(report_dir)
    report_dir.mkdir(parents=True, exist_ok=True)
    (HERE / "GUI" / "Reports" / "Phone" / "Dorks").mkdir(parents=True, exist_ok=True)
    (HERE / "Temp" / "Phone").mkdir(parents=True, exist_ok=True)
    report_file = report_dir / f"{num}.txt"
    report_file.write_text(f"REPORT FOR PHONE {num}\n", encoding="utf-8")
    return report_dir, report_file


def scan_phone(num: str, *, run_dorks: bool = True) -> dict:
    num = num.strip().lstrip("+").replace(" ", "").replace("-", "")
    if not num.isdigit() or len(num) < 7:
        raise ValueError(f"Number must be digits with country code (got {num!r})")

    _patch_input()
    _, report_file = _ensure_dirs(num)

    from Core.Support.Phone import Numbers
    from Core.Searcher_phone import Phone_search

    _orig_geo = Numbers.Phony.Get_GeoLocation

    @staticmethod
    def _safe_geo(*args, **kwargs):
        try:
            return _orig_geo(*args, **kwargs)
        except Exception as e:
            print(f"[!] Geolocation skipped: {type(e).__name__}: {e}")

    Numbers.Phony.Get_GeoLocation = _safe_geo

    log_buf = io.StringIO()
    formats: list = []
    error = None

    with contextlib.redirect_stdout(log_buf), contextlib.redirect_stderr(log_buf):
        try:
            formats = Numbers.Phony.Number(num, str(report_file), 1, "Desktop", "Phone", num) or []
            if run_dorks:
                print("\n[+] GENERATING GOOGLE/YANDEX DORKS...")
                Phone_search.Google_dork(num, num)
                Phone_search.Yandex_dork(num, num)
        except Exception as e:
            error = f"{type(e).__name__}: {e}"
            print(f"\n[ERROR] {error}")

    log = ANSI_RE.sub("", log_buf.getvalue())
    report_text = report_file.read_text(encoding="utf-8") if report_file.exists() else ""

    return {
        "number": num,
        "report_path": str(report_file),
        "report_text": report_text,
        "formats": formats,
        "log": log,
        "error": error,
    }


from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse
import uvicorn

app = FastAPI(title="Mr.Holmes Phone OSINT")

CSS = """<style>
:root{color-scheme:dark}
body{font-family:-apple-system,system-ui,sans-serif;background:#0e1014;color:#e6e8eb;margin:0;padding:24px;max-width:760px;margin:0 auto}
h1{font-size:22px;color:#7ee787;margin:0 0 4px}
p.sub{color:#8b949e;margin:0 0 24px;font-size:14px}
form{display:flex;flex-direction:column;gap:12px;background:#161b22;padding:16px;border-radius:12px;border:1px solid #30363d}
label{font-size:14px;color:#c9d1d9}
input[type=text]{font-size:16px;padding:12px;border-radius:8px;border:1px solid #30363d;background:#0d1117;color:#e6e8eb;width:100%;box-sizing:border-box}
.row{display:flex;align-items:center;gap:8px}
button{font-size:16px;padding:12px;border-radius:8px;border:none;background:#238636;color:white;font-weight:600;cursor:pointer}
button:disabled{background:#444}
pre{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;overflow-x:auto;font-size:13px;color:#c9d1d9;white-space:pre-wrap;word-wrap:break-word}
.meta{font-size:12px;color:#8b949e;margin-top:4px}
.err{color:#f85149}
.ok{color:#7ee787}
a{color:#58a6ff}
.back{display:inline-block;margin-top:16px}
</style>"""

INDEX = f"""<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mr.Holmes — Phone OSINT</title>{CSS}</head><body>
<h1>🔍 Mr.Holmes — Phone OSINT</h1>
<p class="sub">Educational / authorized research only.</p>
<form action="/scan" method="post" onsubmit="this.querySelector('button').disabled=true;this.querySelector('button').textContent='Scanning…';">
<label for="phone">Phone number (digits + country code)</label>
<input id="phone" name="phone" type="text" inputmode="numeric" placeholder="e.g. 5511999998888" required autofocus>
<div class="row"><input id="dorks" name="dorks" type="checkbox" checked>
<label for="dorks">Include Google/Yandex dorks (~30s slower)</label></div>
<button type="submit">Scan</button>
<p class="meta">First scan after idle may take 30-60s on Render free tier.</p>
</form></body></html>"""


def render_result(r: dict) -> str:
    num = html.escape(r.get("number", ""))
    log = html.escape(r.get("log", ""))
    report = html.escape(r.get("report_text", ""))
    formats = r.get("formats") or []
    err = r.get("error")
    err_html = f'<p class="err"><strong>Error:</strong> {html.escape(str(err))}</p>' if err else '<p class="ok">Scan completed.</p>'
    formats_html = ""
    if formats:
        items = "".join(f"<li><code>{html.escape(str(f))}</code></li>" for f in formats)
        formats_html = f"<h3>Formatted variants</h3><ul>{items}</ul>"
    return f"""<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Result — {num}</title>{CSS}</head><body>
<h1>Result for {num}</h1>{err_html}
<h3>Parsed report</h3><pre>{report}</pre>{formats_html}
<h3>Raw scan log</h3><pre>{log}</pre>
<a class="back" href="/">← New scan</a></body></html>"""


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    return INDEX


@app.post("/scan", response_class=HTMLResponse)
async def scan(phone: str = Form(...), dorks: str = Form(default="")) -> str:
    try:
        result = scan_phone(phone, run_dorks=bool(dorks))
    except ValueError as e:
        return f"<body style='font-family:sans-serif;padding:24px;background:#0e1014;color:#f85149'><h2>Invalid input</h2><p>{html.escape(str(e))}</p><a style='color:#58a6ff' href='/'>Back</a></body>"
    return render_result(result)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
