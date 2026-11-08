# Pictures for the Microsoft Store listing and the manifest screenshots, taken with headless Edge.
#
#   py -3 -m pip install websocket-client pillow      (once; best in a venv)
#   py -3 tools/store-shots.py                         (all: shots in de+en, store art, manifest webp)
#   py -3 tools/store-shots.py de wide 2-chess         (one language, one form, chosen shots)
#   py -3 tools/store-shots.py art en                  (only the poster and box art of one language)
#
# Needs the local server (.claude/launch.json "versus", port 8771). Writes to store/shots/ and icons/screens/.
# Games are played by the AI on every seat (cfg.auto, as in test.html); the guest lock is switched off and
# the page acts as the installed app (display-mode standalone), so no install offer shows up.
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE = "http://localhost:8771/"
SHOTS_DIR = os.path.join(ROOT, "store", "shots")
FORMS = {  # css width, height, device pixel ratio, mobile
    "wide":   (1600, 900, 1.2, False),    # 1920×1080
    "narrow": (412, 915, 2.625, True),    # 1081×2402 (phone)
    "poster": (720, 1080, 2, False),      # 1440×2160 (2:3 poster art)
    "box":    (1080, 1080, 2, False),     # 2160×2160 (1:1 box art)
}
STANDALONE = """(()=>{const mm=window.matchMedia.bind(window);window.matchMedia=q=>/display-mode:\\s*standalone/.test(q)
  ?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},onchange:null}:mm(q);})();"""


class Edge:
    def __init__(self, port=9333):
        self.prof = tempfile.mkdtemp(prefix="versus-shots-")
        self.p = subprocess.Popen([EDGE, "--headless=new", f"--remote-debugging-port={port}", f"--user-data-dir={self.prof}",
                                   "--no-first-run", "--hide-scrollbars", "--mute-audio", "about:blank"])
        tabs = []
        for _ in range(100):
            try:
                tabs = [t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json")) if t["type"] == "page"]
                if tabs: break
            except Exception: pass
            time.sleep(0.2)
        self.ws = websocket.create_connection(tabs[0]["webSocketDebuggerUrl"], suppress_origin=True, timeout=120)
        self.mid = 0
        self.cdp("Page.enable")
        self.cdp("Page.addScriptToEvaluateOnNewDocument", source=STANDALONE)

    def cdp(self, method, **params):
        self.mid += 1
        self.ws.send(json.dumps({"id": self.mid, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == self.mid:
                if "error" in m: raise RuntimeError(m["error"])
                return m.get("result", {})

    def js(self, expr):
        r = self.cdp("Runtime.evaluate", expression=expr, awaitPromise=True, returnByValue=True)
        if "exceptionDetails" in r: print("  JS error:", r["exceptionDetails"].get("exception", {}).get("description"))
        return r.get("result", {}).get("value")

    def size(self, form):
        w, h, dpr, mobile = FORMS[form]
        self.cdp("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
        self.cdp("Emulation.setTouchEmulationEnabled", enabled=mobile, maxTouchPoints=5 if mobile else 1)

    def save(self, fn):
        self.js("document.querySelectorAll('.toast').forEach(e=>e.remove()); 1")
        open(fn, "wb").write(base64.b64decode(self.cdp("Page.captureScreenshot", format="png")["data"]))
        print("  saved", os.path.relpath(fn, ROOT))

    def close(self):
        try: self.ws.close()
        finally: self.p.kill()


def app_shots(e, lang, form, only):
    def load():
        e.cdp("Page.navigate", url=BASE + ("?lang=en" if lang == "en" else ""))
        time.sleep(4)
        e.js("try{V.closeModal&&V.closeModal()}catch(x){}; document.querySelectorAll('.modal').forEach(x=>x.remove());"
             " V.cloud && (V.cloud.available=()=>false); 1")
        time.sleep(0.5)

    def game(gid, opts, wait):
        load()
        e.js(f"V.ui.play(V.byId['{gid}'], {{mode:'ai', level:2, first:'me', opts:{json.dumps(opts)}, auto:true}}); 1")
        time.sleep(wait)

    def library():
        load()
        e.js(r"[...document.querySelectorAll('button,a')].find(b=>/^\s*(Bibliothek|Library)/.test(b.textContent))?.click(); 1")
        time.sleep(1.5)

    shots = {
        "1-home": load,
        "2-chess": lambda: game("chess", {}, 22),
        "3-ludo": lambda: game("ludo", {"n": 4}, 25),
        "4-maumau": lambda: game("maumau", {"n": 3}, 9),
        "5-tron": lambda: game("tron", {"n": 4}, 6),
        "6-library": library,
        "7-c4": lambda: game("c4", {}, 16),
    }
    if form == "narrow" and not only: only = ["1-home", "2-chess", "3-ludo"]
    e.size(form)
    for name, fn in shots.items():
        if only and name not in only: continue
        fn()
        e.save(os.path.join(SHOTS_DIR, f"{form}-{lang}-{name}.png"))


def art(e, lang):
    for form in ("poster", "box"):
        e.size(form)
        e.cdp("Page.navigate", url=BASE + f"store/art.html?f={form}" + ("&lang=en" if lang == "en" else ""))
        time.sleep(1.5)
        e.save(os.path.join(SHOTS_DIR, f"{form}-{lang}.png"))


def derived():
    # 300×300 store logo from the box art, and small webp copies for the manifest (install dialog in Chrome/Edge)
    from PIL import Image
    for lang in ("de", "en"):
        src = os.path.join(SHOTS_DIR, f"box-{lang}.png")
        if os.path.exists(src):
            Image.open(src).convert("RGB").resize((300, 300), Image.LANCZOS).save(os.path.join(SHOTS_DIR, f"logo300-{lang}.png"))
    out = os.path.join(ROOT, "icons", "screens")
    os.makedirs(out, exist_ok=True)
    for name, size in [("wide-de-1-home", (1280, 720)), ("wide-de-2-chess", (1280, 720)), ("wide-de-3-ludo", (1280, 720)),
                       ("narrow-de-1-home", (540, 1200)), ("narrow-de-2-chess", (540, 1200)), ("narrow-de-3-ludo", (540, 1200))]:
        src = os.path.join(SHOTS_DIR, name + ".png")
        if os.path.exists(src):
            Image.open(src).convert("RGB").resize(size, Image.LANCZOS).save(os.path.join(out, name.split("-", 2)[0] + "-" + name.split("-", 2)[2] + ".webp"), quality=82)
    print("  derived logo300 and icons/screens/*.webp")


if __name__ == "__main__":
    os.makedirs(SHOTS_DIR, exist_ok=True)
    a = sys.argv[1:]
    e = Edge()
    try:
        if a and a[0] == "art":
            art(e, a[1] if len(a) > 1 else "de")
        elif a:
            app_shots(e, a[0], a[1], a[2:])
        else:
            for lang in ("de", "en"):
                for form in ("wide", "narrow"): app_shots(e, lang, form, [])
                art(e, lang)
    finally:
        e.close()
    if not a: derived()
