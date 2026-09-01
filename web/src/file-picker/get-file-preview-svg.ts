export function getFilePreviewSvg(extension: string) {

  return `
    <svg
      viewBox="0 0 96 96"
      width="96"
      height="96"
      aria-label="${extension} file preview"
    >
      <defs>
        <linearGradient id="preview-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--preview-bg-start, #273146)" />
          <stop offset="100%" stop-color="var(--preview-bg-end, #161d2c)" />
        </linearGradient>

        <linearGradient id="badge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--preview-badge-bg-start, #7135c9)" />
          <stop offset="100%" stop-color="var(--preview-badge-bg-end, #4e1bb8)" />
        </linearGradient>
      </defs>

      <path
        d="M24 10h34l18 18v52a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8V18a8 8 0 0 1 8-8Z"
        fill="url(#preview-bg)"
      />

      <path
        d="M58 10v14a6 6 0 0 0 6 6h12"
        fill="var(--preview-unkown-accents, #fff)"
        fill-opacity=".16"
      />
      
      <g
        stroke="var(--preview-unkown-accents, #fff)"
        stroke-opacity=".22"
        stroke-width="5"
        stroke-linecap="round"
      >
        <path d="M28 38h38" />
        <path d="M28 48h30" />
      </g> 

      <rect
        x="10"
        y="58"
        width="76"
        height="28"
        rx="8"
        fill="url(#badge)"
      />

      <text
        x="48"
        y="77"
        text-anchor="middle"
        font-family="system-ui, sans-serif"
        font-size="16"
        font-weight="700"
        fill="var(--preview-unknown-text, white)"
      >
        ${extension}
      </text>
    </svg>
  `;
}