import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CSSProperties, ReactNode } from "react";

const navy = "#071f46";
const deepNavy = "#031834";
const blue = "#2563eb";
const lightBlue = "#8bc5ff";
const ink = "#0f1e3c";
const softGray = "#f3f6fb";

const courses = [
  { code: "11313", name: "Algorithms Design and Analysis", type: "Theoretical", credits: 3, difficulty: 88 },
  { code: "11316", name: "Theory of Computation", type: "Theoretical", credits: 3, difficulty: 91 },
  { code: "11323", name: "Database Systems", type: "Theoretical", credits: 3, difficulty: 62 },
];

const roleCards = [
  {
    title: "Student",
    copy: "Plan your semester, evaluate workload, and get smart recommendations.",
    icon: "S",
  },
  {
    title: "Advisor",
    copy: "Review student schedules, identify risks, and advise with confidence.",
    icon: "A",
  },
  {
    title: "Admin",
    copy: "Manage users, courses, transcript data, and scoring controls.",
    icon: "M",
  },
];

const recommendations = [
  "Replace one hard course with a lighter elective.",
  "Move one theory-heavy course to a future semester.",
  "Add a low-workload course to balance the schedule.",
];

const transcriptTerms = [
  { label: "Fall 23", gpa: 2.7 },
  { label: "Spring 24", gpa: 3.1 },
  { label: "Summer 24", gpa: 3.4 },
  { label: "Fall 24", gpa: 3.6 },
  { label: "Spring 25", gpa: 3.9 },
];

const fadeIn = (frame: number, start: number, duration = 24) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const slideUp = (frame: number, start: number, distance = 42) =>
  interpolate(frame, [start, start + 32], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const Logo = ({ small = false }: { small?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: small ? 14 : 22 }}>
    <div
      style={{
        width: small ? 48 : 76,
        height: small ? 48 : 76,
        border: `7px solid ${blue}`,
        borderRadius: 18,
        transform: "rotate(45deg)",
        boxShadow: "0 0 35px rgba(37, 99, 235, 0.55)",
      }}
    />
    <div
      style={{
        fontSize: small ? 42 : 62,
        fontWeight: 800,
        color: "white",
        letterSpacing: 0,
      }}
    >
      Smart<span style={{ color: lightBlue }}>Advisor</span>
    </div>
  </div>
);

const Background = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 12%, rgba(37,99,235,0.34), transparent 30%), linear-gradient(180deg, ${navy}, ${deepNavy} 48%, #f8fbff 48%, #ffffff)`,
      overflow: "hidden",
      fontFamily: "Inter, Arial, sans-serif",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(139,197,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(139,197,255,0.09) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        opacity: 0.8,
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 270,
        left: -40,
        width: 2000,
        height: 270,
        background: "#ffffff",
        transform: "skewY(-5deg)",
        transformOrigin: "left top",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 110,
        top: 145,
        display: "grid",
        gridTemplateColumns: "repeat(4, 8px)",
        gap: 28,
      }}
    >
      {Array.from({ length: 16 }).map((_, index) => (
        <div key={index} style={{ width: 8, height: 8, borderRadius: 8, background: blue }} />
      ))}
    </div>
    <div
      style={{
        position: "absolute",
        right: 150,
        top: 165,
        color: lightBlue,
        fontSize: 64,
        opacity: 0.75,
      }}
    >
      +
    </div>
  </AbsoluteFill>
);

const Panel = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(15,30,60,0.12)",
      borderRadius: 18,
      boxShadow: "0 18px 55px rgba(15,30,60,0.12)",
      color: ink,
      ...style,
    }}
  >
    {children}
  </div>
);

const CourseTable = ({ progress }: { progress: number }) => (
  <Panel style={{ width: 880, height: 420, padding: 34 }}>
    <h3 style={{ margin: 0, fontSize: 31, fontWeight: 800 }}>My Schedule Next Semester</h3>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "115px 1fr 150px 100px 130px",
        marginTop: 35,
        color: "#7385a8",
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      <span>CODE</span>
      <span>COURSE</span>
      <span>TYPE</span>
      <span>CREDITS</span>
      <span>DIFFICULTY</span>
    </div>
    {courses.map((course, index) => {
      const rowProgress = interpolate(progress, [index * 0.18, index * 0.18 + 0.24], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return (
        <div
          key={course.code}
          style={{
            display: "grid",
            gridTemplateColumns: "115px 1fr 150px 100px 130px",
            alignItems: "center",
            borderTop: "1px solid #dce6f5",
            padding: "26px 0",
            fontSize: 21,
            opacity: rowProgress,
            transform: `translateY(${(1 - rowProgress) * 24}px)`,
          }}
        >
          <strong>{course.code}</strong>
          <span>{course.name}</span>
          <span
            style={{
              justifySelf: "start",
              background: softGray,
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 14,
              color: "#52647f",
              fontWeight: 700,
            }}
          >
            {course.type}
          </span>
          <span>{course.credits}</span>
          <span
            style={{
              justifySelf: "start",
              color: course.difficulty > 80 ? "#dc2626" : "#d97706",
              background: course.difficulty > 80 ? "#fee2e2" : "#fef3c7",
              borderRadius: 999,
              padding: "8px 13px",
              fontWeight: 800,
            }}
          >
            {course.difficulty}
          </span>
        </div>
      );
    })}
  </Panel>
);

const DifficultyMeter = ({ score }: { score: number }) => (
  <Panel style={{ width: 430, height: 420, padding: 34 }}>
    <h3 style={{ margin: 0, fontSize: 29, fontWeight: 800 }}>Difficulty Meter</h3>
    <div style={{ textAlign: "center", marginTop: 32 }}>
      <div style={{ fontSize: 104, lineHeight: 1, color: "#dc2626", fontWeight: 900 }}>{Math.round(score)}</div>
      <div
        style={{
          display: "inline-block",
          marginTop: 14,
          background: "#fee2e2",
          color: "#dc2626",
          borderRadius: 999,
          padding: "9px 24px",
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        Hard
      </div>
    </div>
    <div
      style={{
        marginTop: 46,
        height: 18,
        borderRadius: 999,
        background: "linear-gradient(90deg, #10b981, #f59e0b 60%, #ef4444)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${score}%`,
          top: -8,
          width: 20,
          height: 34,
          borderRadius: 999,
          background: "white",
          border: `3px solid ${ink}`,
          boxShadow: "0 5px 16px rgba(0,0,0,0.2)",
        }}
      />
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, color: "#8090ad", fontSize: 18 }}>
      <span>Easy</span>
      <span>Balanced</span>
      <span>Hard</span>
    </div>
  </Panel>
);

const RecommendationPanel = ({ progress }: { progress: number }) => (
  <Panel style={{ width: 760, height: 295, padding: 34 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h3 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>AI Recommendations</h3>
      <span style={{ color: blue, fontSize: 18, fontWeight: 700 }}>Message advisor</span>
    </div>
    <div style={{ marginTop: 24 }}>
      {recommendations.map((item, index) => {
        const itemProgress = interpolate(progress, [index * 0.18, index * 0.18 + 0.26], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 22,
              fontSize: 22,
              opacity: itemProgress,
              transform: `translateX(${(1 - itemProgress) * -28}px)`,
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: blue,
                color: "white",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              →
            </span>
            {item}
          </div>
        );
      })}
    </div>
  </Panel>
);

const GpaPanel = ({ progress }: { progress: number }) => (
  <Panel style={{ width: 610, height: 295, padding: 34 }}>
    <h3 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Past Semester GPA</h3>
    <div style={{ display: "flex", alignItems: "end", gap: 42, height: 178, marginTop: 20, paddingLeft: 22 }}>
      {transcriptTerms.map((term, index) => {
        const height = interpolate(progress, [0.12 + index * 0.08, 0.35 + index * 0.08], [0, term.gpa / 4], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div key={term.label} style={{ width: 62, textAlign: "center", color: "#4b5f82", fontSize: 17 }}>
            <div
              style={{
                height: height * 132,
                borderRadius: "7px 7px 0 0",
                background: `linear-gradient(180deg, #3b82f6, ${blue})`,
                boxShadow: "0 8px 18px rgba(37,99,235,0.3)",
              }}
            />
            <div style={{ marginTop: 11 }}>{term.label}</div>
          </div>
        );
      })}
    </div>
  </Panel>
);

const RoleCard = ({ role, index, frame }: { role: (typeof roleCards)[number]; index: number; frame: number }) => {
  const progress = fadeIn(frame, 475 + index * 18, 26);
  return (
    <div
      style={{
        width: 430,
        height: 215,
        display: "flex",
        gap: 28,
        alignItems: "center",
        opacity: progress,
        transform: `translateY(${(1 - progress) * 40}px)`,
      }}
    >
      <div
        style={{
          width: 118,
          height: 118,
          borderRadius: 999,
          background: `linear-gradient(145deg, #0b42c7, ${blue})`,
          color: "white",
          display: "grid",
          placeItems: "center",
          fontSize: 56,
          fontWeight: 900,
          boxShadow: "0 16px 35px rgba(37,99,235,0.28)",
        }}
      >
        {role.icon}
      </div>
      <div>
        <h3 style={{ margin: 0, color: blue, fontSize: 34, fontWeight: 850 }}>{role.title}</h3>
        <p style={{ margin: "18px 0 0", color: ink, fontSize: 22, lineHeight: 1.45 }}>{role.copy}</p>
      </div>
    </div>
  );
};

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroIn = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const logoOpacity = fadeIn(frame, 10, 30);
  const dashboardProgress = fadeIn(frame, 185, 70);
  const dashboardScale = interpolate(dashboardProgress, [0, 1], [0.93, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const score = interpolate(frame, [250, 380], [0, 83], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const finalFade = fadeIn(frame, 690, 50);

  return (
    <AbsoluteFill>
      <Background />

      <div
        style={{
          position: "absolute",
          top: 68,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: logoOpacity,
          transform: `translateY(${slideUp(frame, 8, 30)}px)`,
        }}
      >
        <Logo />
      </div>

      <div
        style={{
          position: "absolute",
          top: 190,
          left: 0,
          width: "100%",
          textAlign: "center",
          opacity: heroIn,
          transform: `scale(${interpolate(heroIn, [0, 1], [0.96, 1])})`,
        }}
      >
        <div style={{ fontSize: 104, fontWeight: 900, color: "white", lineHeight: 1 }}>Smart</div>
        <div
          style={{
            fontSize: 122,
            fontWeight: 900,
            lineHeight: 1.05,
            color: lightBlue,
            textShadow: "0 22px 55px rgba(37,99,235,0.25)",
          }}
        >
          Academic Advisor
        </div>
        <div
          style={{
            margin: "30px auto 0",
            width: 130,
            height: 7,
            borderRadius: 999,
            background: blue,
          }}
        />
        <p style={{ margin: "32px 0 0", color: "white", fontSize: 42 }}>
          Know your semester before you commit.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 92,
          top: 480,
          display: "grid",
          gridTemplateColumns: "880px 430px",
          gap: 28,
          opacity: dashboardProgress,
          transform: `translateY(${slideUp(frame, 185, 70)}px) scale(${dashboardScale})`,
          transformOrigin: "top center",
        }}
      >
        <CourseTable progress={fadeIn(frame, 225, 80)} />
        <DifficultyMeter score={score} />
        <RecommendationPanel progress={fadeIn(frame, 365, 85)} />
        <GpaPanel progress={fadeIn(frame, 395, 100)} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 185,
          right: 185,
          bottom: 116,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {roleCards.map((role, index) => (
          <RoleCard key={role.title} role={role} index={index} frame={frame} />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 50,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 26,
          color: ink,
          fontSize: 29,
          opacity: fadeIn(frame, 565, 35),
        }}
      >
        <span style={{ color: blue, fontSize: 38 }}>✦</span>
        <span>Data-driven.</span>
        <span>Explainable.</span>
        <span>
          Built for <span style={{ color: blue }}>Better Academic Decisions.</span>
        </span>
      </div>

      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${navy}, ${deepNavy})`,
          opacity: finalFade,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ opacity: finalFade, transform: `translateY(${slideUp(frame, 700, 35)}px)` }}>
          <Logo small />
          <h1 style={{ margin: "64px 0 0", fontSize: 94, fontWeight: 900, color: lightBlue }}>
            Plan smarter. Advise faster.
          </h1>
          <p style={{ margin: "30px 0 0", fontSize: 42 }}>A smarter way to evaluate semester workload.</p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
