interface YouTubeAttributionProps {
  className?: string;
}

export default function YouTubeAttribution({ className = '' }: YouTubeAttributionProps) {
  return (
    <a
      href="https://www.youtube.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md hover:bg-black/70 transition-colors ${className}`}
      title="Powered by YouTube"
    >
      <img
        src="/yt_logo_fullcolor_white_digital.png"
        alt="YouTube"
        className="h-4"
      />
    </a>
  );
}
