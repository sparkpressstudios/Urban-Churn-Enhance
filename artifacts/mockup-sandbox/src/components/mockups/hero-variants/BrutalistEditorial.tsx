import { motion } from "framer-motion";

export function BrutalistEditorial() {
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
        background: "#000000",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: "min(50vw, 550px)",
            fontWeight: 900,
            color: "rgba(161,171,116,0.07)",
            letterSpacing: "-0.05em",
            lineHeight: 0.85,
            textTransform: "uppercase",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          UC
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "#A1AB74",
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            flex: "0 0 50%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 60px",
            borderRight: "1px solid rgba(161,171,116,0.12)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "2px",
                background: "#A1AB74",
              }}
            />
            <span
              style={{
                color: "#A1AB74",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}
            >
              Craft Creamery
            </span>
            <div
              style={{
                width: "24px",
                height: "2px",
                background: "#A1AB74",
              }}
            />
            <span
              style={{
                color: "#A1AB74",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}
            >
              Central PA
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
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
            WE
            <br />
            <span style={{ color: "#A1AB74" }}>SET</span>
            <br />
            THE
            <br />
            BAR
            <span
              style={{
                color: "#A1AB74",
                fontSize: "7rem",
                lineHeight: 0,
              }}
            >
              .
            </span>
          </motion.h1>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 48px",
            position: "relative",
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{
              position: "absolute",
              top: "28px",
              right: "32px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              width: "140px",
            }}
          >
            {["mint-chip", "strawberry", "chocolate", "vanilla"].map((img) => (
              <div
                key={img}
                style={{
                  aspectRatio: "1",
                  overflow: "hidden",
                  border: "1px solid rgba(161,171,116,0.15)",
                }}
              >
                <img
                  src={`/__mockup/images/${img}.jpg`}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "grayscale(0.6) contrast(1.1)",
                    opacity: 0.7,
                  }}
                />
              </div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.45)",
              fontWeight: 600,
              lineHeight: 1.8,
              marginBottom: "32px",
              maxWidth: "280px",
              borderLeft: "2px solid rgba(161,171,116,0.3)",
              paddingLeft: "16px",
            }}
          >
            Craft ice cream.{" "}
            <span
              style={{ color: "rgba(255,255,255,0.7)", fontWeight: 800 }}
            >
              Unique flavours.
            </span>{" "}
            <span style={{ color: "#A1AB74", fontWeight: 800 }}>
              Nothing fake.
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#A1AB74",
                color: "#000000",
                padding: "16px 24px",
                border: "none",
                fontWeight: 900,
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                width: "100%",
                maxWidth: "280px",
              }}
            >
              <span>&#127846; Pre-Order Ice Cream</span>
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
                justifyContent: "space-between",
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                padding: "16px 24px",
                border: "2px solid rgba(255,255,255,0.1)",
                fontWeight: 900,
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                width: "100%",
                maxWidth: "280px",
              }}
            >
              <span>&#128197; Events</span>
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
          </motion.div>
        </div>
      </div>

      <div
        style={{
          padding: "14px 0",
          overflow: "hidden",
          background: "#A1AB74",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "max-content",
            animation: "ticker-scroll-be 18s linear infinite",
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
                color: "#000000",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.25em",
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
        @keyframes ticker-scroll-be {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
