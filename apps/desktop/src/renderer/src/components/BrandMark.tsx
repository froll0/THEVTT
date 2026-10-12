/** The app's mark: the d20 of the icon, white on the accent colour. */
export function BrandMark() {
  return (
    <i className="brand-mark" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <polygon points="12,3 19.8,7.5 19.8,16.5 12,21 4.2,16.5 4.2,7.5" />
        <polygon points="12,7.6 16.3,15.2 7.7,15.2" fill="currentColor" fillOpacity="0.9" />
        <path d="M4.2 7.5 12 7.6 19.8 7.5M12 3v4.6M4.2 16.5l3.5-1.3M19.8 16.5l-3.5-1.3M7.7 15.2 12 21l4.3-5.8M4.2 7.5l3.5 7.7M19.8 7.5l-3.5 7.7" strokeOpacity="0.75" />
      </svg>
    </i>
  );
}
