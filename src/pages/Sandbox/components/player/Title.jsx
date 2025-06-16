import React from "react";

// Styles
import styles from "../../styles/player/_Title.module.scss";
const URL = "/assets/";

import { getFrontendBaseEndpoint } from "../../../../utils/constants";

const urlTemplate = `${getFrontendBaseEndpoint()}/create-new`;

async function openURLInNewTabAndCloseCurrent(url) {
  await chrome.tabs.create({ url: url });
  chrome.tabs.getCurrent(function (tab) {
    chrome.tabs.remove(tab.id, function () {});
  });
}

const Title = (props) => {
  const handleDiscardVideo = () => {
    openURLInNewTabAndCloseCurrent(urlTemplate);
  };

  return (
    <div className={styles.TitleParent}>
      <div className={styles.TitleWrap}>
        <>
          <h1>Your Screen Recording</h1>
          {/* {agentId != "" && (
            <button
              className={styles.downloadButton}
              onClick={downloadDocumentOnClick}
            >
              <ReactSVG
                src={URL + "editor/icons/download.svg"}
                className={styles.shareIcon}
              />
              {showDownload ? "Download Document" : "Document Generating.."}
            </button>
          )} */}
          {/* <button
            className={styles.discardButton}
            onClick={() => {
              handleDiscardVideo();
            }}
          >
            <ReactSVG
              src={URL + "editor/icons/bin.svg"}
              className={styles.shareIcon}
            />
            {"Discard"}
          </button> */}
        </>
      </div>
    </div>
  );
};

export default Title;
