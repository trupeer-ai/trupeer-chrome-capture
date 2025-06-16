import React, { useState, useEffect } from "react";
import { getFrontendBaseEndpoint } from "../../../../utils/constants";

const url = `${getFrontendBaseEndpoint()}/pricing`;

const AccessPopup = () => {
  return (
    <div className="announcement">
      <div className="announcement-wrap">
        <div className="announcement-hero">
          <img src={chrome.runtime.getURL("assets/helper/hero.png")} />
        </div>
        <div className="announcement-details">
          <div className="announcement-title">
            {chrome.i18n.getMessage("creditsExhaustedTitle")}
          </div>
          <div className="announcement-description">
            {chrome.i18n.getMessage("creditsDescriptionTitle") + "\n"}
            <a
              href={url}
              target="_blank"
              style={{ fontSize: "24px", color: "#6f66c5" }}
            >
              here.
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPopup;
