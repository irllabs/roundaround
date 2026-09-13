/**
 * Where everything in the middle of the round goes, in the round's own pixels, measured from the
 * Rounds-SoT Figma (node 1648-148100, "Center Pane"): the play button, the pattern presets and
 * the sequence slots on their circles, and the three pills (Sequence, the A/sequence switch,
 * tempo) on the vertical axis. Everything is placed from the round's centre, so nothing here
 * depends on how many rings the player has.
 */
export const CENTRE_PANE = {
    /** the play/stop button: in the file the switch (64), the play (128) and the tempo (48) are one column with 8px gaps,
     *  centred as a block, which puts the play button 8px below the rings' centre */
    play: { diameter: 128, belowCentre: 8 },
    /** the pattern presets A to H, on a circle: a thick ring around a dark hole holding the letter; the active one gets an outline */
    // a preset that is not the active one is drawn at 60% as a whole; its miniature is one ring of 4px dots per round, spread between the radii 42 and 58
    presets: { diameter: 144, radius: 360, labelSize: 40, ring: { outer: 128, width: 28, opacity: 0.3 }, hole: 72, outline: { diameter: 144, width: 4, opacity: 0.6 }, dim: 0.6, miniature: { inner: 42, outer: 58, dot: 4 } },
    /** the sequence slots, on a smaller circle */
    slots: { diameter: 72, radius: 180, labelSize: 14, ringWidth: 6, opacity: 0.25, miniature: { inner: 16, outer: 28, dot: 3 } },
    /** the Sequence button, above the centre; the Stop variant while a sequence is being recorded */
    sequenceButton: { width: 143, height: 48, aboveCentre: 253, iconSize: 24, iconInset: 16, labelSize: 16, labelInset: 48, fillOpacity: 0.1 },
    // the Stop variant is not in the file; it is built the way the file builds the Sequence pill: 16px padding, an 8px gap, the text measured
    stopButton: { height: 48, iconSize: 16, padding: 16, gap: 8 },
    /** the A / sequence switch: a big circle with the pattern letter and a small one with the sequence dots */
    // Frame 244 in the file: a 120x64 pill with a 1px border at 10%; a 64px box on the left holding a 48px disc at 20% with a 20px ring (2px, 50%) and the letter (14px);
    // a 48px box at x=64 holding the 24px sequence icon: twelve 4px hollow dots on a 10px radius
    switch: { width: 120, height: 64, aboveCentre: 96, borderOpacity: 0.1, disc: 48, discOpacity: 0.2, letterRing: { diameter: 20, width: 2, opacity: 0.5 }, labelSize: 14, dots: { radius: 10, size: 4, width: 1 }, dotsCentre: 88 },
    /** the tempo pill, below the centre */
    tempo: { width: 93, height: 48, belowCentre: 104, iconSize: 24, iconInset: 16, labelSize: 16, labelInset: 48, labelOpacity: 0.9 },
}

const rad = (deg) => (deg * Math.PI) / 180

/** A point on a circle around the centre; `index` of `count` items, the first at the top. */
export function onCircle(cx, cy, radius, index, count) {
    const angle = rad(-90 + (index * 360) / count)
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

/** The pills and the button, as boxes: top-left corner, width, height, and their centre. */
export function centrePaneLayout(cx, cy) {
    const box = (width, height, centreY) => ({ x: cx - width / 2, y: centreY - height / 2, width, height, cx, cy: centreY })
    const s = CENTRE_PANE
    const switchCentreY = cy - s.switch.aboveCentre
    const switchLeft = cx - s.switch.width / 2
    return {
        play: box(s.play.diameter, s.play.diameter, cy + s.play.belowCentre),
        sequenceButton: box(s.sequenceButton.width, s.sequenceButton.height, cy - s.sequenceButton.aboveCentre),
        // the Stop pill's width follows its text; it is sized where it is drawn
        stopButton: { cx, cy: cy - s.sequenceButton.aboveCentre, height: s.stopButton.height },
        // a bordered pill: the letter's disc sits in the left half (a 64px square), the dots in the right (48px)
        switch: {
            ...box(s.switch.width, s.switch.height, switchCentreY),
            disc: { cx: switchLeft + s.switch.height / 2, cy: switchCentreY, diameter: s.switch.disc },
            dots: { cx: switchLeft + s.switch.dotsCentre, cy: switchCentreY },
        },
        tempo: box(s.tempo.width, s.tempo.height, cy + s.tempo.belowCentre),
        preset: (index, count) => ({ ...onCircle(cx, cy, s.presets.radius, index, count), diameter: s.presets.diameter }),
        slot: (index, count) => ({ ...onCircle(cx, cy, s.slots.radius, index, count), diameter: s.slots.diameter }),
    }
}
