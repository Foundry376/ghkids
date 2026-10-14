import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";
import { PixelIcon } from "./common/pixel-icon";
import { KidButton, KidPanel } from "./kid";

import "./app-surface.scss";

const NotFoundPage: React.FC = () => {
  usePageTitle("Page not found");

  return (
    <div className="lost-page">
      <KidPanel className="lost-page__panel">
        <span className="lost-page__plate" aria-hidden="true">
          <PixelIcon name="lost" size={72} />
        </span>
        <h1>That page isn&rsquo;t here</h1>
        <p>The link might be old, or it might have a typo in it.</p>
        <KidButton variant="primary" size="large" to="/">
          Back to the menu
        </KidButton>
      </KidPanel>
    </div>
  );
};

export default NotFoundPage;
