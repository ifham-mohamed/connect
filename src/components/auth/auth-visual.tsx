import { Bookmark, BriefcaseBusiness, Radio, ShieldCheck } from "lucide-react";

const paths = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  d: `M-${60 - index * 8} ${48 + index * 14} C ${120 + index * 5} ${8 + index * 9}, ${380 - index * 8} ${300 - index * 8}, ${760 + index * 12} ${80 + index * 12}`,
  opacity: 0.08 + index * 0.018,
}));

export function AuthVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <svg viewBox="0 0 760 520" preserveAspectRatio="xMidYMid slice">
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            pathLength="1"
            style={{
              opacity: path.opacity,
              animationDelay: `${path.id * -0.9}s`,
            }}
          />
        ))}
      </svg>
      <div className="auth-orbit auth-orbit-one">
        <Radio size={18} />
      </div>
      <div className="auth-orbit auth-orbit-two">
        <BriefcaseBusiness size={17} />
      </div>
      <div className="auth-orbit auth-orbit-three">
        <Bookmark size={17} />
      </div>
      <div className="auth-visual-card">
        <ShieldCheck size={18} />
        <span>
          <strong>Private by default</strong>
          <small>Protected workspace sessions</small>
        </span>
      </div>
    </div>
  );
}
