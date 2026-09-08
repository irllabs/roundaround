#!/usr/bin/env python3
"""Check the app's keyboard and focus behaviour on a served build.

    python3 keyboard.py [--base http://localhost:3100] [--port 9337]

    # the usual pair: serve the branch's own build and check it
    npx -y serve@14 -s build -l 3100 &
    python3 docs/ui-baseline/keyboard.py

capture.py photographs what the app looks like standing still. This checks the half
that never appears in a screenshot: what happens when someone drives the app from the
keyboard. The shadcn migration replaced Material UI's Menu, Popper and Dialog -- which
between them owned the focus trap, the roving arrow keys and the return of focus to
whatever opened a thing -- with Radix's Popover and Dialog, so all of that is now the
app's own code and none of it is under the pixel gate.

One `PASS`/`FAIL` line per case, and a non-zero exit if any case failed.

Chrome, the CDP plumbing and the guest sign-in are capture.py's, imported rather than
copied, so the two scripts cannot drift apart on how they drive the app. The only thing
added here is a key press that a <button> actually reacts to: Chromium turns a keydown
into a click off the `keypress` event, and a dispatched key only produces one when it
carries text, which the CDP `char` event type is for. `Input.dispatchKeyEvent` with
`keyDown` alone dispatches keydown and keyup and never clicks anything.
"""

import argparse
import os
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from capture import (  # noqa: E402  (the path has to be set up first)
    DESKTOP, GUEST_NAME_TYPED, SET_GUEST_NAME, SIDEBAR_RIGHT, Browser, Failed, discard, gone, has,
)

# The round-name menu's trigger is the one button in the header that opens a menu and is
# named by its own text: the More options button carries an aria-label and the avatar a
# data-test. The script asserts there is exactly one before it relies on this.
ROUND_NAME = """[...document.querySelectorAll('button[aria-haspopup="menu"]')]
  .filter(b => !b.getAttribute('aria-label') && !b.getAttribute('data-test'))"""
ROUND_NAME_ONE = '(%s).length === 1' % ROUND_NAME
FOCUS_IS_ROUND_NAME = 'document.activeElement === (%s)[0]' % ROUND_NAME

ROW_MENU_BUTTON = 'button[aria-label="Round options"]'

# What has focus, in a form worth printing next to a failure.
WHERE = """(() => {
  const a = document.activeElement;
  if (!a) return 'none';
  const name = a.getAttribute('data-test') || a.getAttribute('aria-label') || (a.textContent || '').trim().slice(0, 20);
  return a.tagName.toLowerCase() + '[' + name + ']';
})()"""

MENU_ITEM_TEXT = "(document.activeElement && document.activeElement.textContent) || 'none'"
MENU_ITEMS = "document.querySelectorAll('[role=\"menu\"] [data-menu-item]').length"

# Radix keeps a closing popover's paper mounted for the length of its exit animation, ~100ms
# here, and keeps its dismissable layer registered with it. A dialog opened from a menu item
# goes up inside that window, and an Escape pressed while both are mounted is taken by the
# menu's layer -- already closed, so nothing happens -- rather than the dialog's, and the
# dialog needs a second press. No hand presses Escape within 100ms of Enter; this script can,
# and did, one run in three. So it waits for the paper to actually be gone, the way capture.py
# waits for a state instead of sleeping and hoping.
MENU_GONE = 'document.querySelectorAll(\'[data-slot="popover-content"]\').length === 0'

# PlayUI toggles playback from a `keydown` listener on `window`, and redraws the transport in
# SVG.js rather than exposing any state, so "did Space reach it" is asked directly: a listener
# registered on window in the bubble phase, exactly where PlayUI's is. React delegates to the
# root container, which is below window, so a handler that calls stopPropagation stops this probe
# and PlayUI's listener together, and one that does not stops neither.
SPACE_PROBE = """(() => {
  window.__spaceAtWindow = false;
  if (!window.__spaceProbeInstalled) {
    window.addEventListener('keydown', (e) => { if (e.key === ' ') window.__spaceAtWindow = true });
    window.__spaceProbeInstalled = true;
  }
  return true;
})()"""


class Keyboard(Browser):
    """capture.py's browser, plus key presses a focused control reacts to."""

    def type_key(self, key, code, vk, text=None, modifiers=0):
        self.send('Input.dispatchKeyEvent', type='rawKeyDown', key=key, code=code,
                  windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, modifiers=modifiers,
                  text=(text or ''))
        if text:
            self.send('Input.dispatchKeyEvent', type='char', key=key, code=code,
                      windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, modifiers=modifiers,
                      text=text, unmodifiedText=text)
        self.send('Input.dispatchKeyEvent', type='keyUp', key=key, code=code,
                  windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, modifiers=modifiers)

    def enter(self):
        self.type_key('Enter', 'Enter', 13, text='\r')

    def escape(self):
        self.type_key('Escape', 'Escape', 27)

    def tab(self, shift=False):
        self.type_key('Tab', 'Tab', 9, modifiers=8 if shift else 0)

    def arrow(self, down=True):
        self.type_key('ArrowDown' if down else 'ArrowUp', 'ArrowDown' if down else 'ArrowUp',
                      40 if down else 38)

    def focus(self, selector):
        self.run('(() => { const e = document.querySelector(%r); if (!e) return false; e.focus(); return true })()'
                 % selector, 'focus ' + selector)

    def settle(self):
        """Radix returns focus from a setTimeout, so give the restore a turn of the loop."""
        time.sleep(0.4)


class Report:
    """One line per case, and the exit code."""

    def __init__(self):
        self.passed = 0
        self.failed = []

    def __call__(self, case, ok, detail=''):
        if ok:
            self.passed += 1
        else:
            self.failed.append(case)
        print('%s  %-52s %s' % ('PASS' if ok else 'FAIL', case, detail))
        return ok


def sign_in_as_guest(b):
    """capture.py's guest sign-in, without the colour pinning a screenshot would need."""
    b.click('[data-test=button-get-started]', 'Get started')
    b.must(has('[data-test=button-guest]'), 'the sign-in dialog')
    b.click('[data-test=button-guest]', 'Use as guest')
    b.must(has('[data-test=input-name] input'), 'the guest form')
    b.run(SET_GUEST_NAME, 'type the guest name')
    b.must(GUEST_NAME_TYPED, 'the guest name being typed')
    b.click('[data-test=button-name]', 'Continue as guest')
    b.must(has('.round'), 'the round', timeout=45)
    b.must("location.pathname.startsWith('/play/')", 'the play route')
    time.sleep(3)


def signin_dialog(b, report):
    """Escape, the Tab trap, and focus coming back to the button that opened it."""
    b.focus('[data-test=button-get-started]')
    b.enter()
    opened = b.wait(has('[data-test=button-guest]'), timeout=10)
    report('signin dialog: Enter on Get started opens it', opened)
    if not opened:
        raise Failed('the sign-in dialog never opened, so its other cases cannot run')

    inside = 'document.activeElement && document.activeElement.closest(\'[data-slot="dialog-content"]\') !== null'
    report('signin dialog: focus moves into the paper', b.js(inside), b.js(WHERE))

    # A trap that has been removed does not put focus back on the trigger; it drops it on the
    # page behind the dialog. Containment is what is asserted, not "not the trigger".
    escaped, trace = False, []
    for _ in range(20):
        b.tab()
        trace.append(b.js(WHERE))
        if not b.js(inside):
            escaped = True
            break
    report('signin dialog: Tab is trapped (20 presses)', not escaped,
           'left at %s' % trace[-1] if escaped else '%d stops' % len(set(trace)))

    b.escape()
    closed = b.wait(gone('[data-test=button-guest]'), timeout=10)
    report('signin dialog: Escape closes it', closed)
    b.settle()
    report('signin dialog: focus returns to Get started',
           closed and b.js("(document.activeElement || {}).getAttribute && document.activeElement.getAttribute('data-test') === 'button-get-started'"),
           b.js(WHERE))


def effects_chevron(b, report):
    """The sidebar's minimize control is a div with role=button, not a <button>.

    capture.py's CHEVRON selector needs it to stay a 32x32 div holding an svg, so it cannot
    become a real button, and the keyboard behaviour a real button would have come with is the
    app's own code. Space is the case worth having: PlayUI listens for it on `window` to toggle
    playback, so a handler that does not stopPropagation minimizes the sidebar *and* starts the
    sequencer.
    """
    b.focus('[aria-label="Hide the effects"]')
    report('effects sidebar: the chevron takes focus',
           b.js('document.activeElement.getAttribute("aria-label") === "Hide the effects"'), b.js(WHERE))

    b.enter()
    report('effects sidebar: Enter minimizes it',
           b.wait(has('[aria-label="Show the effects"]'), timeout=10), b.js(SIDEBAR_RIGHT))

    b.run(SPACE_PROBE, 'install the window keydown probe')
    b.type_key(' ', 'Space', 32, text=' ')
    report('effects sidebar: Space restores it',
           b.wait(has('[aria-label="Hide the effects"]'), timeout=10), b.js(SIDEBAR_RIGHT))
    report('effects sidebar: Space does not reach PlayUI',
           b.js('window.__spaceAtWindow === false'), 'reached window: %s' % b.js('window.__spaceAtWindow'))


def avatar_menu(b, report):
    """Enter, the roving arrow keys, Escape, and focus coming back to the avatar."""
    b.focus('[data-test=button-sign-in-out]')
    b.enter()
    opened = b.wait(has('[data-test=button-sign-out]'), timeout=10)
    report('avatar menu: Enter opens it', opened)
    if not opened:
        raise Failed('the avatar menu never opened, so its other cases cannot run')

    b.arrow()
    report('avatar menu: ArrowDown lands on Sign out',
           b.js("document.activeElement && document.activeElement.getAttribute('data-test') === 'button-sign-out'"),
           b.js(WHERE))
    b.arrow(down=False)
    report('avatar menu: ArrowUp stays on the one item',
           b.js("document.activeElement && document.activeElement.getAttribute('data-test') === 'button-sign-out'"),
           b.js(WHERE))

    b.escape()
    closed = b.wait(gone('[data-test=button-sign-out]'), timeout=10)
    report('avatar menu: Escape closes it', closed)
    b.settle()
    report('avatar menu: focus returns to the avatar',
           closed and b.js("document.activeElement && document.activeElement.getAttribute('data-test') === 'button-sign-in-out'"),
           b.js(WHERE))


def round_menu_to_rename(b, report):
    """The header's round-name menu, and the dialog it opens.

    This is the path the whole focus-restore exists for: the menu item that opens Rename
    unmounts in the same commit the dialog mounts in, so the dialog cannot simply hand focus
    back to whatever held it -- it has to have resolved that item to the menu's trigger.
    """
    report('round menu: the round-name trigger is findable', b.js(ROUND_NAME_ONE),
           '%s candidates' % b.js('(%s).length' % ROUND_NAME))
    b.run('(%s)[0].focus(); true' % ROUND_NAME, 'focus the round name')
    b.enter()
    opened = b.wait(has('#project-name-menu'), timeout=10)
    report('round menu: Enter opens it', opened)
    if not opened:
        raise Failed('the round-name menu never opened, so its other cases cannot run')

    b.arrow()
    b.arrow()
    report('round menu: ArrowDown walks Duplicate then Rename', b.js(MENU_ITEM_TEXT) == 'Rename',
           b.js(MENU_ITEM_TEXT))

    b.enter()
    dialog = b.wait(has('#rename-dialog-title'), timeout=10)
    report('round menu: Enter on Rename opens the dialog', dialog)
    if not dialog:
        raise Failed('the rename dialog never opened')

    b.must(MENU_GONE, "the round-name menu's paper finishing its exit animation")
    b.escape()
    closed = b.wait(gone('#rename-dialog-title'), timeout=10)
    report('rename dialog: Escape closes it', closed)
    b.settle()
    report('rename dialog: focus returns to the round name', closed and b.js(FOCUS_IS_ROUND_NAME),
           b.js(WHERE))


def row_menu(b, report):
    """The rounds list's per-row menu, and the delete dialog it opens."""
    b.focus(ROW_MENU_BUTTON)
    b.enter()
    opened = b.wait('%s === 3' % MENU_ITEMS, timeout=10)
    report('row menu: Enter opens it (3 items)', opened, '%s items' % b.js(MENU_ITEMS))
    if not opened:
        raise Failed('the rounds-list row menu never opened, so its other cases cannot run')

    b.arrow()
    first = b.js(MENU_ITEM_TEXT)
    b.arrow()
    second = b.js(MENU_ITEM_TEXT)
    b.arrow()
    third = b.js(MENU_ITEM_TEXT)
    report('row menu: ArrowDown walks Rename, Duplicate, Delete',
           [first, second, third] == ['Rename', 'Duplicate', 'Delete'],
           '%s' % [first, second, third])
    b.arrow(down=False)
    report('row menu: ArrowUp walks back to Duplicate', b.js(MENU_ITEM_TEXT) == 'Duplicate',
           b.js(MENU_ITEM_TEXT))

    b.escape()
    closed = b.wait('%s === 0' % MENU_ITEMS, timeout=10)
    report('row menu: Escape closes it', closed, '%s items left' % b.js(MENU_ITEMS))
    b.settle()
    report('row menu: focus returns to the options button',
           closed and b.js("document.activeElement && document.activeElement.getAttribute('aria-label') === 'Round options'"),
           b.js(WHERE))

    # And the same menu again, this time all the way to Delete, which is the other dialog
    # opened from a menu item that unmounts underneath it.
    b.focus(ROW_MENU_BUTTON)
    b.enter()
    if not b.wait('%s === 3' % MENU_ITEMS, timeout=10):
        raise Failed('the rounds-list row menu did not reopen')
    for _ in range(3):
        b.arrow()
    b.enter()
    dialog = b.wait(has('#delete-dialog-title'), timeout=10)
    report('row menu: Enter on Delete opens the dialog', dialog)
    if not dialog:
        raise Failed('the delete dialog never opened')

    b.must(MENU_GONE, "the row menu's paper finishing its exit animation")
    b.escape()
    closed = b.wait(gone('#delete-dialog-title'), timeout=10)
    report('delete dialog: Escape closes it without deleting',
           closed and b.js("document.querySelectorAll('[data-test=list-item-round]').length === 1"),
           '%s rounds left' % b.js("document.querySelectorAll('[data-test=list-item-round]').length"))
    b.settle()
    report('delete dialog: focus returns to the options button',
           closed and b.js("document.activeElement && document.activeElement.getAttribute('aria-label') === 'Round options'"),
           b.js(WHERE))


def check(b, base):
    report = Report()

    b.send('Page.navigate', url=base)
    b.must("document.readyState === 'complete'", 'the landing page loading')
    b.must(has('[data-test=button-get-started]'), 'the landing page')
    signin_dialog(b, report)

    sign_in_as_guest(b)
    effects_chevron(b, report)
    avatar_menu(b, report)
    round_menu_to_rename(b, report)

    b.click('[data-test=button-back-to-rounds]', 'Back to my rounds')
    b.must("location.pathname === '/rounds'", 'the rounds route')
    b.must(has('[data-test=list-item-round]'), 'the rounds list')
    row_menu(b, report)

    print()
    print('%d/%d cases passed' % (report.passed, report.passed + len(report.failed)))
    for case in report.failed:
        print('  failed:', case)
    return report


def main():
    ap = argparse.ArgumentParser(description='Check the app\'s keyboard and focus behaviour.')
    ap.add_argument('--base', default='http://localhost:3100', help='site to check (default: %(default)s)')
    ap.add_argument('--port', type=int, default=9337, help='Chrome remote debugging port (default: %(default)s)')
    args = ap.parse_args()

    profile = tempfile.mkdtemp(prefix='roundaround-keyboard-')
    browser = None
    try:
        browser = Keyboard(args.port, profile, DESKTOP)
        report = check(browser, args.base.rstrip('/') + '/')
    finally:
        if browser is not None:
            browser.stop()
        else:
            discard(profile)
    sys.exit(1 if report.failed else 0)


if __name__ == '__main__':
    main()
