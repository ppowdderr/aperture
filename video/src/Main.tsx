import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions } from "./Captions";
import {
  SCENES,
  VIDEO,
  brand,
  ending,
  flip,
  limits,
  pain,
  product,
  stack,
  weekBlocks,
} from "./content";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const fade = (frame: number, start: number, duration = 24): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const rise = (frame: number, start: number, distance = 18): number =>
  interpolate(frame, [start, start + 24], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const ApertureMark: React.FC<{ size?: number }> = ({ size = 94 }) => {
  const frame = useCurrentFrame();
  const rotate = interpolate(frame, [0, 600], [0, 110], {
    extrapolateRight: "extend",
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ overflow: "visible", flex: "none" }}
      aria-hidden
    >
      <circle
        cx="50"
        cy="50"
        r="43"
        fill="none"
        stroke="rgba(156, 197, 255, 0.46)"
        strokeWidth="2"
      />
      <g
        fill={VIDEO.accent}
        opacity="0.92"
        style={{ rotate: `${rotate}deg`, transformOrigin: "50% 50%" }}
      >
        <path d="M50 18 78 34 50 50Z" />
        <path d="M78 34 78 66 50 50Z" opacity="0.78" />
        <path d="M78 66 50 82 50 50Z" />
        <path d="M50 82 22 66 50 50Z" opacity="0.78" />
        <path d="M22 66 22 34 50 50Z" />
        <path d="M22 34 50 18 50 50Z" opacity="0.78" />
      </g>
      <circle cx="50" cy="50" r="12" fill={VIDEO.background} stroke={VIDEO.accent} strokeWidth="2.5" />
    </svg>
  );
};

const Kicker: React.FC<{ children: React.ReactNode; index?: string }> = ({
  children,
  index,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      color: VIDEO.accent,
      fontFamily: VIDEO.sans,
      fontSize: 20,
      fontWeight: 750,
      letterSpacing: "0.16em",
    }}
  >
    {index ? (
      <span style={{ fontFamily: VIDEO.mono, letterSpacing: 0, color: VIDEO.faint }}>{index}</span>
    ) : null}
    <span>{children}</span>
  </div>
);

const SceneBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(circle at 82% 8%, rgba(68, 124, 198, 0.2), transparent 27%), radial-gradient(circle at 8% 94%, rgba(31, 63, 94, 0.2), transparent 30%), linear-gradient(145deg, #0e1318 0%, #0a0f14 66%, #0d151d 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(156, 197, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(156, 197, 255, 0.035) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 82%)",
      }}
    />
  </AbsoluteFill>
);

const Chrome: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        top: 39,
        left: 62,
        display: "flex",
        alignItems: "center",
        gap: 14,
        color: VIDEO.text,
        fontFamily: VIDEO.sans,
        fontSize: 21,
        fontWeight: 750,
        letterSpacing: "0.08em",
      }}
    >
      <ApertureMark size={26} />
      <span>{brand.name.toUpperCase()}</span>
    </div>
    <div
      style={{
        position: "absolute",
        top: 42,
        right: 64,
        color: VIDEO.faint,
        fontFamily: VIDEO.mono,
        fontSize: 16,
        letterSpacing: "0.1em",
      }}
    >
      {brand.chromeTagline}
    </div>
  </>
);

const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const title = spring({ frame: frame - 15, fps, config: { damping: 20, mass: 0.9 } });
  const haloScale = interpolate(frame, [0, 140], [0.88, 1.04], {
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ padding: "150px 120px 210px" }}>
      <Chrome />
      <div
        style={{
          position: "absolute",
          width: 840,
          height: 840,
          borderRadius: "50%",
          right: -170,
          top: -260,
          border: "1px solid rgba(156, 197, 255, 0.1)",
          background:
            "repeating-radial-gradient(circle at center, transparent 0 57px, rgba(156,197,255,0.04) 58px 59px), radial-gradient(circle at center, rgba(66,124,198,0.14), transparent 57%)",
          scale: haloScale,
          opacity: fade(frame, 10, 35),
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ scale: mark, opacity: fade(frame, 0, 18) }}>
          <ApertureMark size={104} />
        </div>
        <div style={{ opacity: fade(frame, 12), translate: `0px ${rise(frame, 12)}px` }}>
          <div
            style={{
              color: VIDEO.accent,
              fontFamily: VIDEO.sans,
              fontSize: 18,
              fontWeight: 750,
              letterSpacing: "0.18em",
            }}
          >
            {brand.kicker}
          </div>
          <div
            style={{
              marginTop: 7,
              color: VIDEO.faint,
              fontFamily: VIDEO.mono,
              fontSize: 16,
            }}
          >
            {brand.context}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 112 }}>
        <div
          style={{
            color: VIDEO.text,
            fontFamily: VIDEO.sans,
            fontSize: 132,
            lineHeight: 0.95,
            fontWeight: 780,
            letterSpacing: "-0.065em",
            opacity: fade(frame, 22, 28),
            translate: `0px ${rise(frame, 22, 26)}px`,
            scale: interpolate(title, [0, 1], [0.96, 1]),
            transformOrigin: "left center",
          }}
        >
          {brand.name}
        </div>
        <p
          style={{
            width: 1110,
            margin: "38px 0 0",
            color: VIDEO.muted,
            fontFamily: VIDEO.sans,
            fontSize: 48,
            lineHeight: 1.18,
            letterSpacing: "-0.035em",
            opacity: fade(frame, 48, 30),
            translate: `0px ${rise(frame, 48)}px`,
          }}
        >
          {brand.tagline}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 155,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: VIDEO.faint,
          fontFamily: VIDEO.mono,
          fontSize: 18,
          opacity: fade(frame, 78, 28),
        }}
      >
        <span>{brand.proof}</span>
        <span style={{ color: VIDEO.accent }}>{brand.startLine}</span>
      </div>
    </AbsoluteFill>
  );
};

const FlipScene: React.FC = () => {
  const frame = useCurrentFrame();
  const strike = interpolate(frame, [55, 105], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const oldOpacity = interpolate(frame, [0, 16, 120, 158], [0, 1, 1, 0.34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const newOpacity = fade(frame, 130, 28);
  const newRise = rise(frame, 130, 28);
  const arrow = spring({ frame: frame - 105, fps: 30, config: { damping: 16, mass: 0.8 } });

  return (
    <AbsoluteFill style={{ padding: "82px 130px 205px" }}>
      <Kicker index={flip.index}>{flip.oldLabel}</Kicker>
      <div
        style={{
          marginTop: 64,
          padding: "40px 48px 36px",
          borderRadius: 20,
          border: "1px solid rgba(145, 160, 174, 0.2)",
          background: "rgba(24, 33, 42, 0.72)",
          opacity: oldOpacity,
          translate: `0px ${rise(frame, 0, 18)}px`,
        }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          <span
            style={{
              color: VIDEO.muted,
              fontFamily: VIDEO.sans,
              fontSize: 68,
              fontWeight: 650,
              letterSpacing: "-0.04em",
            }}
          >
            {flip.oldStatement}
          </span>
          <span
            style={{
              position: "absolute",
              left: -4,
              top: "52%",
              width: `${strike}%`,
              height: 5,
              borderRadius: 4,
              background: VIDEO.accent,
              boxShadow: "0 0 24px rgba(156, 197, 255, 0.3)",
            }}
          />
        </div>
        <p style={{ margin: "22px 0 0", color: VIDEO.faint, fontFamily: VIDEO.sans, fontSize: 25 }}>
          {flip.oldNote}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 96,
          color: VIDEO.accent,
          fontFamily: VIDEO.sans,
          fontSize: 28,
          fontWeight: 750,
          letterSpacing: "0.16em",
          opacity: fade(frame, 104, 20),
          scale: interpolate(arrow, [0, 1], [0.7, 1]),
        }}
      >
        {flip.verb}
        <span style={{ fontFamily: VIDEO.mono, fontSize: 42, marginLeft: 16 }}>↓</span>
      </div>

      <div
        style={{
          padding: "44px 50px 42px",
          borderRadius: 20,
          border: "1px solid rgba(156, 197, 255, 0.46)",
          background:
            "linear-gradient(135deg, rgba(32, 58, 87, 0.68), rgba(18, 25, 32, 0.9))",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.28)",
          opacity: newOpacity,
          translate: `0px ${newRise}px`,
        }}
      >
        <div
          style={{
            color: VIDEO.accent,
            fontFamily: VIDEO.sans,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.16em",
          }}
        >
          {flip.newLabel}
        </div>
        <div
          style={{
            marginTop: 18,
            color: VIDEO.text,
            fontFamily: VIDEO.sans,
            fontSize: 78,
            lineHeight: 1.02,
            fontWeight: 760,
            letterSpacing: "-0.05em",
          }}
        >
          {flip.newStatement}
        </div>
        <p style={{ margin: "24px 0 0", color: VIDEO.muted, fontFamily: VIDEO.sans, fontSize: 25 }}>
          {flip.newNote}
        </p>
      </div>

      <div
        style={{
          marginTop: 34,
          textAlign: "center",
          color: VIDEO.accent,
          fontFamily: VIDEO.sans,
          fontSize: 25,
          fontWeight: 600,
          opacity: fade(frame, 195, 24),
        }}
      >
        {flip.bridge}
      </div>
    </AbsoluteFill>
  );
};

const PainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const barOne = interpolate(frame, [50, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const barTwo = interpolate(frame, [80, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const overlap = fade(frame, 126, 24);
  const pin = spring({ frame: frame - 130, fps: 30, config: { damping: 15, mass: 0.75 } });

  return (
    <AbsoluteFill style={{ padding: "78px 118px 205px" }}>
      <Kicker index={pain.index}>{pain.kicker}</Kicker>
      <h1
        style={{
          maxWidth: 1400,
          margin: "38px 0 0",
          color: VIDEO.text,
          fontFamily: VIDEO.sans,
          fontSize: 76,
          lineHeight: 1.02,
          fontWeight: 760,
          letterSpacing: "-0.052em",
          opacity: fade(frame, 8, 26),
          translate: `0px ${rise(frame, 8, 24)}px`,
        }}
      >
        {pain.heading}
      </h1>
      <p
        style={{
          margin: "16px 0 0",
          color: VIDEO.faint,
          fontFamily: VIDEO.mono,
          fontSize: 19,
          opacity: fade(frame, 20),
        }}
      >
        {pain.note}
      </p>

      <div
        style={{
          marginTop: 46,
          padding: "32px 38px 34px",
          borderRadius: 20,
          border: "1px solid rgba(156, 197, 255, 0.2)",
          background: "rgba(18, 25, 32, 0.88)",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.3)",
          opacity: fade(frame, 24, 28),
        }}
      >
        <div
          style={{
            marginLeft: 310,
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            color: VIDEO.faint,
            fontFamily: VIDEO.mono,
            fontSize: 17,
          }}
        >
          {pain.times.map((time) => (
            <span key={time}>{time}</span>
          ))}
        </div>

        {pain.courses.map((course, index) => {
          const progress = index === 0 ? barOne : barTwo;
          const width = index === 0 ? (110 / 150) * 100 : (60 / 150) * 100;
          return (
            <div
              key={course.code}
              style={{
                display: "grid",
                gridTemplateColumns: "270px 1fr",
                gap: 40,
                alignItems: "center",
                minHeight: 118,
                borderTop: index === 0 ? "1px solid rgba(156, 197, 255, 0.13)" : undefined,
              }}
            >
              <div>
                <div style={{ color: VIDEO.accent, fontFamily: VIDEO.mono, fontSize: 20, fontWeight: 700 }}>
                  {course.code}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: VIDEO.text,
                    fontFamily: VIDEO.sans,
                    fontSize: 22,
                    fontWeight: 650,
                    lineHeight: 1.1,
                  }}
                >
                  {course.title}
                </div>
                <div style={{ marginTop: 6, color: VIDEO.faint, fontFamily: VIDEO.sans, fontSize: 17 }}>
                  {course.activity}
                </div>
              </div>
              <div style={{ position: "relative", height: 58 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: "9px 0",
                    background:
                      "repeating-linear-gradient(90deg, rgba(145,160,174,0.14) 0 1px, transparent 1px 20%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${(10 / 150) * 100}%`,
                    top: 0,
                    width: `${(50 / 150) * 100}%`,
                    bottom: 0,
                    borderLeft: `2px solid ${VIDEO.accent}`,
                    borderRight: `2px solid ${VIDEO.accent}`,
                    background: "rgba(156, 197, 255, 0.08)",
                    opacity: overlap,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${(10 / 150) * 100}%`,
                    top: 8,
                    height: 42,
                    width: `${width}%`,
                    borderRadius: 8,
                    border: "1px solid rgba(156, 197, 255, 0.5)",
                    background: index === 0 ? "rgba(156,197,255,0.24)" : "rgba(145,160,174,0.19)",
                    scale: `${progress} 1`,
                    transformOrigin: "left center",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    paddingLeft: 14,
                    color: VIDEO.text,
                    fontFamily: VIDEO.mono,
                    fontSize: 17,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  <strong>{course.time}</strong>
                  <span style={{ color: VIDEO.muted }}>{course.weeks}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          marginTop: 32,
          opacity: fade(frame, 154, 24),
          translate: `0px ${rise(frame, 154)}px`,
        }}
      >
        <span
          style={{
            padding: "13px 18px",
            borderRadius: 9,
            background: VIDEO.accent,
            color: VIDEO.background,
            fontFamily: VIDEO.mono,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.04em",
            scale: interpolate(pin, [0, 1], [0.72, 1]),
          }}
        >
          {pain.overlap}
        </span>
        <span style={{ color: VIDEO.muted, fontFamily: VIDEO.sans, fontSize: 25 }}>
          {pain.punchline}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const MiniWeek: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const startMinute = 9 * 60;
  const endMinute = 18 * 60;
  const span = endMinute - startMinute;
  const paint = fade(localFrame, 235, 28);
  const cursorX = interpolate(localFrame, [160, 260], [830, 484], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const cursorY = interpolate(localFrame, [160, 260], [412, 584], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const click = interpolate(localFrame, [250, 258, 278], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52px repeat(5, 1fr)",
          gap: 6,
          color: VIDEO.faint,
          fontFamily: VIDEO.mono,
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        <span />
        {product.days.map((day) => (
          <span key={day} style={{ textAlign: "center", color: day === "TUE" ? VIDEO.accent : VIDEO.faint }}>
            {day}
          </span>
        ))}
      </div>
      <div style={{ position: "relative", height: 342, display: "grid", gridTemplateColumns: "52px 1fr" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: VIDEO.faint,
            fontFamily: VIDEO.mono,
            fontSize: 12,
            paddingBottom: 2,
          }}
        >
          {product.hours.map((hour) => (
            <span key={hour}>{hour}:00</span>
          ))}
        </div>
        <div
          style={{
            position: "relative",
            borderLeft: "1px solid rgba(145,160,174,0.18)",
            backgroundImage:
              "linear-gradient(rgba(145,160,174,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(145,160,174,0.12) 1px, transparent 1px)",
            backgroundSize: "100% 25%, 20% 100%",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "20%",
              top: `${((900 - startMinute) / span) * 100}%`,
              width: "20%",
              height: `${((endMinute - 900) / span) * 100}%`,
              border: "1px dashed rgba(156,197,255,0.85)",
              borderRadius: 7,
              background: "rgba(156,197,255,0.16)",
              opacity: paint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: VIDEO.accent,
              fontFamily: VIDEO.mono,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.03em",
            }}
          >
            {product.freeLabel}
          </div>
          {weekBlocks.map((block, index) => {
            const top = ((block.start - startMinute) / span) * 100;
            const height = ((block.end - block.start) / span) * 100;
            const blockOpacity = fade(localFrame, 40 + index * 3, 16);
            return (
              <div
                key={`${block.code}-${block.day}-${block.start}-${block.activity}`}
                style={{
                  position: "absolute",
                  left: `calc(${block.day * 20}% + 3px)`,
                  top: `${top}%`,
                  width: "calc(20% - 6px)",
                  height: `${height}%`,
                  borderRadius: 5,
                  border: "1px solid rgba(156,197,255,0.38)",
                  background: "rgba(156,197,255,0.12)",
                  color: VIDEO.text,
                  fontFamily: VIDEO.mono,
                  fontSize: 10,
                  padding: "3px 4px",
                  overflow: "hidden",
                  opacity: blockOpacity,
                }}
              >
                {block.code}
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          width: 18,
          height: 26,
          zIndex: 20,
          opacity: fade(localFrame, 150, 16),
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: `25px solid ${VIDEO.text}`,
            rotate: "-32deg",
            filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -12,
            top: -12,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `2px solid ${VIDEO.accent}`,
            scale: click,
            opacity: click,
          }}
        />
      </div>
    </div>
  );
};

const ProductScene: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = product.prompt.slice(
    0,
    Math.max(0, Math.min(product.prompt.length, Math.floor((frame - 35) * 0.22))),
  );
  const solveBusy = frame >= 310;
  const resultOpacity = fade(frame, 405, 28);
  const resultScale = spring({ frame: frame - 405, fps: 30, config: { damping: 18, mass: 0.8 } });
  const spinner = interpolate(frame, [310, 410], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ padding: "46px 74px 188px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Kicker index={product.index}>{product.kicker}</Kicker>
          <h1
            style={{
              margin: "16px 0 0",
              color: VIDEO.text,
              fontFamily: VIDEO.sans,
              fontSize: 58,
              lineHeight: 1,
              fontWeight: 760,
              letterSpacing: "-0.05em",
            }}
          >
            {product.heading}
          </h1>
        </div>
        <span
          style={{
            padding: "8px 12px",
            borderRadius: 7,
            border: "1px solid rgba(156,197,255,0.18)",
            color: VIDEO.faint,
            fontFamily: VIDEO.mono,
            fontSize: 13,
            letterSpacing: "0.08em",
          }}
        >
          {product.recreateLabel}
        </span>
      </div>

      <div
        style={{
          marginTop: 18,
          height: 690,
          borderRadius: 20,
          border: "1px solid rgba(156,197,255,0.24)",
          background: "rgba(10, 15, 20, 0.87)",
          boxShadow: "0 30px 90px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          opacity: fade(frame, 12, 24),
        }}
      >
        <div
          style={{
            height: 82,
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "0 28px",
            borderBottom: "1px solid rgba(156,197,255,0.16)",
            background: "rgba(18, 25, 32, 0.94)",
          }}
        >
          <span
            style={{
              color: VIDEO.accent,
              fontFamily: VIDEO.mono,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.12em",
            }}
          >
            {product.promptLabel}
          </span>
          <div
            style={{
              flex: 1,
              height: 48,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              borderRadius: 8,
              border: "1px solid rgba(156,197,255,0.25)",
              background: "rgba(8,13,18,0.64)",
              color: VIDEO.text,
              fontFamily: VIDEO.sans,
              fontSize: 23,
              letterSpacing: "-0.02em",
            }}
          >
            {typed}
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 25,
                marginLeft: 2,
                background: VIDEO.accent,
                opacity: frame < 150 || frame % 20 < 10 ? 1 : 0,
              }}
            />
          </div>
          {product.chips.map((chip, index) => (
            <span
              key={chip}
              style={{
                padding: "7px 10px",
                borderRadius: 6,
                border: "1px solid rgba(156,197,255,0.21)",
                color: VIDEO.muted,
                fontFamily: VIDEO.mono,
                fontSize: 12,
                opacity: fade(frame, 100 + index * 8, 16),
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", height: 608 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "22px 26px 20px",
              borderRight: "1px solid rgba(156,197,255,0.14)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div
                  style={{
                    color: VIDEO.faint,
                    fontFamily: VIDEO.mono,
                    fontSize: 12,
                    letterSpacing: "0.1em",
                  }}
                >
                  {product.weekLabel}
                </div>
                <div style={{ marginTop: 5, color: VIDEO.muted, fontFamily: VIDEO.sans, fontSize: 15 }}>
                  {product.weekNote}
                </div>
              </div>
              <button
                style={{
                  minWidth: 132,
                  height: 42,
                  border: 0,
                  borderRadius: 7,
                  background: VIDEO.accent,
                  color: VIDEO.background,
                  fontFamily: VIDEO.sans,
                  fontSize: 16,
                  fontWeight: 750,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                }}
              >
                {solveBusy ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: `2px solid rgba(14,19,24,0.32)`,
                        borderTopColor: VIDEO.background,
                        rotate: `${spinner}deg`,
                      }}
                    />
                    {product.solveBusy}
                  </>
                ) : (
                  product.solveIdle
                )}
              </button>
            </div>
            <MiniWeek localFrame={frame} />
          </div>

          <div
            style={{
              position: "relative",
              padding: "22px 22px 18px",
              background: "rgba(18, 25, 32, 0.63)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                opacity: resultOpacity,
                scale: interpolate(resultScale, [0, 1], [0.94, 1]),
                transformOrigin: "top center",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div
                    style={{
                      color: VIDEO.accent,
                      fontFamily: VIDEO.mono,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {product.planLabel}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: VIDEO.text,
                      fontFamily: VIDEO.sans,
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: VIDEO.accent }}>{product.confirmedSymbol}</span>
                    {product.planReady}
                  </div>
                </div>
                <span
                  style={{
                    padding: "7px 9px",
                    borderRadius: 5,
                    background: "rgba(156,197,255,0.12)",
                    color: VIDEO.accent,
                    fontFamily: VIDEO.mono,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {product.planMisses}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  padding: "15px 0 16px",
                  marginTop: 12,
                  borderTop: "1px solid rgba(156,197,255,0.13)",
                  borderBottom: "1px solid rgba(156,197,255,0.13)",
                }}
              >
                {product.stats.map((stat) => (
                  <div key={stat.label}>
                    <div
                      style={{
                        color: VIDEO.text,
                        fontFamily: VIDEO.mono,
                        fontSize: 21,
                        fontWeight: 750,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div style={{ marginTop: 2, color: VIDEO.faint, fontFamily: VIDEO.sans, fontSize: 12 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 8 }}>
                {product.courses.map((course, index) => (
                  <div
                    key={course.code}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "122px 1fr 50px",
                      alignItems: "center",
                      gap: 8,
                      height: 39,
                      borderBottom: "1px solid rgba(145,160,174,0.09)",
                      opacity: fade(frame, 430 + index * 4, 16),
                    }}
                  >
                    <span style={{ color: VIDEO.accent, fontFamily: VIDEO.mono, fontSize: 13 }}>
                      {course.code}
                    </span>
                    <span
                      style={{
                        color: VIDEO.text,
                        fontFamily: VIDEO.sans,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {course.title}
                    </span>
                    <span
                      style={{
                        color: VIDEO.faint,
                        fontFamily: VIDEO.mono,
                        fontSize: 11,
                        textAlign: "right",
                      }}
                    >
                      {course.credits} {course.semester}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                {product.ledger.map((line, index) => (
                  <div
                    key={line.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      color: VIDEO.muted,
                      fontFamily: VIDEO.sans,
                      fontSize: 13,
                      opacity: fade(frame, 515 + index * 8, 16),
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 21,
                        height: 21,
                        borderRadius: 4,
                        background: "rgba(156,197,255,0.12)",
                        color: VIDEO.accent,
                        fontFamily: VIDEO.mono,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {line.check}
                    </span>
                    <span>{line.label}</span>
                    <span style={{ marginLeft: "auto", color: VIDEO.faint, fontFamily: VIDEO.mono, fontSize: 10 }}>
                      {line.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                inset: "80px 44px 40px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                border: "1px dashed rgba(156,197,255,0.18)",
                borderRadius: 12,
                opacity: (1 - resultOpacity) * fade(frame, 70, 22),
              }}
            >
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: "50%",
                  border: "1px solid rgba(156,197,255,0.3)",
                  background:
                    "repeating-conic-gradient(rgba(156,197,255,0.08) 0 18deg, transparent 18deg 36deg)",
                }}
              />
              <div
                style={{
                  color: VIDEO.text,
                  fontFamily: VIDEO.sans,
                  fontSize: 24,
                  fontWeight: 650,
                }}
              >
                {product.resultPlaceholder}
              </div>
              <div
                style={{
                  maxWidth: 330,
                  color: VIDEO.faint,
                  fontFamily: VIDEO.sans,
                  fontSize: 15,
                  lineHeight: 1.35,
                  textAlign: "center",
                }}
              >
                {product.resultPlaceholderNote}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const StackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ padding: "82px 126px 205px" }}>
      <Kicker index={stack.index}>{stack.kicker}</Kicker>
      <h1
        style={{
          margin: "30px 0 0",
          color: VIDEO.text,
          fontFamily: VIDEO.sans,
          fontSize: 68,
          lineHeight: 1.02,
          fontWeight: 760,
          letterSpacing: "-0.05em",
          opacity: fade(frame, 8, 24),
        }}
      >
        {stack.heading}
      </h1>
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        {stack.chips.map((chip, index) => (
          <span
            key={chip}
            style={{
              padding: "9px 13px",
              borderRadius: 6,
              border: "1px solid rgba(156,197,255,0.25)",
              background: "rgba(18,25,32,0.76)",
              color: VIDEO.muted,
              fontFamily: VIDEO.mono,
              fontSize: 16,
              opacity: fade(frame, 34 + index * 7, 18),
              translate: `0px ${rise(frame, 34 + index * 7, 12)}px`,
            }}
          >
            {chip}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 58,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        {stack.layers.map((layer, index) => {
          const enter = spring({
            frame: frame - 55 - index * 10,
            fps,
            config: { damping: 18, mass: 0.8 },
          });
          return (
            <div
              key={layer.number}
              style={{
                padding: "28px 26px 30px",
                borderRadius: 16,
                border: "1px solid rgba(156,197,255,0.22)",
                background:
                  index === 1
                    ? "linear-gradient(145deg, rgba(32,58,87,0.62), rgba(18,25,32,0.9))"
                    : "rgba(18,25,32,0.84)",
                opacity: fade(frame, 55 + index * 10, 22),
                translate: `0px ${rise(frame, 55 + index * 10, 22)}px`,
                scale: interpolate(enter, [0, 1], [0.96, 1]),
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: VIDEO.faint,
                  fontFamily: VIDEO.mono,
                  fontSize: 15,
                }}
              >
                <span>{layer.number}</span>
                <span style={{ color: VIDEO.accent, letterSpacing: "0.12em" }}>{layer.label}</span>
              </div>
              <div
                style={{
                  marginTop: 32,
                  color: VIDEO.text,
                  fontFamily: VIDEO.sans,
                  fontSize: 30,
                  lineHeight: 1.14,
                  fontWeight: 680,
                  letterSpacing: "-0.03em",
                }}
              >
                {layer.title}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 38,
          padding: "27px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 14,
          border: "1px solid rgba(156,197,255,0.2)",
          background: "rgba(18,25,32,0.72)",
          opacity: fade(frame, 128, 24),
        }}
      >
        <span style={{ color: VIDEO.text, fontFamily: VIDEO.sans, fontSize: 26, fontWeight: 650 }}>
          {stack.aiLine}
        </span>
        <span style={{ color: VIDEO.accent, fontFamily: VIDEO.mono, fontSize: 15 }}>{stack.stats}</span>
      </div>
      <div
        style={{
          marginTop: 22,
          textAlign: "center",
          color: VIDEO.faint,
          fontFamily: VIDEO.sans,
          fontSize: 21,
          opacity: fade(frame, 162, 22),
        }}
      >
        {stack.builtLine}
      </div>
    </AbsoluteFill>
  );
};

const LimitsScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ padding: "76px 112px 205px" }}>
      <Kicker index={limits.index}>{limits.kicker}</Kicker>
      <h1
        style={{
          margin: "28px 0 0",
          maxWidth: 1460,
          color: VIDEO.text,
          fontFamily: VIDEO.sans,
          fontSize: 66,
          lineHeight: 1.02,
          fontWeight: 760,
          letterSpacing: "-0.05em",
          opacity: fade(frame, 8, 24),
        }}
      >
        {limits.heading}
      </h1>

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
        {limits.groups.map((group, index) => (
          <div
            key={group.label}
            style={{
              padding: "28px 28px 30px",
              borderRadius: 16,
              border: "1px solid rgba(156,197,255,0.21)",
              background: "rgba(18,25,32,0.8)",
              opacity: fade(frame, 40 + index * 14, 24),
              translate: `0px ${rise(frame, 40 + index * 14, 22)}px`,
            }}
          >
            <div
              style={{
                color: index === 1 ? VIDEO.accent : VIDEO.faint,
                fontFamily: VIDEO.mono,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              {group.label}
            </div>
            <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
              {group.items.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "15px 1fr",
                    gap: 12,
                    alignItems: "start",
                    color: VIDEO.muted,
                    fontFamily: VIDEO.sans,
                    fontSize: 20,
                    lineHeight: 1.28,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      marginTop: 7,
                      borderRadius: 2,
                      background: index === 1 ? VIDEO.accent : VIDEO.line,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 17, mass: 0.8 } });

  return (
    <AbsoluteFill style={{ padding: "112px 140px 205px", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          opacity: fade(frame, 0, 22),
          scale: interpolate(enter, [0, 1], [0.86, 1]),
          transformOrigin: "left center",
        }}
      >
        <ApertureMark size={92} />
        <div>
          <div
            style={{
              color: VIDEO.accent,
              fontFamily: VIDEO.sans,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.17em",
            }}
          >
            {ending.kicker}
          </div>
          <div style={{ marginTop: 6, color: VIDEO.faint, fontFamily: VIDEO.mono, fontSize: 16 }}>
            {brand.name.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 60 }}>
        <div
          style={{
            color: VIDEO.text,
            fontFamily: VIDEO.sans,
            fontSize: 92,
            lineHeight: 1.02,
            fontWeight: 780,
            letterSpacing: "-0.06em",
            opacity: fade(frame, 18, 26),
            translate: `0px ${rise(frame, 18, 26)}px`,
          }}
        >
          {ending.statement}
        </div>
        <div
          style={{
            marginTop: 18,
            color: VIDEO.accent,
            fontFamily: VIDEO.sans,
            fontSize: 52,
            lineHeight: 1.06,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            opacity: fade(frame, 38, 24),
          }}
        >
          {ending.support}
        </div>
      </div>

      <div
        style={{
          marginTop: 62,
          display: "flex",
          alignItems: "stretch",
          gap: 18,
          opacity: fade(frame, 58, 24),
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "22px 26px",
            borderRadius: 12,
            border: "1px solid rgba(156,197,255,0.25)",
            background: "rgba(18,25,32,0.82)",
          }}
        >
          <div style={{ color: VIDEO.faint, fontFamily: VIDEO.mono, fontSize: 13, letterSpacing: "0.1em" }}>
            {ending.repoLabel}
          </div>
          <div style={{ marginTop: 8, color: VIDEO.text, fontFamily: VIDEO.mono, fontSize: 25 }}>
            {ending.repo}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "22px 26px",
            borderRadius: 12,
            border: "1px solid rgba(156,197,255,0.25)",
            background: "rgba(18,25,32,0.82)",
          }}
        >
          <div style={{ color: VIDEO.faint, fontFamily: VIDEO.mono, fontSize: 13, letterSpacing: "0.1em" }}>
            {ending.teamLabel}
          </div>
          <div style={{ marginTop: 8, color: VIDEO.text, fontFamily: VIDEO.sans, fontSize: 25, fontWeight: 650 }}>
            {ending.team}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: VIDEO.background, overflow: "hidden" }}>
    <SceneBackdrop />
    <Sequence from={SCENES.title.from} durationInFrames={SCENES.title.duration} layout="none">
      <TitleScene />
    </Sequence>
    <Sequence from={SCENES.flip.from} durationInFrames={SCENES.flip.duration} layout="none">
      <FlipScene />
    </Sequence>
    <Sequence from={SCENES.pain.from} durationInFrames={SCENES.pain.duration} layout="none">
      <PainScene />
    </Sequence>
    <Sequence from={SCENES.product.from} durationInFrames={SCENES.product.duration} layout="none">
      <ProductScene />
    </Sequence>
    <Sequence from={SCENES.stack.from} durationInFrames={SCENES.stack.duration} layout="none">
      <StackScene />
    </Sequence>
    <Sequence from={SCENES.limits.from} durationInFrames={SCENES.limits.duration} layout="none">
      <LimitsScene />
    </Sequence>
    <Sequence from={SCENES.end.from} durationInFrames={SCENES.end.duration} layout="none">
      <EndScene />
    </Sequence>
    <Captions />
  </AbsoluteFill>
);
