import { motion } from "framer-motion";

export function AuroraImmersive() {
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
        background: "#0a0a14",
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
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-30%",
            left: "10%",
            width: "80%",
            height: "120%",
            background:
              "conic-gradient(from 180deg at 50% 50%, #A1AB7433 0deg, #7B8F5522 60deg, #D4B85333 120deg, #A1AB7422 180deg, #5C6B3F33 240deg, #8BA07422 300deg, #A1AB7433 360deg)",
            filter: "blur(100px)",
            animation: "aurora-rotate 12s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "0%",
            left: "-20%",
            width: "140%",
            height: "100%",
            background:
              "conic-gradient(from 0deg at 40% 60%, rgba(161,171,116,0.15) 0deg, transparent 90deg, rgba(120,140,80,0.1) 180deg, transparent 270deg, rgba(161,171,116,0.15) 360deg)",
            filter: "blur(80px)",
            animation: "aurora-shift 8s ease-in-out infinite reverse",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "-10%",
            width: "60%",
            height: "60%",
            background:
              "radial-gradient(ellipse, rgba(212,184,83,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "aurora-pulse 6s ease-in-out infinite",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 20,
          delay: 0.8,
        }}
        style={{
          position: "absolute",
          top: "12%",
          left: "8%",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(161,171,116,0.15), rgba(161,171,116,0.05))",
          border: "1px solid rgba(161,171,116,0.1)",
          backdropFilter: "blur(10px)",
          animation: "float-1 6s ease-in-out infinite",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <img
          src="/__mockup/images/strawberry.jpg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.7,
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 20,
          delay: 1,
        }}
        style={{
          position: "absolute",
          top: "18%",
          right: "10%",
          width: "65px",
          height: "65px",
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(212,184,83,0.15), rgba(212,184,83,0.05))",
          border: "1px solid rgba(212,184,83,0.1)",
          backdropFilter: "blur(10px)",
          animation: "float-2 7s ease-in-out infinite",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <img
          src="/__mockup/images/vanilla.jpg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.6,
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 20,
          delay: 1.2,
        }}
        style={{
          position: "absolute",
          bottom: "16%",
          right: "7%",
          width: "95px",
          height: "95px",
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(161,171,116,0.12), rgba(100,120,60,0.05))",
          border: "1px solid rgba(161,171,116,0.08)",
          backdropFilter: "blur(10px)",
          animation: "float-3 8s ease-in-out infinite",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <img
          src="/__mockup/images/chocolate.jpg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.5,
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 20,
          delay: 0.9,
        }}
        style={{
          position: "absolute",
          bottom: "20%",
          left: "5%",
          width: "55px",
          height: "55px",
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(161,171,116,0.1), transparent)",
          border: "1px solid rgba(161,171,116,0.06)",
          backdropFilter: "blur(10px)",
          animation: "float-2 9s ease-in-out infinite",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <img
          src="/__mockup/images/mint-chip.jpg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.5,
          }}
        />
      </motion.div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: "0 40px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "#A1AB74",
              borderRadius: "50%",
              boxShadow: "0 0 12px rgba(161,171,116,0.5)",
              animation: "pulse-glow 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              color: "rgba(161,171,116,0.8)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Craft Creamery &middot; Central PA
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            fontSize: "6rem",
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: "-0.03em",
            color: "white",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          WE <span style={{ color: "#A1AB74" }}>SET</span>
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
            maxWidth: "400px",
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
              background: "rgba(161,171,116,0.2)",
              backdropFilter: "blur(20px)",
              color: "white",
              padding: "14px 32px",
              borderRadius: "999px",
              border: "1px solid rgba(161,171,116,0.3)",
              fontWeight: 900,
              fontSize: "12px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 0 40px rgba(161,171,116,0.15)",
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
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              color: "rgba(255,255,255,0.6)",
              padding: "14px 24px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.1)",
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
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "12px 0",
          overflow: "hidden",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "max-content",
            animation: "ticker-scroll-ai 20s linear infinite",
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
                color: "rgba(255,255,255,0.3)",
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
        @keyframes aurora-rotate {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
        @keyframes aurora-shift {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(5%) rotate(-10deg); }
        }
        @keyframes aurora-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-3deg); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(4deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 12px rgba(161,171,116,0.5); }
          50% { box-shadow: 0 0 24px rgba(161,171,116,0.8); }
        }
        @keyframes ticker-scroll-ai {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
