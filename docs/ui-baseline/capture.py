import json, os, subprocess, time, urllib.request, base64, websocket
S = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(S, 'ui-shots'); PORT = 9336
subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--disable-gpu', '--no-first-run', f'--remote-debugging-port={PORT}',
    f'--user-data-dir={S}/chrome-shots', '--window-size=1300,900', '--hide-scrollbars', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: page = next(t for t in json.load(urllib.request.urlopen(f'http://localhost:{PORT}/json')) if t['type'] == 'page'); break
    except Exception: time.sleep(0.25)
ws = websocket.create_connection(page['webSocketDebuggerUrl'], suppress_origin=True); mid = [0]
def send(m, **p):
    mid[0] += 1; ws.send(json.dumps({'id': mid[0], 'method': m, 'params': p}))
    while True:
        r = json.loads(ws.recv())
        if r.get('id') == mid[0]: return r.get('result', {})
def js(e): return send('Runtime.evaluate', expression=e, awaitPromise=True, returnByValue=True).get('result', {}).get('value')
def wait(e, t=20):
    t0 = time.time()
    while time.time() - t0 < t:
        if js(e): return True
        time.sleep(0.3)
    return False
def shot(name):
    time.sleep(1.2); d = send('Page.captureScreenshot', format='png')['data']; open(os.path.join(OUT, name + '.png'), 'wb').write(base64.b64decode(d)); print('shot', name)
send('Page.enable'); send('Runtime.enable'); send('Emulation.setDeviceMetricsOverride', width=1300, height=900, deviceScaleFactor=1, mobile=False)
send('Page.navigate', url='https://rounds.studio/'); wait("document.readyState==='complete'"); time.sleep(2); shot('01-landing')
js("document.querySelector('[data-test=button-get-started]').click()"); wait("!!document.querySelector('[data-test=button-guest]')"); shot('02-signin-choice')
js("document.querySelector('[data-test=button-email]').click()"); time.sleep(0.8); shot('03-signin-email')
js("[...document.querySelectorAll('button')].find(b => /back|close/i.test(b.getAttribute('aria-label')||'') )?.click()"); time.sleep(0.5)
if not js("!!document.querySelector('[data-test=button-guest]')"):
    js("document.querySelector('[data-test=button-get-started]')?.click()"); wait("!!document.querySelector('[data-test=button-guest]')")
js("document.querySelector('[data-test=button-guest]').click()"); wait("!!document.querySelector('[data-test=input-name] input')")
js("""(() => { const i = document.querySelector('[data-test=input-name] input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'shots'); i.dispatchEvent(new Event('input',{bubbles:true})) })()""")
shot('04-signin-guest'); js("document.querySelector('[data-test=button-name]').click()"); wait("!!document.querySelector('.round')", 30); time.sleep(4); shot('05-round')
# effects sidebar: chevron button at the right edge
js("""(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().x > 1100 && b.getBoundingClientRect().y < 400); bs[0]?.click() })()"""); shot('06-effects-sidebar')
js("""(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().x > 1100 && b.getBoundingClientRect().y < 400); bs[0]?.click() })()"""); time.sleep(0.5)
# mixer popup: second bottom-bar button
js("""(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.querySelector('svg') && b.getBoundingClientRect().y > 650); bs.sort((a,b)=>a.getBoundingClientRect().x-b.getBoundingClientRect().x); bs[1]?.click() })()"""); shot('07-mixer-popup')
js("document.body.click()"); time.sleep(0.5)
# layer settings: click a layer ring label? long-press needed; instead open the layer list popup via the bottom bar text
js("""(() => { const t = [...document.querySelectorAll('button, [role=button]')].find(b => /Long Press|round to edit/i.test(b.textContent)); t?.click() })()"""); shot('08-bottom-bar-click')
# header more menu
js("[...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').match(/More options/i))?.click()"); shot('09-header-menu'); js("document.body.click()"); time.sleep(0.4)
# share dialog
js("[...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').match(/Share/i))?.click()"); time.sleep(2.5); shot('10-share-dialog'); send('Input.dispatchKeyEvent', type='keyDown', key='Escape'); send('Input.dispatchKeyEvent', type='keyUp', key='Escape'); time.sleep(0.5)
# avatar menu
js("document.querySelector('[data-test=button-sign-in-out]')?.click()"); shot('11-avatar-menu'); js("document.body.click()"); time.sleep(0.4)
# rounds list
js("[...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').match(/Back to my rounds/i))?.click()"); wait("location.pathname.startsWith('/rounds')"); time.sleep(2.5); shot('12-rounds-list')
# mobile viewport of the round
send('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=2, mobile=True); js("history.back()"); wait("!!document.querySelector('.round')", 30); time.sleep(3); shot('13-round-mobile')
print('done')
