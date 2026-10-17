import type { Caption } from "@remotion/captions";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { VIDEO, captions } from "./content";

const CaptionCue: React.FC<{ caption: Caption }> = ({ caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.round(((caption.endMs - caption.startMs) / 1000) * fps);
  const opacity = interpolate(
    frame,
    [0, 7, Math.max(8, duration - 7), duration],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );
  const translate = interpolate(frame, [0, 12], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 42,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1460,
          padding: "16px 28px 18px",
          borderRadius: 12,
          border: "1px solid rgba(156, 197, 255, 0.2)",
          background: "rgba(8, 13, 18, 0.9)",
          boxShadow: "0 18px 60px rgba(0, 0, 0, 0.34)",
          color: VIDEO.text,
          fontFamily: VIDEO.sans,
          fontSize: 40,
          fontWeight: 600,
          lineHeight: 1.22,
          letterSpacing: "-0.02em",
          textAlign: "center",
          textWrap: "balance",
          opacity,
          translate: `0px ${translate}px`,
        }}
      >
        {caption.text}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ zIndex: 100 }}>
      {captions.map((caption) => {
        const from = Math.round((caption.startMs / 1000) * fps);
        const durationInFrames = Math.max(
          1,
          Math.round(((caption.endMs - caption.startMs) / 1000) * fps),
        );
        return (
          <Sequence
            key={`${caption.startMs}-${caption.text}`}
            from={from}
            durationInFrames={durationInFrames}
            layout="none"
          >
            <CaptionCue caption={caption} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
