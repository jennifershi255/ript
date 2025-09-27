import React from "react";
import "./DotGridBackground.css";

/**
 * Fixed, animated dot-grid background that sits behind the app.
 * No interactivity; pointer-events disabled so it never blocks clicks.
 */
const DotGridBackground: React.FC = () => {
  return <div className="dotgrid-bg" aria-hidden="true" />;
};

export default DotGridBackground;
