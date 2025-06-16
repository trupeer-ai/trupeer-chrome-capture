import React, { useContext, useState, useEffect, useRef } from "react";

// Styles
import styles from "../../styles/player/_Title.module.scss";
const URL = "/assets/";

// Icon
import { ReactSVG } from "react-svg";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context
import PopupComponent from "./PopupComponent";
import { getBackendBaseEndpoint } from "../../../../utils/constants";
import { getFrontendBaseEndpoint } from "../../../../utils/constants";
const { ShareFileClient } = require("@azure/storage-file-share");
import { createAgent, uploadFileToAzure, sendVideoToApp } from "../../../../utils/trupeer";

const urlTemplate = `${getFrontendBaseEndpoint()}/content/draft?agentId={agentId}`;
const triggerAPIEndpoint = `${getBackendBaseEndpoint()}/bot/workflow/trigger`;
const uploadV2APIEndpoint = `${getBackendBaseEndpoint()}/bot/workflow/create`;
const uploadAPIEndpoint = `${getBackendBaseEndpoint()}/bot/workflow/upload`;

function openURLInNewTab(url) {
  chrome.tabs.create({ url: url });
}

const handleUploadError = (
  error,
  setIsErrorPopupOpen,
  setIsPopupOpen,
  setIsVideoUploading,
  setErrorMessage
) => {
  console.error("Upload error:", error);
  setIsVideoUploading(false);
  setIsPopupOpen(false);
  setErrorMessage(
    error.message ||
    "An unknown error occurred. Please contact support at hello@trupeer.ai"
  );
  setIsErrorPopupOpen(true);
};

const VideoFooter = (props) => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const inputRef = useRef(null);
  // Show the video title, as a heading by default (multiline), on click show a text input to edit the title
  const [showTitle, setShowTitle] = useState(true);
  const [title, setTitle] = useState(contentState.title);
  const [displayTitle, setDisplayTitle] = useState(contentState.title);
  const [agentId, setAgentId] = useState("");
  const [showDownload, setShowDownload] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isVideoUploaded, setIsVideoUploaded] = useState(false);
  const [accessTokenValue, setAccessTokenValue] = useState("");
  const [clickData, setClickData] = useState([]);
  const [screenSizes, setScreenSizes] = useState({});
  const [inputlanguageCode, setInputLanguageCode] = useState("en");
  const [userInteracted, setUserInteracted] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const contentStateRef = useRef(contentState);
  const [IsMetadataReady, setIsMetadataReady] = useState(false);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  const isVideoProcessing =
    !contentStateRef.current.mp4ready &&
    !contentStateRef.current.blob &&
    !contentStateRef.current.noffmpeg &&
    !(
      contentStateRef.current.duration > contentStateRef.current.editLimit &&
      !contentStateRef.current.override
    );

  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (userInteracted && !isVideoUploaded) {
      window.onbeforeunload = function () {
        return true;
      };
    } else {
      window.onbeforeunload = null;
    }

    return () => {
      window.onbeforeunload = null;
    };
  }, [userInteracted, isVideoUploaded]);

  useEffect(() => {
    async function setAccessToken() {
      const response = await chrome.storage.local.get(["accessTokenValue"]);
      if (response.accessTokenValue) {
        setAccessTokenValue(response.accessTokenValue);
      }
    }

    async function fetchClickData() {
      const response = await chrome.storage.local.get(["clickData"]);
      if (response.clickData) {
        console.log("Click data found");
        console.log(response.clickData);
        setClickData(response.clickData);
      }
    }

    async function fetchScreenSizes() {
      const response = await chrome.storage.local.get(["screenSizes"]);
      if (response.screenSizes) {
        console.log("Screen sizes found");
        console.log(response.screenSizes);
        setScreenSizes(response.screenSizes);
      }
    }

    async function fetchInputLanguage() {
      const response = await chrome.storage.local.get(["inputLanguage"]);
      const languageMasterInfo = await getAllLanguages(accessTokenValue);
      if (response.inputLanguage) {
        console.log("Input language found: ", response.inputLanguage);
        const inputLanguageCode = languageMasterInfo.find(language => language.tag === response.inputLanguage)?.tag || "en";
        console.log("Input language code: ", inputLanguageCode);
        setInputLanguageCode(inputLanguageCode);
      }
    }

    (async () => {
      setIsMetadataReady(false);
      await fetchClickData();
      await setAccessToken();
      await fetchScreenSizes();
      await fetchInputLanguage();
      setIsMetadataReady(true);
    })();
  }, []);

  const handleContentStateReady = async (videoBlob, clickData, screenSizes, inputlanguageCode, accessTokenValue) => {
    console.log("Inside handleContentStateReady", videoBlob, clickData, screenSizes, inputlanguageCode, accessTokenValue);
    let agentId, writeURL;
    // Create agent
    try {
      const res = await createAgent(videoBlob, clickData, screenSizes, inputlanguageCode, accessTokenValue);
      agentId = res.agentId;
      writeURL = res.writeURL;
    } catch (error) {
      console.error("Error creating agent:", error);
      return;
    }

    if (!agentId || !writeURL) {
      console.error("Agent ID or write URL not found");
      return;
    }

    // Upload to Azure
    const uploadToAzure = uploadFileToAzure(writeURL, videoBlob).catch(error => {
      console.error("Error uploading video to Azure:", error);
      throw new Error(`Azure upload failed: ${error.message}`);
    });

    // Send to Trupeer app
    const sendToTrupeer = sendVideoToApp(videoBlob, {
      inputLanguageTag: inputlanguageCode,
      screenSize: screenSizes,
      clickData: clickData,
      videoSize: videoBlob.size,
      duration: contentState.duration,
      agentId: agentId,
    }, agentId).catch(error => {
      console.error("Error sending video to Trupeer app:", error);
      throw new Error(`Trupeer app upload failed: ${error.message}`);
    });

    // Run uploads in parallel
    try {
      const [
        azureResult,
        trupeerResult
      ] = await Promise.all([
        uploadToAzure,
        sendToTrupeer
      ]);

      console.log("All uploads completed successfully");
      // Close the current tab only if both uploads are successful
      if (azureResult === true && trupeerResult === true) {
        window.close();
      }
      return {
        success: true,
        agentId: agentId,
        azureResult: azureResult,
        trupeerResult: trupeerResult
      };
    } catch (error) {
      console.error("Upload operation failed:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  useEffect(() => {
    if (contentState.ready && IsMetadataReady) {
      handleContentStateReady(props.video, clickData, screenSizes, inputlanguageCode, accessTokenValue);
    }
  }, [contentState.ready, IsMetadataReady])

  const handleOpenVideo = () => {
    if (agentId != "") {
      openURLInNewTab(urlTemplate.replace("{agentId}", agentId));
    }
  };

  const handleUploadVideoV2 = async () => {
    const duration = await chrome.storage.local.get("recordingDuration");
    const recordingDuration = duration.recordingDuration;

    if (recordingDuration < 5 * 1000) {
      console.log("Video duration is less than 5 seconds, skipping upload");
      setErrorMessage("Video must be at least 5 seconds long to generate content.");
      setIsErrorPopupOpen(true);
      return;
    }

    async function uploadFileToAzure(writeURL, video) {
      try {
        const shareFileClient = new ShareFileClient(writeURL);
        const chunkSize = 4 * 1024 * 1024; // 4 MB
        const videoSize = video.size;
        const fileContent = await video.arrayBuffer();

        let offset = 0;

        while (offset < videoSize) {
          try {
            const chunk = fileContent.slice(offset, offset + chunkSize);
            await shareFileClient.uploadRange(chunk, offset, chunk.byteLength);
            console.log(
              `Uploaded chunk from offset ${offset} to ${offset + chunk.byteLength
              }`
            );
            offset += chunkSize;
          } catch (e) {
            throw new Error(
              `Failed to upload chunk at offset ${offset}: ${e.message}`
            );
          }
        }

        console.log("Uploaded file to Azure successfully!");
      } catch (error) {
        throw new Error(`Azure upload failed: ${error.message}`);
      }
    }

    async function triggerDraftGeneration(agentId) {
      try {
        const apiEndpoint = `${triggerAPIEndpoint}?agentId=${agentId}`;
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${accessTokenValue}`);

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: headers,
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Draft generation failed: ${errorData.message || response.statusText
            }`
          );
        }

        console.log("Draft generation triggered successfully");
      } catch (error) {
        throw new Error(`Failed to trigger draft generation: ${error.message}`);
      }
    }

    async function createAgent() {
      if (!props.video) {
        throw new Error("No video file provided");
      }

      const videoSize = props.video.size;
      if (videoSize === 0) {
        throw new Error("Video file is empty");
      }

      const requestData = {
        clickData: clickData,
        screenSize: screenSizes,
        videoSize: videoSize,
        inputLanguageTag: inputlanguageCode,
      };

      try {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${accessTokenValue}`);
        headers.append("Content-Type", "application/json");

        const response = await fetch(uploadV2APIEndpoint, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(requestData),
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to create agent: ${errorData.message || response.statusText
            }`
          );
        }

        const { data } = await response.json();
        const agentId = data.agentId;
        const writeURL = data.writeURL;

        if (!agentId || !writeURL) {
          throw new Error("Invalid response data from server");
        }

        setAgentId(agentId);
        await uploadFileToAzure(writeURL, props.video);
        await triggerDraftGeneration(agentId);
        setIsVideoUploaded(true);
        openURLInNewTab(urlTemplate.replace("{agentId}", agentId));
      } catch (error) {
        handleUploadError(
          error,
          setIsErrorPopupOpen,
          setIsPopupOpen,
          setIsVideoUploading,
          setErrorMessage
        );
      }
    }

    async function uploadVideoV2() {
      if (!accessTokenValue) {
        handleUploadError(
          new Error("Access token not found, please login again."),
          setIsErrorPopupOpen,
          setIsPopupOpen,
          setIsVideoUploading,
          setErrorMessage
        );
        return;
      }

      setIsVideoUploading(true);
      setIsPopupOpen(true);

      try {
        if (agentId !== "") {
          await uploadFileToAzure(agentId, props.video);
          await triggerDraftGeneration(agentId);
          setIsVideoUploaded(true);
          openURLInNewTab(urlTemplate.replace("{agentId}", agentId));
        } else {
          await createAgent();
        }
      } catch (error) {
        handleUploadError(
          error,
          setIsErrorPopupOpen,
          setIsPopupOpen,
          setIsVideoUploading,
          setErrorMessage
        );
      } finally {
        setIsVideoUploading(false);
        setIsPopupOpen(false);
      }
    }

    await uploadVideoV2();
  };

  const handleUploadVideo = () => {
    async function uploadVideo() {
      if (!accessTokenValue) {
        console.log("Access token not found");
        return;
      }

      setIsVideoUploading(true);
      setIsPopupOpen(true);

      const j = {
        botType: "workflow-agent",
      };
      const formData = new FormData();
      formData.append("json", JSON.stringify(j));
      formData.append("file", props.video);
      formData.append("clickData", JSON.stringify(clickData));
      formData.append("screenSize", JSON.stringify(screenSizes));
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${accessTokenValue}`);
      try {
        const response = await fetch(uploadAPIEndpoint, {
          method: "POST",
          body: formData,
          cache: "no-store",
          headers: headers,
        });

        if (response.ok) {
          const { data } = await response.json();
          const agentId = data.botagent.id;
          console.log("Uploaded", agentId);
          setAgentId(agentId);
          openURLInNewTab(urlTemplate.replace("{agentId}", agentId));
        } else {
          throw new Error("Failed to create video");
        }
      } catch (e) {
        console.error(e);
      }
      setIsVideoUploading(false);
      setIsPopupOpen(false);
      setIsVideoUploaded(true);
    }

    uploadVideo();
    // setIsVideoUploading(true);
    // setIsPopupOpen(true);
  };

  const downloadDocumentOnClick = async () => {
    const headers = new Headers();

    try {
      const response = await fetch(
        `${getBackendBaseEndpoint()}/bot/document/document?botId=${encodeURIComponent(
          agentId
        )}`,
        {
          method: "GET",
          cache: "no-store",
          headers: headers,
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch the document");
      }

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = function () {
        const url = reader.result;
        chrome.downloads.download({
          url: url,
          filename: "downloadedDocument.html",
          saveAs: true,
        });
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };


  return (
    <div className={styles.TitleParent}>
      <div className={styles.FooterWrap}>
        <>
          {!isVideoUploaded && (
            <button
              className={styles.uploadButton}
              onClick={() => {
                // handleUploadVideoV2();
                handleContentStateReady(props.video, clickData, screenSizes, inputlanguageCode, accessTokenValue);
              }}
              disabled={isVideoUploading || isVideoUploaded}
            >
              <ReactSVG
                src={URL + "editor/icons/gen-ai-content.svg"}
                className={styles.shareIcon}
              />
              {isVideoUploading
                ? "Generating Content.."
                : "Generate AI Content"}
            </button>
          )}
          {isVideoUploaded && (
            <button
              className={styles.uploadButton}
              onClick={() => {
                handleOpenVideo();
              }}
              disabled={!isVideoUploaded || agentId == ""}
            >
              <ReactSVG
                src={URL + "editor/icons/export.svg"}
                className={styles.shareIcon}
              />
              {"Open Generated Content"}
            </button>
          )}
        </>
      </div>
      <PopupComponent
        isOpen={isPopupOpen}
        showLoader={true}
        popupText={"Your video is being uploaded"}
        allowClose={false}
      />
      <PopupComponent
        isOpen={isErrorPopupOpen}
        showLoader={false}
        popupText={errorMessage}
        allowClose={true}
        onClose={() => setIsErrorPopupOpen(false)}
      />
    </div>
  );
};

export default VideoFooter;
