import { FluidGradientText } from "@/components/common/fluid-gradient-text";

const VIEWBOX_WIDTH = 860;
const VIEWBOX_HEIGHT = 260;

export function SiteFooterInteractiveLogotype() {
  return (
    <div className="screen-line-bottom relative after:z-1 after:bg-foreground/10">
      <div className="overflow-hidden">
        <FluidGradientText
          className="page-frame aspect-[1200/260] text-foreground/70"
          text="PAWA"
          svgViewBoxWidth={VIEWBOX_WIDTH}
          svgViewBoxHeight={VIEWBOX_HEIGHT}
          fontFamily="var(--font-geist-sans), Arial Black, var(--font-sans), sans-serif"
          fontWeight={900}
          letterSpacing="4"
          strokeOpacity={0.14}
          strokeWidth={3}
        />
      </div>
    </div>
  );
}
