/**
 * What withStyles used to hand the bottom bar and its popups, as Tailwind class strings.
 *
 * Keys, and the ternaries that pick between a positioned key and `hidden`, are unchanged from
 * the JSS so the popups keep working the way capture.py reads them: always mounted, opacity 0
 * and top:200% when closed. `hidden` here is that rule, not Tailwind's `hidden` utility --
 * `display: none` would take the popups out of the layout and out of the fades.
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
    mixerPopup: 'absolute -top-[247px] left-12 right-0 z-[100] flex h-[243px] w-[499px] flex-col overflow-hidden rounded-lg bg-[#333333] opacity-100 shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in] max-md:-top-[163px] max-md:left-0 max-md:h-40 max-sm:w-[341px]',
    mixerPopupHeader: 'flex flex-1 items-center justify-start border-b border-white/10 px-[15px] py-2.5',
    mixerPopupHeaderText: 'm-0 ml-[13px] text-[18px] font-normal leading-[1.5] tracking-[0.00938em]',
    buttonText: 'm-0 text-base font-normal leading-none tracking-[0.00938em]',
    instrumentPopup: 'absolute bottom-[47px] left-0 right-0 z-[100] overflow-hidden rounded-lg bg-[#333333] px-0 py-[5px] shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in] max-md:w-[216px]',
    instrumentSample: 'm-0 flex text-center text-base leading-none tracking-[0.00938em] capitalize [font-weight:bolder] max-sm:flex-1',
    addLayerContainer: 'm-0 flex h-full flex-row items-center justify-center rounded-[30px] bg-[#4D4D4D] p-0',
    iconButtons: 'size-12 rounded-full hover:bg-white/20',
    // Task 4 drops the ! flags when LayerInstrument leaves MUI: while it still renders Material UI
    // IconButtons, MUI's own unlayered `padding: 12px` outranks a Tailwind utility (utilities are a
    // layer, MUI's injected rules are not) and grows the instrument popup by 14px a row.
    rectButton: 'flex w-full flex-row rounded-none !px-[15px] !py-[5px]',
    mixerButton: 'mx-[5px] flex size-8 flex-row items-center justify-center rounded-full bg-white/10 p-0',
    volumeSliderContainer: 'flex [flex:2] flex-row items-center justify-center',
    // 216x32 pill at 6px/15px. Measured on 08-bottom-bar-click.png at x 485-692, y 840-871.
    instrumentSummary: 'my-2.5 flex h-8 w-[216px] flex-row items-center justify-start rounded-[24px] bg-white/10 px-[15px] py-1.5 font-bold hover:bg-white/20 max-sm:w-[106px]',
    stepCount: 'my-2.5 flex h-8 w-[59px] flex-row items-center justify-center rounded-[24px] bg-white/10 px-3 py-1.5 hover:bg-white/20',
    stepLength: 'm-0 flex items-start text-base font-normal leading-none tracking-[0.00938em]',
    actionButtonContainer: 'relative mx-2 flex items-center justify-center',
    hamburgerPopup: 'absolute -top-[108px] left-0 z-[100] flex h-[104px] w-[155px] flex-col justify-center overflow-hidden rounded-lg bg-[#333333] opacity-100 shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in]',
    deleteClearPopup: 'absolute -top-[100px] right-0 z-[100] flex h-[104px] w-[155px] flex-col justify-center overflow-hidden rounded-lg bg-[#333333] opacity-100 shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in]',
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

/** The theme's `sm` breakpoint, which decided `isMobile` while MUI still provided a theme. */
export const SM_BREAKPOINT = 500
