"use client";

export function MaterialCard({
  name,
  tag,
  desc,
  imgUrl,
  accent,
  badge,
  delay = 0,
}: {
  name: string;
  tag: string;
  desc: string;
  imgUrl: string;
  accent: string;
  badge: string;
  delay?: number;
}) {
  return (
    <div
      className="card-brutalist reveal"
      style={{
        background: "#FFF7D6",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div style={{ height: 200, overflow: "hidden", position: "relative", background: "#e8e6e0" }}>
        <img src={imgUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <span className="sticker-label" style={{ background: accent, color: "#fff", borderColor: "#222" }}>
            {badge}
          </span>
        </div>
      </div>
      <div style={{ padding: "20px 20px 24px" }}>
        <div className="coord-label" style={{ marginBottom: 4 }}>
          {tag}
        </div>
        <h3
          className="t-h3"
          style={{
            color: "#222",
            margin: "0 0 8px",
          }}
        >
          {name}
        </h3>
        <p
          className="t-small"
          style={{
            color: "#666",
            margin: 0,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}
