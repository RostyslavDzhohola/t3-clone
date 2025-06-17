export default function DataFastWidget() {
  return (
    <a
      href="https://datafa.st/share/684a2754569da665c6b838ca?realtime=1"
      target="_blank"
      rel="noopener noreferrer"
      className="absolute top-1 right-4 z-50 w-fit h-6 p-0 m-0 overflow-hidden rounded-sm bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
      title="View DataFast Analytics Dashboard"
    >
      <iframe
        src="https://datafa.st/widgets/684a2754569da665c6b838ca/realtime?mainTextSize=10&primaryColor=%233cda10&theme=light"
        style={{
          background: "transparent",
          border: "none",
          width: "200px",
          height: "24px",
          margin: "1px -10px",
          padding: "0",
          transform: "scale(1.1)",
          transformOrigin: "center",
          pointerEvents: "none",
        }}
        title="DataFast Widget"
        loading="lazy"
      />
    </a>
  );
}
