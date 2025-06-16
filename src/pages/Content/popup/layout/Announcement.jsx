import React, { useState, useEffect } from "react";
import { CheckTokenExpiry } from "../../../../utils/auth";
import { getFrontendBaseEndpoint } from "../../../../utils/constants";

const Announcement = (props) => {
  const [URL, setURL] = useState(`${getFrontendBaseEndpoint()}/extension-auth`);

  const handleAccessToken = () => {
    const token = window.prompt("Please enter your access token:");
    if (token !== null) {
      chrome.storage.local.set({ accessTokenValue: token }, () => {
        console.log("Access token saved:", token);
        props.setOnboarding(false);
      });
    }
  };

  useEffect(() => {
    let timeoutId; // To hold the ID of the setTimeout

    const accessTokenCheck = async () => {
      const { accessTokenValue } = await chrome.storage.local.get([
        "accessTokenValue",
      ]);

      if (!accessTokenValue || CheckTokenExpiry(accessTokenValue)) {
        // Set a new timeout if the token is not present or expired
        timeoutId = setTimeout(() => {
          accessTokenCheck();
        }, 1000);
      } else {
        // If the token is present and not expired, stop the loop
        props.setOnboarding(false);
      }
    };

    accessTokenCheck(); // Initial call to the function

    // Cleanup function to clear the timeout if the component unmounts
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="announcement">
      <div className="announcement-wrap">
        <div className="announcement-hero">
          <img src={chrome.runtime.getURL("assets/helper/hero.png")} />
        </div>
        <div className="announcement-details">
          <div className="announcement-title">
            {chrome.i18n.getMessage("updateAnnouncementTitle")}
          </div>
          <div className="announcement-description">
            {chrome.i18n.getMessage("updateAnnouncementDescription")}{" "}
            <a href={URL} target="_blank">
              {chrome.i18n.getMessage("updateAnnouncementLearnMore")}
            </a>
          </div>
          <div
            className="announcement-cta"
            onClick={() => {
              props.setOnboarding(false);
            }}
          >
            {chrome.i18n.getMessage("updateAnnouncementButton")}
          </div>
          {/* <div className="announcement-cta" onClick={handleAccessToken}>
            Enter Access Token manually
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Announcement;
