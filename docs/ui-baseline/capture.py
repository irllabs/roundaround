#!/usr/bin/env python3
"""Capture the thirteen UI baseline screenshots of rounds.studio.

    python3 capture.py [--base https://rounds.studio] [--out DIR] [--port 9336]

Drives a headless Google Chrome over the DevTools Protocol, signs in as a guest
and photographs every screen the shadcn migration touches. compare.py then
measures a later capture against the committed baseline.

The capture has to be deterministic: two runs of the same build must compare
under 0.5% changed pixels. Everything the app randomises per guest is pinned
here. The guest's colour, which the avatar, the layer rings and the step
circles all take, is set to the first swatch (#f44336) before any round screen
is shot, and the share dialog's QR code and link, which carry the round's id,
are replaced with fixed placeholder content once the real ones have rendered.

Every screen is asserted before it is shot: the script waits for an element that
exists only in the state it means to photograph, closes each dialog or menu
through that dialog's own control and asserts it is gone before moving on. It
never shoots a state it did not assert; a state that fails to appear aborts
the run rather than producing a screenshot of the wrong screen.
"""

import argparse
import base64
import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request

import websocket

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
DESKTOP = dict(width=1300, height=900, deviceScaleFactor=1, mobile=False)
MOBILE = dict(width=390, height=844, deviceScaleFactor=2, mobile=True)

GUEST_NAME = 'shots'
SWATCH = '#f44336'          # the first colour of the picker, forced on every run
SWATCH_RGB = 'rgb(244, 67, 54)'
SHARE_LINK = 'https://rounds.studio/play/ui-baseline'  # placeholder for the round's own link
SETTLE = 1.2                # let transitions finish before the shutter


class Failed(Exception):
    """A state the capture asked for never appeared, or came out wrong."""


def discard(profile):
    """Kill whatever Chrome is running on this profile and delete it."""
    subprocess.run(['pkill', '-f', profile], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shutil.rmtree(profile, ignore_errors=True)


def has(selector):
    return 'document.querySelector(%s) !== null' % json.dumps(selector)


def gone(selector):
    return 'document.querySelector(%s) === null' % json.dumps(selector)


# The effects sidebar's minimize control is a plain div, so it is found by shape:
# the only 32x32 box holding an icon over on the right-hand edge.
CHEVRON = """(() => {
  const hits = [...document.querySelectorAll('div')].filter(e => {
    const r = e.getBoundingClientRect();
    return Math.round(r.width) === 32 && Math.round(r.height) === 32 && r.x > 1000 && e.querySelector('svg');
  });
  if (hits.length !== 1) return false;
  hits[0].click();
  return true;
})()"""

# The sidebar itself: the absolutely positioned 120px column. Its `right` is 0px
# when open and -120px when minimized.
SIDEBAR_RIGHT = """(() => {
  const s = [...document.querySelectorAll('div')].find(e => {
    const c = getComputedStyle(e);
    return c.width === '120px' && c.position === 'absolute';
  });
  return s ? getComputedStyle(s).right : 'missing';
})()"""

# The two icon buttons of the bottom bar, left to right: add layer, then mixer.
# The mixer popup keeps its own buttons in the DOM below the fold, so the filter
# is limited to what is actually inside the viewport.
BAR = """[...document.querySelectorAll('button')].filter(e => {
  const r = e.getBoundingClientRect();
  return r.width >= 40 && r.top > innerHeight - 120 && r.bottom <= innerHeight;
}).sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)"""

# The mixer popup is never unmounted; it is moved off-screen at opacity 0.
MIXER_POPUP = """(() => {
  const label = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'Mixer');
  return label ? label.closest('div').parentElement : null;
})()"""
MIXER_OPACITY = '(() => { const p = %s; return p ? getComputedStyle(p).opacity : "missing" })()' % MIXER_POPUP
FIRST_LAYER_ROW = """(() => {
  const p = %s;
  if (!p || !p.children[1] || !p.children[1].children.length) return false;
  p.children[1].children[0].click();
  return true;
})()""" % MIXER_POPUP

# The landing page's <video> has to reach a settled state before the shutter, or
# the right-hand half of the shot depends on how far the media load had got.
# networkState 3 is NO_SOURCE, which is where production sits today: the hosted
# poster and mp4 both 404, so the element paints as an empty player. readyState
# 1 or more covers the day someone re-uploads them.
VIDEO_SETTLED = """(() => {
  const v = document.querySelector('video');
  if (!v) return true;
  return v.networkState === 3 || v.readyState >= 1;
})()"""

AVATAR_IS_SWATCH = """(() => {
  const a = document.querySelector('[data-test=button-sign-in-out] .MuiAvatar-root');
  return a !== null && getComputedStyle(a).backgroundColor === %s;
})()""" % json.dumps(SWATCH_RGB)

RINGS_ARE_SWATCH = """[...document.querySelectorAll('.round circle')]
  .filter(c => (c.getAttribute('stroke') || '').toLowerCase() === %s).length >= 10""" % json.dumps(SWATCH)

ROUND_DRAWN = "document.querySelectorAll('.round circle').length >= 40"

SET_GUEST_NAME = """(() => {
  const i = document.querySelector('[data-test=input-name] input');
  if (!i) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, %s);
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()""" % json.dumps(GUEST_NAME)

GUEST_NAME_TYPED = 'document.querySelector("[data-test=input-name] input").value === %s' % json.dumps(GUEST_NAME)

# The share dialog is the one screen whose content is per-round: a QR code and a
# link, both built from the round's id. The link is a different id every run, and
# the QR canvas is not even a constant size, because the encoder picks a QR version
# from how well that particular id compresses, so the canvas comes out 164px or
# 180px square and the dialog resizes around it. Both are checked for real
# content and then replaced with fixed placeholders at a fixed size, which keeps
# the dialog's chrome, the part the migration touches, under test.
#
# The mask writes an inline width and height, and an inline style beats any
# stylesheet, so on its own it would quietly normalise away a real change to the
# QR's rendered size and the comparison would see nothing. QR_SIZES is what stops
# that: the laid-out size is read before the mask and anything other than the two
# sizes the app produces today aborts the run.
#
# That check belongs to the production host and only to it. The encoder picks its
# QR version from the length of the whole share URL, not just the round's id, so a
# preview channel, whose host name is far longer than rounds.studio, legitimately
# draws a bigger square: 212px on a `roundaround-dev--pr<n>-...web.app` channel.
# The baseline is captured from production, so production is what the strict pair
# guards; anywhere else the size is only sanity-checked for a square in a plausible
# range and logged, and the mask normalises it to QR_SIZE either way, which is what
# lets a preview capture be compared against the baseline at all.
QR_SIZE = 180
QR_HOST = 'rounds.studio'
QR_SIZES = (164, 180)
QR_LOOSE = (100, 400)
QR_RECT = """(() => {
  const c = document.getElementById('QRCanvas');
  if (!c) return 'missing';
  const r = c.getBoundingClientRect();
  return Math.round(r.width) + 'x' + Math.round(r.height);
})()"""
QR_HAS_INK = """(() => {
  const c = document.getElementById('QRCanvas');
  if (!c || !c.width) return false;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0]) return true;
  return false;
})()"""
SHARE_LINK_READY = '(document.querySelector("#share-link") || {}).value ? true : false'
MASK_SHARE = """(() => {
  const c = document.getElementById('QRCanvas');
  const i = document.querySelector('#share-link');
  if (!c || !i) return false;
  c.style.width = '%dpx';
  c.style.height = '%dpx';
  c.width = %d;
  c.height = %d;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, %s);
  return true;
})()""" % (QR_SIZE, QR_SIZE, QR_SIZE, QR_SIZE, json.dumps(SHARE_LINK))
SHARE_MASKED = """(() => {
  const c = document.getElementById('QRCanvas');
  const i = document.querySelector('#share-link');
  if (!c || !i || i.value !== %s) return false;
  if (c.width !== %d || c.height !== %d) return false;
  const r = c.getBoundingClientRect();
  if (Math.round(r.width) !== %d || Math.round(r.height) !== %d) return false;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let n = 0; n < d.length; n += 4) if (d[n] !== 255 || d[n + 1] !== 255 || d[n + 2] !== 255) return false;
  return true;
})()""" % (json.dumps(SHARE_LINK), QR_SIZE, QR_SIZE, QR_SIZE, QR_SIZE)


class Browser:
    """A headless Chrome talked to over the DevTools Protocol."""

    def __init__(self, port, profile, size):
        self.port = port
        self.profile = profile
        self.proc = subprocess.Popen(
            [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
             '--remote-debugging-port=%d' % port, '--user-data-dir=%s' % profile,
             '--window-size=%d,%d' % (size['width'], size['height']), '--hide-scrollbars', 'about:blank'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        page = None
        for _ in range(120):
            try:
                targets = json.load(urllib.request.urlopen('http://localhost:%d/json' % port))
                page = next(t for t in targets if t['type'] == 'page')
                break
            except Exception:
                time.sleep(0.25)
        if page is None:
            raise Failed('Chrome never opened a debugging target on port %d' % port)
        self.ws = websocket.create_connection(page['webSocketDebuggerUrl'], suppress_origin=True)
        self.mid = 0
        self.send('Page.enable')
        self.send('Runtime.enable')
        self.viewport(size)

    def send(self, method, **params):
        self.mid += 1
        self.ws.send(json.dumps({'id': self.mid, 'method': method, 'params': params}))
        while True:
            reply = json.loads(self.ws.recv())
            if reply.get('id') == self.mid:
                return reply.get('result', {})

    def viewport(self, size):
        self.send('Emulation.setDeviceMetricsOverride', **size)

    def js(self, expression):
        result = self.send('Runtime.evaluate', expression=expression, awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in result:
            detail = result['exceptionDetails'].get('exception', {}).get('description')
            raise Failed('JavaScript threw: %s\n%s' % (detail, expression))
        return result.get('result', {}).get('value')

    def wait(self, expression, timeout=25):
        deadline = time.time() + timeout
        while True:
            if self.js(expression):
                return True
            if time.time() > deadline:
                return False
            time.sleep(0.3)

    def must(self, expression, what, timeout=25):
        """Assert a state, or abort the run rather than shoot the wrong screen."""
        if not self.wait(expression, timeout):
            raise Failed('%s never happened (%s)' % (what, ' '.join(expression.split())[:160]))

    def click(self, selector, what):
        clicked = self.js("""(() => {
          const e = document.querySelector(%s);
          if (!e) return false;
          e.click();
          return true;
        })()""" % json.dumps(selector))
        if not clicked:
            raise Failed('could not click %s (%s)' % (what, selector))

    def run(self, expression, what):
        if not self.js(expression):
            raise Failed('could not %s' % what)

    def shot(self, out, name, verify=None):
        time.sleep(SETTLE)
        self.js('window.scrollTo(0, 0)')
        if verify is not None:
            self.must(verify, 'the state of %s just before the shutter' % name, timeout=3)
        data = self.send('Page.captureScreenshot', format='png')['data']
        with open(os.path.join(out, name + '.png'), 'wb') as f:
            f.write(base64.b64decode(data))
        print('shot', name)

    def stop(self):
        try:
            self.ws.close()
        except Exception:
            pass
        self.proc.terminate()
        try:
            self.proc.wait(timeout=10)
        except Exception:
            self.proc.kill()
        discard(self.profile)


def check_qr_size(base, laid_out):
    """Guard the QR canvas's laid-out size before the mask writes over it.

    On the production host the two sizes the app produces are known, and anything
    else is a real change the mask must not hide. On any other host, a preview
    channel above all, the encoded URL is longer and a bigger square is correct, so
    all that can be asked is that it is still a square of a plausible size.
    """
    host = urllib.parse.urlparse(base).hostname
    if host == QR_HOST:
        allowed = ['%dx%d' % (n, n) for n in QR_SIZES]
        if laid_out not in allowed:
            raise Failed('the QR code is laid out at %s on %s, not one of %s. Masking it would '
                         'hide that from the comparison instead of reporting it, so check what '
                         'changed and update QR_SIZES only if the new size is intended.'
                         % (laid_out, host, ' or '.join(allowed)))
        return
    low, high = QR_LOOSE
    try:
        width, height = (int(n) for n in laid_out.split('x'))
    except ValueError:
        raise Failed('the QR code reported its size as %r, which is not a size' % laid_out)
    if width != height or not low <= width <= high:
        raise Failed('the QR code is laid out at %s on %s, which is not a square between %dx%d '
                     'and %dx%d. The size follows the length of the share URL, so a host other '
                     'than %s draws a different square, but not one this far off.'
                     % (laid_out, host, low, low, high, high, QR_HOST))
    print('QR code is %s on %s; only %s is held to %s' % (laid_out, host, QR_HOST,
                                                          ' or '.join('%dx%d' % (n, n) for n in QR_SIZES)))


def capture(b, base, out):
    # 01: the landing page.
    b.send('Page.navigate', url=base)
    b.must("document.readyState === 'complete'", 'the landing page loading')
    b.must(has('[data-test=button-get-started]'), 'the landing page')
    b.must(VIDEO_SETTLED, 'the demo video settling')
    b.must('document.fonts.ready.then(() => document.fonts.status === "loaded")', 'the web fonts loading')
    b.shot(out, '01-landing')

    # 02: the sign-in dialog.
    b.click('[data-test=button-get-started]', 'Get started')
    b.must(has('[data-test=button-guest]'), 'the sign-in dialog')
    b.shot(out, '02-signin-choice')

    # 03: its email step.
    b.click('[data-test=button-email]', 'Sign in with email')
    b.must(has('[data-test=input-email] input'), 'the email form')
    b.must(gone('[data-test=button-guest]'), 'the sign-in choices going away')
    b.shot(out, '03-signin-email')

    # 04: back out of the email step and into the guest step, with a name typed.
    b.click('.MuiDialogTitle-root button[aria-label=close]', 'the dialog back button')
    b.must(has('[data-test=button-guest]'), 'the sign-in choices coming back')
    b.must(gone('[data-test=input-email] input'), 'the email form going away')
    b.click('[data-test=button-guest]', 'Use as guest')
    b.must(has('[data-test=input-name] input'), 'the guest form')
    b.run(SET_GUEST_NAME, 'type the guest name')
    b.must(GUEST_NAME_TYPED, 'the guest name being typed')
    b.shot(out, '04-signin-guest', verify=GUEST_NAME_TYPED)

    # 05: the round, with the guest colour forced so every run draws the same rings.
    b.click('[data-test=button-name]', 'Continue as guest')
    b.must(has('.round'), 'the round', timeout=45)
    b.must("location.pathname.startsWith('/play/')", 'the play route')
    b.must(ROUND_DRAWN, 'the round being drawn')
    time.sleep(4)  # the rings are laid out over several frames after the first paint
    b.click('[data-test=button-sign-in-out]', 'the avatar')
    b.must(has('[data-test=button-sign-out]'), 'the avatar menu')
    b.must(has('.circle-picker [title="%s"]' % SWATCH), 'the colour picker')
    b.click('.circle-picker [title="%s"]' % SWATCH, 'the first colour swatch')
    b.must(AVATAR_IS_SWATCH, 'the avatar taking the forced colour')
    b.must(RINGS_ARE_SWATCH, 'the rings taking the forced colour')
    b.js('document.body.click()')
    b.must(gone('[data-test=button-sign-out]'), 'the avatar menu closing')
    b.shot(out, '05-round', verify=RINGS_ARE_SWATCH)

    # 06: the effects sidebar, minimized by its own chevron.
    b.must("%s === '0px'" % SIDEBAR_RIGHT, 'the effects sidebar starting open')
    b.run(CHEVRON, 'click the effects sidebar chevron')
    b.must("%s === '-120px'" % SIDEBAR_RIGHT, 'the effects sidebar minimizing')
    b.shot(out, '06-effects-sidebar')
    b.run(CHEVRON, 'click the effects sidebar chevron again')
    b.must("%s === '0px'" % SIDEBAR_RIGHT, 'the effects sidebar re-opening')

    # 07: the mixer popup off the bottom bar.
    b.must('%s.length === 2' % BAR, 'the two bottom bar buttons')
    b.run('%s[1].click(); true' % BAR, 'click the mixer button')
    b.must("%s === '1'" % MIXER_OPACITY, 'the mixer popup opening')
    b.shot(out, '07-mixer-popup')

    # 08: picking a layer in the mixer fills the bottom bar with that layer's controls.
    b.run(FIRST_LAYER_ROW, 'click the first layer in the mixer')
    b.must("[...document.querySelectorAll('*')].every(e => e.children.length !== 0 || !/Long Press/.test(e.textContent))",
           'the bottom bar hint giving way to the layer controls')
    b.run('%s[1].click(); true' % BAR, 'click the mixer button again')
    b.must("%s === '0'" % MIXER_OPACITY, 'the mixer popup closing')
    b.shot(out, '08-bottom-bar-click')

    # 09: the header's More options menu.
    b.click('button[aria-label="More options"]', 'More options')
    b.must(has('#header-menu-list'), 'the header menu')
    b.shot(out, '09-header-menu', verify=has('#header-menu-list'))
    b.js('document.body.click()')
    b.must(gone('#header-menu-list'), 'the header menu closing')

    # 10: the share dialog, with its per-round QR code and link masked.
    b.click('button[aria-label="Share this round"]', 'Share this round')
    b.must(has('#share-dialog-title'), 'the share dialog')
    b.must(SHARE_LINK_READY, 'the share link resolving')
    b.must(QR_HAS_INK, 'the QR code rendering')
    check_qr_size(base, b.js(QR_RECT))
    b.run(MASK_SHARE, 'mask the QR code and the share link')
    b.shot(out, '10-share-dialog', verify=SHARE_MASKED)
    b.click('.MuiBackdrop-root', 'the share dialog backdrop')
    b.must(gone('#share-dialog-title'), 'the share dialog closing')

    # 11: the avatar menu, showing the colour picker on the forced swatch.
    b.click('[data-test=button-sign-in-out]', 'the avatar')
    b.must(has('[data-test=button-sign-out]'), 'the avatar menu')
    b.shot(out, '11-avatar-menu', verify=has('[data-test=button-sign-out]'))
    b.js('document.body.click()')
    b.must(gone('[data-test=button-sign-out]'), 'the avatar menu closing')

    # 12: the rounds list. A fresh guest owns exactly the one round.
    b.click('[data-test=button-back-to-rounds]', 'Back to my rounds')
    b.must("location.pathname === '/rounds'", 'the rounds route')
    b.must(has('[data-test=list-item-round], [data-test=button-new-round]'), 'the rounds list')
    b.must("document.querySelectorAll('[data-test=list-item-round]').length === 1", 'the guest owning one round')
    b.shot(out, '12-rounds-list')

    # 13: the same round at phone size.
    b.viewport(MOBILE)
    b.must("document.querySelectorAll('[data-test=list-item-round]').length === 1", 'the rounds list at phone size')
    b.click('[data-test=list-item-round]', 'the round in the list')
    b.must(has('.round'), 'the round', timeout=45)
    b.must("location.pathname.startsWith('/play/')", 'the play route')
    b.must(ROUND_DRAWN, 'the round being drawn')
    b.must(gone('#orientation-dialog-title'), 'no orientation dialog')
    b.must(RINGS_ARE_SWATCH, 'the rings keeping the forced colour')
    time.sleep(4)
    b.shot(out, '13-round-mobile',
           verify='(%s) && (%s)' % (RINGS_ARE_SWATCH, gone('#orientation-dialog-title')))


def main():
    ap = argparse.ArgumentParser(description='Capture the rounds.studio UI baseline.')
    ap.add_argument('--base', default='https://rounds.studio', help='site to capture (default: %(default)s)')
    ap.add_argument('--out', default=os.path.dirname(os.path.abspath(__file__)),
                    help='directory to write the PNGs to (default: this script\'s directory)')
    ap.add_argument('--port', type=int, default=9336, help='Chrome remote debugging port (default: %(default)s)')
    args = ap.parse_args()

    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    profile = tempfile.mkdtemp(prefix='roundaround-ui-baseline-')
    browser = None
    try:
        browser = Browser(args.port, profile, DESKTOP)
        capture(browser, args.base.rstrip('/') + '/', out)
        print('done ->', out)
    finally:
        # Chrome is launched inside the try, so a browser that never finished
        # starting up is still killed by its profile path and the profile is
        # still deleted.
        if browser is not None:
            browser.stop()
        else:
            discard(profile)


if __name__ == '__main__':
    main()
