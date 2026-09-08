/**
 * The surface every layer-settings popup is drawn on: the same dark card, shadow, radius,
 * stacking order and opacity fade in all six of them. Only the geometry -- where the card sits,
 * how big it is, which way it lays its children out -- differs, so only that is left at each
 * call site. `overflow-hidden` is deliberately not here: the mixer, instrument, hamburger and
 * delete/clear popups clip their contents and the layer and volume popups do not, and this
 * refactor is not allowed to change a single emitted class.
 *
 * Tailwind sorts the utilities it emits itself, so pulling these five out of each string
 * changes the `class` attribute's order and nothing about the CSS.
 */
export const POPUP_SURFACE = 'absolute z-[100] rounded-lg bg-[#333333] shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in]'

/**
 * What withStyles used to hand the bottom bar and its popups, as Tailwind class strings.
 *
 * Keys, and the ternaries that pick between a positioned key and `hidden`, are unchanged from
 * the JSS so the popups keep working the way capture.py reads them: always mounted, opacity 0
 * and top:200% when closed. `hidden` here is that rule, not Tailwind's `hidden` utility --
 * `display: none` would take the popups out of the layout and out of the fades.
 *
 * Being in the layout is why each wrapper also carries `inert` while it is closed: a closed
 * popup is still a live subtree at `top: 200%`, and without `inert` every control in it stayed
 * in the Tab order, so tabbing off the bottom bar walked into popups nobody could see.
 *
 * MUI's down(key) means "below the NEXT breakpoint", and this theme's are sm 500, md 900,
 * lg 1200: down('xs') is max-sm, down('sm') is max-md, down('md') is max-lg.
 */
export const layerSettingsClasses = {
    container: 'absolute bottom-0 left-1/4 right-1/4 flex items-start justify-center bg-transparent max-lg:left-[20%] max-lg:right-[20%] max-md:left-[5%] max-md:right-[5%]',
    addLayerMobile: 'hidden max-sm:flex',
    addLayerDesktop: 'flex max-sm:hidden',
    selectedInstrumentInfo: 'flex max-sm:hidden',
    // 547x48 with a 32px radius, 20px off the bottom. Measured on 05-round.png at x 376-923, y 832-879.
    root: 'relative mb-5 box-border flex h-12 w-[547px] flex-row items-center justify-start rounded-[32px] bg-[#333333] max-lg:mb-2.5 max-md:mb-[5px] max-sm:w-[341px]',
    // 499x243 above the bar, 48px in. Measured on 07-mixer-popup.png at x 425-923, y 585-827.
    mixerPopup: POPUP_SURFACE + ' -top-[247px] left-12 right-0 flex h-[243px] w-[499px] flex-col overflow-hidden opacity-100 max-md:-top-[163px] max-md:left-0 max-md:h-40 max-sm:w-[341px]',
    mixerPopupHeader: 'flex flex-1 items-center justify-start border-b border-white/10 px-[15px] py-2.5',
    mixerPopupHeaderText: 'm-0 ml-[13px] text-[18px] font-normal leading-[1.5] tracking-[0.00938em]',
    buttonText: 'm-0 text-base font-normal leading-none tracking-[0.00938em]',
    instrumentPopup: POPUP_SURFACE + ' bottom-[47px] left-0 right-0 overflow-hidden px-0 py-[5px] max-md:w-[216px]',
    instrumentSample: 'm-0 flex text-center text-base leading-none tracking-[0.00938em] capitalize [font-weight:bolder] max-sm:flex-1',
    addLayerContainer: 'm-0 flex h-full flex-row items-center justify-center rounded-[30px] bg-[#4D4D4D] p-0',
    iconButtons: 'size-12 rounded-full hover:bg-white/20',
    rectButton: 'flex w-full flex-row rounded-none px-[15px] py-[5px]',
    mixerButton: 'mx-[5px] flex size-8 flex-row items-center justify-center rounded-full bg-white/10 p-0',
    volumeSliderContainer: 'flex [flex:2] flex-row items-center justify-center',
    // 216x32 pill at 6px/15px. Measured on 08-bottom-bar-click.png at x 485-692, y 840-871.
    instrumentSummary: 'my-2.5 flex h-8 w-[216px] flex-row items-center justify-start rounded-[24px] bg-white/10 px-[15px] py-1.5 font-bold hover:bg-white/20 max-sm:w-[106px]',
    stepCount: 'my-2.5 flex h-8 w-[59px] flex-row items-center justify-center rounded-[24px] bg-white/10 px-3 py-1.5 hover:bg-white/20',
    stepLength: 'm-0 flex items-start text-base font-normal leading-none tracking-[0.00938em]',
    // The bar's own steps pill says its number in bold. It cannot be `stepLength` plus a weight:
    // two font-weight utilities on one element are decided by Tailwind's sheet order, and
    // `.font-bold` is emitted *before* `.font-normal`, so the pill would come out at 400. The
    // string the JSS left behind got away with `[font-weight:bolder]` only because an arbitrary
    // property is emitted after both. 700 is what `bolder` resolved to: the pill's parent is the
    // Button, which computes 400 or 500 depending on which of ICON_BUTTON's `font-normal` and the
    // base's `font-medium` wins, and the CSS weight ladder maps both of those to 700.
    // (Nothing in a comment may spell a utility on its own, either: Tailwind scans this file as
    // plain text, and the word that used to stand where "ladder" does emitted a rule of its own.)
    stepLengthBold: 'm-0 flex items-start text-base font-bold leading-none tracking-[0.00938em]',
    actionButtonContainer: 'relative mx-2 flex items-center justify-center',
    hamburgerPopup: POPUP_SURFACE + ' -top-[108px] left-0 flex h-[104px] w-[155px] flex-col justify-center overflow-hidden opacity-100',
    deleteClearPopup: POPUP_SURFACE + ' -top-[100px] right-0 flex h-[104px] w-[155px] flex-col justify-center overflow-hidden opacity-100',
    desktopDeleteClear: 'flex max-sm:hidden',
    mobileDeleteClear: 'hidden max-sm:flex',
    actionButton: 'my-2.5 flex size-8 flex-row items-center justify-center rounded-full bg-white/10 p-[5px] hover:bg-white/20',
    msg: 'm-0 flex-1 px-[15px] text-center text-base font-normal leading-6 tracking-[0.00938em] max-sm:text-sm',
    containerSoloMute: 'flex flex-1 flex-row items-center justify-between pl-5',
    layerContainer: 'z-[100] flex h-full [flex:6] flex-col overflow-y-scroll',
    layerSubContainer: 'flex flex-1 cursor-pointer flex-row hover:bg-white/10',
    layer: 'mx-5 flex flex-1 flex-row border-b border-white/10 py-2.5',
    layerOptions: 'relative flex w-[90%] items-center justify-start',
    // 40x40, not 48: the JSS sets no geometry at all here, so the box is MUI's IconButton --
    // 12px of padding around a 16x16 CloseIcon. Measured on 07-mixer-popup.png, where the X's ink
    // runs x 452-467 (so the content box starts 12px inside the header's own 15px padding) and the
    // header's bottom border, which the button's height alone decides, sits at y 645, 60px below
    // the popup's top edge at 585. At 48 the header would be 68 tall and everything under it 8px low.
    plainButton: 'size-10 rounded-full hover:bg-transparent',
    buttonWithText: 'flex h-11 w-full flex-row items-center justify-between rounded-none p-3',
    hidden: 'absolute top-[200%] opacity-0 [transition:opacity_0.2s_ease-out]'
}

/**
 * What every migrated IconButton needs on top of its own geometry. MUI's ButtonBase draws no
 * border and inherits the body's 16px/400; the generated Button has a 1px transparent border,
 * which insets its content under border-box and shifts the label of every justify-between
 * button, and sets text-sm/font-medium on its whole subtree.
 */
export const ICON_BUTTON = 'border-0 text-base font-normal'

/**
 * MUI's Slider, in the colour the theme gives it (primary, #EAEAEA): a 2px rail inside a 28px
 * hit area (height 2 + 13px padding top and bottom, content-box), a full-opacity filled part
 * and a 12px round thumb. Radix places the thumb itself, so MUI's -6/-5 margins are not needed.
 *
 * Same four strings as TempoSlider's, with `text-primary` + `bg-current` where it hard-codes
 * white (its JSS repainted the root and thumb `#ffffff`; these two take the theme's default
 * `color="primary"`, `#EAEAEA`) and `w-full` where it is 300px.
 *
 * The three `ring-*` utilities on the thumb are MUI's halo:
 * `&$focusVisible,&:hover { boxShadow: 0 0 0 8px alpha(primary.main, 0.16) }` and
 * `&$active { 0 0 0 14px }`, transitioned over 150ms. A Tailwind ring at width 8 compiles to
 * exactly that box-shadow and the thumb carries no other, so there is nothing to fight with;
 * `outline-none` stays because MUI's thumb sets `outline: 0` and drew the halo instead. Hover
 * before focus-visible before active is the order the JSS object had them in, so a press wins.
 * One measured deviation, the same one PR 2 accepted for the tempo slider: MUI lit `$active`
 * for a drag started anywhere on the rail, and Radix exposes no dragging state on the thumb, so
 * this is CSS `:active` and only fires for a press that started on the thumb.
 *
 * A second one comes from Radix's own placement, and it is visible: MUI put the thumb's centre
 * at exactly `value%` of the rail, while Radix insets it so the thumb never overhangs either
 * end -- `+6px` at the minimum sliding to `-6px` at the maximum. At the volume sliders' resting
 * 80% that is 3.6px to the left, which is what `diff-07-mixer-popup.png` and
 * `diff-18-volume-popup.png` show and all either of them shows of these sliders. The offset
 * slider sits at 0 of -100..100, dead centre, where the two placements agree exactly, so 14 and
 * 15 come out identical. Correcting it would mean overriding the inline `left` Radix computes
 * from the thumb's measured width, which is the one thing the primitive owns.
 *
 * The keyboard is MUI's plus one: both give an arrow a step, PageUp/PageDown ten, Home the
 * minimum and End the maximum, and Radix adds Shift with an arrow as a second way to take ten.
 */
export const SLIDER_ROOT = 'relative flex h-7 w-full touch-none select-none items-center text-primary'
export const SLIDER_TRACK = 'relative h-0.5 w-full grow rounded-[1px] bg-current/38'
export const SLIDER_RANGE = 'absolute h-full rounded-[1px] bg-current'
export const SLIDER_THUMB = 'relative block size-3 rounded-full bg-current outline-none ring-primary/16 transition-shadow duration-150 hover:ring-8 focus-visible:ring-8 active:ring-[14px]'

/** The theme's `sm` breakpoint, which decided `isMobile` while MUI still provided a theme. */
export const SM_BREAKPOINT = 500
