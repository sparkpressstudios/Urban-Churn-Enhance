import { motion } from "framer-motion";

export function CinematicSplit() {
  const tickerItems = [
    "Unique Flavours",
    "Natural Ingredients",
    "No Artificial Colors",
    "Local PA Dairy",
    "16% Butterfat",
    "Weekly Limited Batches",
  ];

  return (
    <div
      style={{
        width: "1440px",
        maxWidth: "100%",
        height: "770px",
        background: "#0c0c10",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        <div
          style={{
            flex: "0 0 52%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 60px",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "-20%",
              width: "500px",
              height: "500px",
              background:
                "radial-gradient(circle, rgba(161,171,116,0.08) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "1px",
                  background: "rgba(161,171,116,0.6)",
                }}
              />
              <span
                style={{
                  color: "rgba(161,171,116,0.9)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                }}
              >
                Craft Creamery &middot; Central PA
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            style={{
              fontSize: "5.5rem",
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              color: "white",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            WE{" "}
            <span style={{ color: "#A1AB74" }}>SET</span>
            <br />
            THE BAR
            <span style={{ color: "#A1AB74" }}>.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.45)",
              fontWeight: 500,
              lineHeight: 1.6,
              marginTop: "20px",
              maxWidth: "360px",
            }}
          >
            Craft ice cream.{" "}
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>
              Unique flavours.
            </span>{" "}
            <span style={{ color: "#A1AB74", fontWeight: 700 }}>
              Nothing fake.
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginTop: "28px",
            }}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#A1AB74",
                color: "white",
                padding: "14px 28px",
                borderRadius: "999px",
                border: "none",
                fontWeight: 900,
                fontSize: "12px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              &#127846; Pre-Order Ice Cream
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                padding: "14px 24px",
                borderRadius: "999px",
                border: "2px solid rgba(255,255,255,0.12)",
                fontWeight: 900,
                fontSize: "12px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              &#128197; Events
            </button>
          </motion.div>
        </div>

        <div
          style={{
            flex: "0 0 48%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            style={{ width: "100%", height: "100%", position: "relative" }}
          >
            <img
              src="/__mockup/images/uc-photo-1.jpg"
              alt="Craft ice cream"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to right, #0c0c10 0%, rgba(12,12,16,0.4) 25%, transparent 55%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, #0c0c10 0%, transparent 20%)",
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            style={{
              position: "absolute",
              bottom: "70px",
              right: "32px",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "18px",
              padding: "16px",
              width: "180px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-8px",
                right: "14px",
                background: "#A1AB74",
                color: "white",
                fontSize: "8px",
                fontWeight: 900,
                padding: "3px 10px",
                borderRadius: "999px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Featured
            </div>
            <img
              src="/__mockup/images/mint-chip.jpg"
              alt="Mint Chip"
              style={{
                width: "100%",
                aspectRatio: "1",
                objectFit: "cover",
                borderRadius: "12px",
                marginBottom: "10px",
              }}
            />
            <p
              style={{
                color: "white",
                fontSize: "14px",
                fontWeight: 900,
                margin: 0,
              }}
            >
              Mint Chip
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: "10px",
                margin: "2px 0 0",
              }}
            >
              Pint &middot; $7
            </p>
          </motion.div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "12px 0",
          overflow: "hidden",
          background: "rgba(255,255,255,0.02)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "max-content",
            animation: "ticker-scroll-cs 20s linear infinite",
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3rem",
                paddingRight: "3rem",
                whiteSpace: "nowrap",
                color: "rgba(255,255,255,0.25)",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {tickerItems.map((item) => (
                <span key={item}>&#10038; {item}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll-cs {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
