import {
  sendMessageTab,
  focusTab,
  removeTab,
  getCurrentTab,
  createTab,
} from "./modules/tabHelper";

import localforage from "localforage";

import { CheckTokenExpiry, CheckUserCredits } from "../../utils/auth";

import { getFrontendBaseEndpoint } from "../../utils/constants";
import { createAgent, sendVideoToApp, uploadFileToAzure, fixWebMDuration, getAllLanguages } from "../../utils/trupeer";

localforage.config({
  driver: localforage.INDEXEDDB,
  name: "trupeer-ai",
  version: 1,
});

// Get chunks store
const chunksStore = localforage.createInstance({
  name: "chunks",
});

// Get clicks store
const clicksStore = localforage.createInstance({
  name: "clicks",
});

// Get pause time store
const pauseStore = localforage.createInstance({
  name: "pauseTime",
});

let screenSizes = {
  viewportWidth: 0,
  viewportHeight: 0,
  screenHeight: 0,
  screenWidth: 0,
};

// Get localDirectory store
const localDirectoryStore = localforage.createInstance({
  name: "localDirectory",
});

const startAfterCountdown = async () => {
  // Check that the recording didn't get dismissed
  const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
  const { offscreen } = await chrome.storage.local.get(["offscreen"]);

  if (recordingTab != null || offscreen) {
    chrome.storage.local.set({ recording: true });
    startRecording();
  }
};

const resetActiveTab = async () => {
  let editor_url = "editor.html";

  // Check if Chrome version is 109 or below
  if (navigator.userAgent.includes("Chrome/")) {
    const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
    if (version <= 109) {
      editor_url = "editorfallback.html";
    }
  }
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);

  // Check if activeTab exists
  chrome.tabs.get(activeTab, (tab) => {
    if (tab) {
      // Focus the window
      chrome.windows.update(tab.windowId, { focused: true }, async () => {
        chrome.tabs.update(activeTab, {
          active: true,
          selected: true,
          highlighted: true,
        });

        focusTab(activeTab);

        sendMessageTab(activeTab, { type: "ready-to-record" });

        // Check if countdown is set, if so start recording after 3.5 seconds
        const { countdown } = await chrome.storage.local.get(["countdown"]);
        if (countdown) {
          setTimeout(() => {
            startAfterCountdown();
          }, 3500);
        } else {
          setTimeout(() => {
            startAfterCountdown();
          }, 500);
        }
      });
    }
  });
};

const resetActiveTabRestart = async () => {
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);
  focusTab(activeTab).then(async () => {
    sendMessageTab(activeTab, { type: "ready-to-record" });

    // Check if countdown is set, if so start recording after 3 seconds
    const { countdown } = await chrome.storage.local.get(["countdown"]);
    if (countdown) {
      setTimeout(() => {
        startAfterCountdown();
      }, 3000);
    } else {
      startRecording();
    }
  });
};

const startRecording = async () => {
  await chrome.storage.local.set({
    recordingStartTime: Date.now(),
    recordingDuration: 0,
    restarting: false,
    recording: true,
    pauseData: [],
    totalPauseTime: 0,
    isPaused: false,
    pauseStartTime: null,
    clickData: [],
  });

  await clicksStore.clear();
  await pauseStore.clear();

  // Check if customRegion is set
  const { customRegion } = await chrome.storage.local.get(["customRegion"]);

  if (customRegion) {
    sendMessageRecord({ type: "start-recording-tab", region: true });
  } else {
    sendMessageRecord({ type: "start-recording-tab" });
  }
  chrome.action.setIcon({ path: "assets/recording-logo.png" });

  // @TODO: OPTIMISATION: Create Agent ID & write URL if doesn't exist - But at this point, we don't know the video size.
  // We can send the video size as 0, but if the video is larger than the plan supports, we can get it to a fallback page. Or better yet, we can just upload it to server but don't allow it to be published and create draft in the frontend (which is a better way).







  // FEATURE_DISABLED // Set up alarm if set in storage
  // const { alarm } = await chrome.storage.local.get(["alarm"]);
  // const { alarmTime } = await chrome.storage.local.get(["alarmTime"]);
  // if (alarm) {
  //   const seconds = parseFloat(alarmTime);
  //   chrome.alarms.create("recording-alarm", { delayInMinutes: seconds / 60 });
  // }
};

// Detect commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "start-recording") {
    // get active tab
    const activeTab = await getCurrentTab();

    // Check if it's possible to inject into content (not a chrome:// page, new tab, etc)
    if (
      !(
        (navigator.onLine === false &&
          !activeTab.url.includes("/playground.html") &&
          !activeTab.url.includes("/setup.html")) ||
        activeTab.url.startsWith("chrome://") ||
        (activeTab.url.startsWith("chrome-extension://") &&
          !activeTab.url.includes("/playground.html") &&
          !activeTab.url.includes("/setup.html"))
      ) &&
      !activeTab.url.includes("chrome.google.com/webstore") &&
      !activeTab.url.includes("chromewebstore.google.com")
    ) {
      sendMessageTab(activeTab.id, { type: "start-stream" });
    } else {
      chrome.tabs
        .create({
          url: "playground.html",
          active: true,
        })
        .then((tab) => {
          chrome.storage.local.set({ activeTab: tab.id });
          // Wait for the tab to load
          chrome.tabs.onUpdated.addListener(function _(tabId, changeInfo, tab) {
            if (tabId === tab.id && changeInfo.status === "complete") {
              setTimeout(() => {
                sendMessageTab(tab.id, { type: "start-stream" });
              }, 500);
              chrome.tabs.onUpdated.removeListener(_);
            }
          });
        });
    }
  } else if (command === "cancel-recording") {
    // get active tab
    const activeTab = await getCurrentTab();
    sendMessageTab(activeTab.id, { type: "cancel-recording" });
  } else if (command == "pause-recording") {
    const activeTab = await getCurrentTab();
    sendMessageTab(activeTab.id, { type: "pause-recording" });
  }
});

// const handleAlarm = async (alarm) => {
//   if (alarm.name === "recording-alarm") {
//     // Check if recording
//     const { recording } = await chrome.storage.local.get(["recording"]);
//     if (recording) {
//       stopRecording();
//       const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
//       sendMessageTab(recordingTab, { type: "stop-recording-tab" });
//       const { activeTab } = await chrome.storage.local.get(["activeTab"]);
//       sendMessageTab(activeTab, { type: "stop-recording-tab" });
//       const currentTab = await getCurrentTab();
//       sendMessageTab(currentTab.id, { type: "stop-recording-tab" });
//     }
//     chrome.alarms.clear("recording-alarm");
//   }
// };

// const alarmListener = (alarm) => {
//   handleAlarm(alarm);
// };

// const addAlarmListener = () => {
//   if (!chrome.alarms.onAlarm.hasListener(alarmListener)) {
//     chrome.alarms.onAlarm.addListener(alarmListener);
//   }
// };

// // Check if the permission is granted
// if (chrome.permissions) {
//   chrome.permissions.contains({ permissions: ["alarms"] }, (result) => {
//     if (result) {
//       addAlarmListener();
//     }
//   });
// }

const onActivated = async (activeInfo) => {
  const { recordingStartTime } = await chrome.storage.local.get([
    "recordingStartTime",
  ]);
  // Get tab
  const tab = await chrome.tabs.get(activeInfo.tabId);

  // Check if not recording (needs to hide the extension)
  const { recording } = await chrome.storage.local.get(["recording"]);
  const { restarting } = await chrome.storage.local.get(["restarting"]);

  // Update active tab
  if (recording) {
    // Check if region recording, and if the recording tab is the same as the current tab
    const { tabRecordedID } = await chrome.storage.local.get(["tabRecordedID"]);
    if (tabRecordedID && tabRecordedID != activeInfo.tabId) {
      sendMessageTab(activeInfo.tabId, { type: "hide-popup-recording" });
      // Check if active tab is not backup.html + chrome-extension://
    } else if (
      !(
        tab.url.includes("backup.html") &&
        tab.url.includes("chrome-extension://")
      )
    ) {
      chrome.storage.local.set({ activeTab: activeInfo.tabId });
    }

    // Check if region or customRegion is set
    const { region } = await chrome.storage.local.get(["region"]);
    const { customRegion } = await chrome.storage.local.get(["customRegion"]);
    if (!region && !customRegion) {
      sendMessageTab(activeInfo.tabId, { type: "recording-check" });
    }
  } else if (!recording && !restarting) {
    sendMessageTab(activeInfo.tabId, { type: "recording-ended" });
  }

  if (recordingStartTime) {
    // Check if alarm
    const { alarm } = await chrome.storage.local.get(["alarm"]);
    if (alarm) {
      // Send remaining seconds
      const { alarmTime } = await chrome.storage.local.get(["alarmTime"]);
      const seconds = parseFloat(alarmTime);
      const time = Math.floor((Date.now() - recordingStartTime) / 1000);
      const remaining = seconds - time;
      sendMessageTab(activeInfo.tabId, {
        type: "time",
        time: remaining,
      });
    } else {
      const time = Math.floor((Date.now() - recordingStartTime) / 1000);
      sendMessageTab(activeInfo.tabId, { type: "time", time: time });
    }
  }
};

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  // Get the tab that is active in the focused window
  const [activeTab] = await chrome.tabs.query({
    active: true,
    windowId: windowId,
  });

  if (activeTab) {
    onActivated({ tabId: activeTab.id });
  }
});

// Check when a page is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  onActivated(activeInfo);
});

// Check when a user navigates to a different domain in the same tab (chrome.tabs?)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    // Check if not recording (needs to hide the extension)
    const { recording } = await chrome.storage.local.get(["recording"]);
    const { restarting } = await chrome.storage.local.get(["restarting"]);
    const { tabRecordedID } = await chrome.storage.local.get(["tabRecordedID"]);

    if (!recording && !restarting) {
      sendMessageTab(tabId, { type: "recording-ended" });
    } else if (recording && tabRecordedID && tabRecordedID == tabId) {
      sendMessageTab(tabId, { type: "recording-check", force: true });
    }

    const { recordingStartTime } = await chrome.storage.local.get([
      "recordingStartTime",
    ]);
    // Get tab
    const tab = await chrome.tabs.get(tabId);

    if (recordingStartTime) {
      // Check if alarm
      const { alarm } = await chrome.storage.local.get(["alarm"]);
      if (alarm) {
        // Send remaining seconds
        const { alarmTime } = await chrome.storage.local.get(["alarmTime"]);
        const seconds = parseFloat(alarmTime);
        const time = Math.floor((Date.now() - recordingStartTime) / 1000);
        const remaining = seconds - time;
        sendMessageTab(tabId, {
          type: "time",
          time: remaining,
        });
      } else {
        const time = Math.floor((Date.now() - recordingStartTime) / 1000);
        sendMessageTab(tabId, { type: "time", time: time });
      }
    }

    const commands = await chrome.commands.getAll();
    sendMessageTab(tabId, {
      type: "commands",
      commands: commands,
    });

    // Check if tab is playground.html
    if (
      tab.url.includes(chrome.runtime.getURL("playground.html")) &&
      changeInfo.status === "complete"
    ) {
      sendMessageTab(tab.id, { type: "toggle-popup" });
    }
  }
});

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

const handleChunks = async (chunks, override = false) => {
  const { sendingChunks, sandboxTab } = await chrome.storage.local.get([
    "sendingChunks",
    "sandboxTab",
  ]);

  if (sendingChunks) {
    console.warn("Chunks are already being sent, skipping...");
    return;
  }
  await chrome.storage.local.set({ sendingChunks: true });

  if (chunks.length === 0) {
    await chrome.storage.local.set({ sendingChunks: false });
    sendMessageTab(sandboxTab, { type: "make-video-tab", override });
    return;
  }

  // Order chunks by timestamp
  chunks.sort((a, b) => a.timestamp - b.timestamp);

  let currentIndex = 0;
  const batchSize = 10;
  const maxRetries = 3;
  const retryDelay = 1000;
  const chunksCount = chunks.length;

  sendMessageTab(sandboxTab, {
    type: "chunk-count",
    count: chunksCount,
    override,
  });

  const sendBatch = async (batch, retryCount = 0) => {
    try {
      const response = await sendMessageTab(sandboxTab, {
        type: "new-chunk-tab",
        chunks: batch,
      });
      if (!response) {
        throw new Error("No response or failed response from tab.");
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        console.error(
          `Sending batch failed, retrying... Attempt ${retryCount + 1}`,
          error
        );
        setTimeout(() => sendBatch(batch, retryCount + 1), retryDelay);
      } else {
        console.error("Maximum retry attempts reached for this batch.", error);
      }
    }
  };

  while (currentIndex < chunksCount) {
    const end = Math.min(currentIndex + batchSize, chunksCount);
    const batch = await Promise.all(
      chunks.slice(currentIndex, end).map(async (chunk, index) => {
        try {
          const base64 = await blobToBase64(chunk.chunk);
          return { chunk: base64, index: currentIndex + index };
        } catch (error) {
          console.error("Error converting chunk to Base64", error);
          return null;
        }
      })
    );

    // Filter out any failed conversions
    const filteredBatch = batch.filter((chunk) => chunk !== null);
    if (filteredBatch.length > 0) {
      await sendBatch(filteredBatch);
    }
    currentIndex += batchSize;
  }

  await chrome.storage.local.set({ sendingChunks: false });
  sendMessageTab(sandboxTab, { type: "make-video-tab", override });
};

const sendChunks = async (override = false) => {
  try {
    const chunks = [];
    await chunksStore.iterate((value, key) => {
      chunks.push(value);
    });
    handleChunks(chunks, override);
  } catch (error) {
    chrome.runtime.reload();
  }
};

const getPauseData = async () => {
  /**
   * It is of the format:
   * {
   *  startTime: 1715462400000,
   *  endTime: 1715462400000,
   * }[]
   */
  const currentPauseData = await pauseStore.getItem("pauseData");
  return currentPauseData;
};

const getPauseAdjustmentTime = async () => {
  const pauseData = await getPauseData();
  let pauseAdjustmentTime = 0;
  if (pauseData) {
    for (const pause of pauseData) {
      if (pause.endTime) {
        pauseAdjustmentTime += pause.endTime - pause.startTime;
      } else {
        // In the case where recording is directly stopped without resuming after a pause, consider the pause end as the current time
        pauseAdjustmentTime += Date.now() - pause.startTime;
      }
    }
  }
  return pauseAdjustmentTime;
};

const getClickData = async () => {
  /**
   * It is of the format:
   * {
   *  x: 100,
   *  y: 100,
   *  timestamp: 1715462400000,
   * }[]
   */
  const clickData = await clicksStore.getItem("clickData");
  return clickData;
};

// Modify clickData taking pauseData into consideration
const normaliseClickData = async () => {
  const clickData = await getClickData() || [];
  const pauseData = await getPauseData() || [];
  const { recordingStartTime } = await chrome.storage.local.get(["recordingStartTime"]);

  if (!recordingStartTime) {
    console.error("Recording start time not found");
    return clickData;
  }

  console.log("clickData", clickData);
  console.log("pauseData", pauseData);
  console.log("recordingStartTime", recordingStartTime);

  let adjustedClickData = [];

  for (const click of clickData) {
    let totalPauseTime = 0;

    // Calculate total pause time up to this click's timestamp
    for (const pause of pauseData) {
      if (pause.startTime > click.timestamp) {
        // Skip pauses that started after this click
        continue;
      }

      // For completed pauses
      if (pause.endTime) {
        if (pause.endTime <= click.timestamp) {
          // Full pause duration if pause ended before click
          totalPauseTime += pause.endTime - pause.startTime;
        } else {
          // Partial pause duration up to click timestamp
          totalPauseTime += click.timestamp - pause.startTime;
        }
      } else {
        // For active pause, only count time up to click timestamp
        totalPauseTime += click.timestamp - pause.startTime;
      }
    }

    // Adjust the click timestamp by subtracting the total pause time
    const adjustedTimestamp = click.timestamp - totalPauseTime - recordingStartTime;
    adjustedClickData.push({ ...click, timestamp: adjustedTimestamp });
  }

  return adjustedClickData;
};


const processChunks = async (chunks) => {
  console.log("Starting chunk processing, total chunks:", chunks.length);

  const processedChunks = [];
  // Sort chunks by timestamp to ensure correct order
  chunks.sort((a, b) => a.timestamp - b.timestamp);

  for (const chunk of chunks) {
    try {
      // Ensure we're getting the actual blob data from the chunk
      if (chunk && chunk.chunk instanceof Blob) {
        // Convert Blob to ArrayBuffer for reliable transfer
        const arrayBuffer = await chunk.chunk.arrayBuffer();
        processedChunks.push(arrayBuffer);
      } else {
        console.error("Invalid chunk format:", chunk);
      }
    } catch (error) {
      console.error("Error processing chunk:", error);
    }
  }

  console.log("Processed chunks count:", processedChunks.length);

  if (processedChunks.length === 0) {
    throw new Error("No valid chunks processed");
  }

  // Create a single blob from all chunks
  const blob = new Blob(processedChunks, {
    type: "video/webm"
  });

  console.log("Final blob size:", blob.size);
  return blob;
};

const stopRecording = async () => {
  // Send message that upload has started
  chrome.runtime.sendMessage({ type: "upload-started" });

  const pauseAdjustmentTime = await getPauseAdjustmentTime();

  chrome.storage.local.set({ restarting: false });
  const { recordingStartTime, sendingChunks } = await chrome.storage.local.get([
    "recordingStartTime",
    "sendingChunks",
  ]);

  let duration = Date.now() - recordingStartTime - pauseAdjustmentTime;
  const maxDuration = 7 * 60 * 1000; // 7 minutes

  const clickData = await normaliseClickData();
  await chrome.storage.local.set({ clickData: clickData });
  await chrome.storage.local.set({ screenSizes: screenSizes });

  if (recordingStartTime === 0) {
    duration = 0;
  }
  chrome.storage.local.set({
    recordingStartTime: null,
    recordingDuration: duration,
    recording: false,
    tabRecordedID: null,
    pauseData: [],
    totalPauseTime: 0,
    isPaused: false,
    pauseStartTime: null,
  });

  chrome.storage.local.set({ recordingStartTime: 0 });

  if (sendingChunks) {
    console.warn("Chunks are already being sent, skipping...");
    return;
  }

  if (duration > maxDuration) {
    // @TODO: We can do something here
  }

  const { inputLanguage } = await chrome.storage.local.get(['inputLanguage']);

  const chunksToBeSent = [];
  await chunksStore.iterate((value, key) => {
    chunksToBeSent.push(value);
  });
  console.log("chunksToBeSent", chunksToBeSent);

  let processedChunks; // This is the blob that is final

  // Process chunks and create blob
  try {
    processedChunks = await processChunks(chunksToBeSent);
    console.log("Processed blob:", processedChunks);
  } catch (error) {
    console.error("Error processing video chunks:", error);
    return;
  }

  if (!processedChunks) {
    console.error("No processed chunks found");
    return;
  }

  // Fix WebM duration
  processedChunks = await fixWebMDuration(processedChunks, duration);

  let agentId, writeURL;

  const { accessTokenValue } = await chrome.storage.local.get(["accessTokenValue"]);
  const languageMasterInfo = await getAllLanguages(accessTokenValue || "");
  const inputLanguageCode = languageMasterInfo.find(language => language.tag === inputLanguage)?.tag || "en";

  // Create Agent
  try {
    const res = await createAgent(processedChunks, clickData, screenSizes, inputLanguageCode, accessTokenValue);
    agentId = res.agentId;
    writeURL = res.writeURL;
  } catch (error) {
    console.error("Error creating agent:", error);

    // Reset the extension icon to the original state
    chrome.action.setIcon({ path: "assets/icon-34.png" });

    // Check if this is a payment required error
    if (error.message === "PAYMENT_REQUIRED") {

      // Find and focus the recorder tab
      chrome.tabs.query({ url: chrome.runtime.getURL("recorder.html") }, (tabs) => {
        if (tabs && tabs.length > 0) {
          // Focus the recorder tab
          chrome.tabs.update(tabs[0].id, { active: true });

          // Send payment-required message to the recorder
          chrome.tabs.sendMessage(tabs[0].id, { type: "payment-required" });
        } else {
          // If recorder tab not found, open it
          chrome.tabs.create({
            url: chrome.runtime.getURL("recorder.html"),
            active: true
          }, (tab) => {
            // Wait for the tab to load and then send the message
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.sendMessage(tab.id, { type: "payment-required" });
                chrome.tabs.onUpdated.removeListener(listener);
              }
            });
          });
        }
      });
    }

    return;
  }

  if (!agentId || !writeURL) {
    console.error("Agent ID or write URL not found");
    return;
  }

  // Upload to Azure
  const uploadToAzure = uploadFileToAzure(agentId, writeURL, processedChunks, accessTokenValue).catch(error => {
    console.error("Error uploading video to Azure:", error);
    throw new Error(`Azure upload failed: ${error.message}`);
  });

  // Send to Trupeer app
  const sendToTrupeer = sendVideoToApp(processedChunks, agentId).catch(error => {
    console.error("Error sending video to Trupeer app:", error);
    throw new Error(`Trupeer app upload failed: ${error.message}`);
  });

  // Run uploads in parallel
  try {
    console.log("Starting parallel uploads...");

    const [azureResult, trupeerResult] = await Promise.all([
      uploadToAzure.then(result => {
        console.log("Azure upload completed:", result);
        return result;
      }),
      sendToTrupeer.then(result => {
        console.log("Trupeer upload completed:", result);
        return result;
      })
    ]);

    console.log("All uploads completed successfully", { azureResult, trupeerResult });

    // Send message that upload has completed
    chrome.runtime.sendMessage({ type: "upload-completed" });

    // Close the current tab only if both uploads are successful
    if (azureResult === true && trupeerResult === true) {
      console.log("Both uploads successful, handling recording complete");
      handleRecordingComplete();
    } else {
      console.log("One or both uploads failed:", { azureResult, trupeerResult });
    }

    return {
      success: true,
      agentId,
      azureResult,
      trupeerResult,
    };
  } catch (error) {
    console.error("Error during uploads:", error);

    // Send message that upload has failed
    chrome.runtime.sendMessage({ type: "upload-failed" });

    return;
  }
};

const forceProcessing = async () => {
  // Need to create a new sandbox tab
  let editor_url = "editor.html";

  // Get sandbox tab
  const { sandboxTab } = await chrome.storage.local.get(["sandboxTab"]);

  chrome.tabs.create(
    {
      url: editor_url,
      active: true,
    },
    (tab) => {
      chrome.tabs.update(tab.id, { autoDiscardable: false }).then((tab) => {
        chrome.tabs.onUpdated.addListener(function _(
          tabId,
          changeInfo,
          updatedTab
        ) {
          if (tabId === tab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(_);
            // Close the existing sandbox tab
            removeTab(sandboxTab);
            chrome.storage.local.set({ sandboxTab: tab.id });

            sendChunks(true);
          }
        });
      });
    }
  );
};

// For some reason without this the service worker doesn't always work
chrome.runtime.onStartup.addListener(() => {
  console.log(`Starting...`);
});

const onClickAction = async (tab) => {
  // Check if recording
  const { recording } = await chrome.storage.local.get(["recording"]);
  if (recording) {
    // await stopRecording();
    sendMessageRecord({ type: "stop-recording-tab" });
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);

    // Check if actual tab
    chrome.tabs.get(activeTab, (t) => {
      if (t) {
        sendMessageTab(activeTab, { type: "stop-recording-tab" });
      } else {
        sendMessageTab(tab.id, { type: "stop-recording-tab" });
        chrome.storage.local.set({ activeTab: tab.id });
      }
    });
  } else {
    const { accessTokenValue } = await chrome.storage.local.get([
      "accessTokenValue",
    ]);
    if (!accessTokenValue) {
      await chrome.tabs.create({
        url: `${getFrontendBaseEndpoint()}/extension-auth`,
      });
    } else if (CheckTokenExpiry(accessTokenValue)) {
      // Clear access token and open auth page
      await chrome.storage.local.set({ accessTokenValue: null });
      await chrome.tabs.create({
        url: `${getFrontendBaseEndpoint()}/extension-auth`,
      });
    }

    // Check if it's possible to inject into content (not a chrome:// page, new tab, etc)
    if (
      !(
        (navigator.onLine === false &&
          !tab.url.includes("/playground.html") &&
          !tab.url.includes("/setup.html")) ||
        tab.url.startsWith("chrome://") ||
        (tab.url.startsWith("chrome-extension://") &&
          !tab.url.includes("/playground.html") &&
          !tab.url.includes("/setup.html"))
      ) &&
      !tab.url.includes("chrome.google.com/webstore") &&
      !tab.url.includes("chromewebstore.google.com")
    ) {
      sendMessageTab(tab.id, { type: "toggle-popup" });
      chrome.storage.local.set({ activeTab: tab.id });
    } else {
      chrome.tabs
        .create({
          url: "playground.html",
          active: true,
        })
        .then((tab) => {
          chrome.storage.local.set({ activeTab: tab.id });
        });
    }
  }

  const { firstTime } = await chrome.storage.local.get(["firstTime"]);

  if (
    firstTime &&
    (tab.url.includes(chrome.runtime.getURL("setup.html")) ||
      tab.url.includes(`${getFrontendBaseEndpoint()}/extension-auth`))
  ) {
    chrome.storage.local.set({ firstTime: false });
    // Send message to active tab
    const activeTab = await getCurrentTab();
    sendMessageTab(activeTab.id, { type: "setup-complete" });
  }
};

// Check when action button is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await onClickAction(tab);
});

const restartActiveTab = async () => {
  const activeTab = await getCurrentTab();
  sendMessageTab(activeTab.id, { type: "ready-to-record" });
};

const getStreamingData = async () => {
  const {
    micActive,
    defaultAudioInput,
    defaultAudioOutput,
    defaultVideoInput,
    systemAudio,
    recordingType,
  } = await chrome.storage.local.get([
    "micActive",
    "defaultAudioInput",
    "defaultAudioOutput",
    "defaultVideoInput",
    "systemAudio",
    "recordingType",
  ]);

  return {
    micActive,
    defaultAudioInput,
    defaultAudioOutput,
    defaultVideoInput,
    systemAudio,
    recordingType,
  };
};

const openPlaygroundTab = async () => {
  const activeTab = await getCurrentTab();

  // If the active tab is already the playground, do nothing - Clears the bug where playground is opened continuously
  if (activeTab.url.includes("playground.html")) {
    return;
  }

  chrome.tabs
    .create({
      url: "playground.html",
      active: true,
    })
    .then((tab) => {
      chrome.storage.local.set({ activeTab: tab.id });
    });
};

const handleDismiss = async () => {
  chrome.storage.local.set({ restarting: true });
  const { region } = await chrome.storage.local.get(["region"]);
  // Check if wasRegion is set
  const { wasRegion } = await chrome.storage.local.get(["wasRegion"]);
  if (wasRegion) {
    chrome.storage.local.set({ wasRegion: false, region: true });
  }
  chrome.action.setIcon({ path: "assets/icon-34.png" });
};

const handleRestart = async () => {
  chrome.storage.local.set({ restarting: true });
  let editor_url = "editor.html";

  // Check if Chrome version is 109 or below
  if (navigator.userAgent.includes("Chrome/")) {
    const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
    if (version <= 109) {
      editor_url = "editorfallback.html";
    }
  }

  resetActiveTabRestart();
};

const sendMessageRecord = async (message) => {
  // Send a message to the recording tab or offscreen recording document, depending on which was created
  chrome.storage.local.get(["recordingTab", "offscreen"], (result) => {
    if (result.offscreen) {
      chrome.runtime.sendMessage(message);
    } else {
      // Get the recording tab first before sending the message
      sendMessageTab(result.recordingTab, message);
    }
  });
};

const initBackup = async (request, id) => {
  const { backupTab } = await chrome.storage.local.get(["backupTab"]);
  const backupURL = chrome.runtime.getURL("backup.html");

  if (backupTab) {
    chrome.tabs.get(backupTab, (tab) => {
      if (tab) {
        sendMessageTab(tab.id, {
          type: "init-backup",
          request: request,
          tabId: id,
        });
      } else {
        chrome.tabs.create(
          {
            url: backupURL,
            active: true,
            pinned: true,
            index: 0,
          },
          (tab) => {
            chrome.storage.local.set({ backupTab: tab.id });
            chrome.tabs.onUpdated.addListener(function _(
              tabId,
              changeInfo,
              updatedTab
            ) {
              // Check if recorder tab has finished loading
              if (tabId === tab.id && changeInfo.status === "complete") {
                sendMessageTab(tab.id, {
                  type: "init-backup",
                  request: request,
                  tabId: id,
                });
                chrome.tabs.onUpdated.removeListener(_);
              }
            });
          }
        );
      }
    });
  } else {
    chrome.tabs.create(
      {
        url: backupURL,
        active: true,
        pinned: true,
        index: 0,
      },
      (tab) => {
        chrome.storage.local.set({ backupTab: tab.id });
        chrome.tabs.onUpdated.addListener(function _(
          tabId,
          changeInfo,
          updatedTab
        ) {
          // Check if recorder tab has finished loading
          if (tabId === tab.id && changeInfo.status === "complete") {
            sendMessageTab(tab.id, {
              type: "init-backup",
              request: request,
              tabId: id,
            });
            chrome.tabs.onUpdated.removeListener(_);
          }
        });
      }
    );
  }
};

const offscreenDocument = async (request, tabId = null) => {
  const { backup } = await chrome.storage.local.get(["backup"]);
  let activeTab = await getCurrentTab();
  if (tabId !== null) {
    activeTab = await chrome.tabs.get(tabId);
  }
  chrome.storage.local.set({
    activeTab: activeTab.id,
    tabRecordedID: null,
    memoryError: false,
  });

  // Check activeTab URL
  if (activeTab.url.includes(chrome.runtime.getURL("playground.html"))) {
    chrome.storage.local.set({ tabPreferred: true });
  } else {
    chrome.storage.local.set({ tabPreferred: false });
  }

  // Close all offscreen documents (if chrome.offscreen is available)
  try {
    const existingContexts = await chrome.runtime.getContexts({});
    const offscreenDocument = existingContexts.find(
      (c) => c.contextType === "OFFSCREEN_DOCUMENT"
    );
    if (offscreenDocument) {
      await chrome.offscreen.closeDocument();
    }
  } catch (error) { }

  if (request.region) {
    if (tabId !== null) {
      // Navigate to the tab
      chrome.tabs.update(tabId, { active: true });
    }
    chrome.storage.local.set({
      recordingTab: activeTab.id,
      offscreen: false,
      region: true,
    });

    if (request.customRegion) {
      sendMessageRecord({
        type: "loaded",
        request: request,
        backup: backup,
        region: true,
      });
    } else {
      try {
        // This is following the steps from this page, but it still doesn't work :( https://developer.chrome.com/docs/extensions/mv3/screen_capture/#audio-and-video-offscreen-doc
        throw new Error("Exit offscreen recording");
        const existingContexts = await chrome.runtime.getContexts({});

        const offDocument = existingContexts.find(
          (c) => c.contextType === "OFFSCREEN_DOCUMENT"
        );

        if (offDocument) {
          // If an offscreen document is already open, close it.
          await chrome.offscreen.closeDocument();
        }

        // Create an offscreen document.
        await chrome.offscreen.createDocument({
          url: "recorderoffscreen.html",
          reasons: ["USER_MEDIA", "AUDIO_PLAYBACK", "DISPLAY_MEDIA"],
          justification:
            "Recording from getDisplayMedia API and tabCapture API",
        });

        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: activeTab.id,
        });

        chrome.storage.local.set({
          recordingTab: null,
          offscreen: true,
          region: false,
          wasRegion: true,
        });
        sendMessageRecord({
          type: "loaded",
          request: request,
          isTab: true,
          tabID: streamId,
        });
      } catch (error) {
        // Open the recorder.html page as a normal tab.
        chrome.tabs
          .create({
            url: "recorder.html",
            pinned: true,
            index: 0,
            active: activeTab.url.includes(
              chrome.runtime.getURL("playground.html")
            )
              ? true
              : false,
          })
          .then((tab) => {
            chrome.storage.local.set({
              recordingTab: tab.id,
              offscreen: false,
              region: false,
              wasRegion: true,
              tabRecordedID: activeTab.id,
            });
            chrome.tabs.onUpdated.addListener(function _(
              tabId,
              changeInfo,
              updatedTab
            ) {
              // Check if recorder tab has finished loading
              if (tabId === tab.id && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(_);
                sendMessageRecord({
                  type: "loaded",
                  request: request,
                  tabID: activeTab.id,
                  backup: backup,
                  isTab: true,
                });
              }
            });
          });
      }
    }
  } else {
    try {
      if (!request.offscreenRecording || request.camera) {
        throw new Error("Exit offscreen recording");
      }

      if (tabId !== null) {
        // Navigate to the tab
        chrome.tabs.update(tabId, { active: true });
      }

      let { qualityValue } = await chrome.storage.local.get(["qualityValue"]);
      // Consider 720p as the lowest possible quality
      if (!qualityValue) {
        qualityValue = "1080p";
      } else if (
        qualityValue === "480p" ||
        qualityValue === "360p" ||
        qualityValue === "240p"
      ) {
        qualityValue = "720p";
      }
      const { fpsValue } = await chrome.storage.local.get(["fpsValue"]);

      // also add && !request.camera above if works
      const existingContexts = await chrome.runtime.getContexts({});

      const offDocument = existingContexts.find(
        (c) => c.contextType === "OFFSCREEN_DOCUMENT"
      );

      if (offDocument) {
        // If an offscreen document is already open, close it.
        await chrome.offscreen.closeDocument();
      }
      // Create an offscreen document.
      await chrome.offscreen.createDocument({
        url: "recorderoffscreen.html",
        reasons: ["USER_MEDIA", "AUDIO_PLAYBACK", "DISPLAY_MEDIA"],
        justification: "Recording from getDisplayMedia API",
      });

      chrome.storage.local.set({
        recordingTab: null,
        offscreen: true,
        region: false,
        wasRegion: false,
      });
      sendMessageRecord({
        type: "loaded",
        request: request,
        isTab: false,
        quality: qualityValue,
        fps: fpsValue,
        backup: backup,
      });
    } catch (error) {
      // Open the recorder.html page as a normal tab.
      let switchTab = true;
      if (request.camera) {
        switchTab = false;
      }
      chrome.tabs
        .create({
          url: "recorder.html",
          pinned: true,
          index: 0,
          active: switchTab,
        })
        .then((tab) => {
          chrome.storage.local.set({
            recordingTab: tab.id,
            offscreen: false,
            region: false,
            wasRegion: false,
          });
          chrome.tabs.onUpdated.addListener(function _(
            tabId,
            changeInfo,
            updatedTab
          ) {
            // Check if recorder tab has finished loading
            if (tabId === tab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(_);
              sendMessageRecord({
                type: "loaded",
                request: request,
                backup: backup,
              });
            }
          });
        });
    }
  }
};

const savedToDrive = async () => {
  const { sandboxTab } = await chrome.storage.local.get(["sandboxTab"]);
  sendMessageTab(sandboxTab, { type: "saved-to-drive" });
};

const discardOffscreenDocuments = async () => {
  // Try doing (maybe offscreen isn't available)
  try {
    const existingContexts = await chrome.runtime.getContexts({});
    const offscreenDocument = existingContexts.find(
      (c) => c.contextType === "OFFSCREEN_DOCUMENT"
    );
    if (offscreenDocument) {
      await chrome.offscreen.closeDocument();
    }
  } catch (error) { }
};

const executeScripts = async () => {
  const contentScripts = chrome.runtime.getManifest().content_scripts;
  const tabQueries = contentScripts.map((cs) =>
    chrome.tabs.query({ url: cs.matches })
  );
  const tabResults = await Promise.all(tabQueries);

  const executeScriptPromises = [];
  for (let i = 0; i < tabResults.length; i++) {
    const tabs = tabResults[i];
    const cs = contentScripts[i];

    for (const tab of tabs) {
      const executeScriptPromise = chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: cs.js,
        },
        () => chrome.runtime.lastError
      );
      executeScriptPromises.push(executeScriptPromise);
    }
  }

  await Promise.all(executeScriptPromises);
};

// On first install open ExtensionAuthPage
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Clear storage
    chrome.storage.local.clear();

    const locale = chrome.i18n.getMessage("@@ui_locale");
    chrome.storage.local.set({ firstTime: true });
    chrome.tabs.create({
      url: `${getFrontendBaseEndpoint()}/extension-auth`,
    });
  } else if (details.reason === "update") {
    if (details.previousVersion === "2.8.6") {
      // Clear storage
      chrome.storage.local.clear();
      chrome.storage.local.set({ updatingFromOld: true });
    } else {
      chrome.storage.local.set({ updatingFromOld: false });
    }
  }
  // Check chrome version, if 109 or below, disable backups
  if (navigator.userAgent.includes("Chrome/")) {
    const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
    if (version <= 109) {
      chrome.storage.local.set({ backup: false });
    }
  }

  chrome.storage.local.set({ systemAudio: true });

  // Check if the backup tab is open, if so close it
  const { backupTab } = await chrome.storage.local.get(["backupTab"]);
  if (backupTab) {
    removeTab(backupTab);
  }

  executeScripts();
});

// Detect if recordingTab is closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // Check if region recording
  const { region } = await chrome.storage.local.get(["region"]);

  if (region) return;
  const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
  const { recording } = await chrome.storage.local.get(["recording"]);
  const { restarting } = await chrome.storage.local.get(["restarting"]);

  if (tabId === recordingTab && !restarting) {
    chrome.storage.local.set({ recordingTab: null });
    // Send a message to active tab
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);

    try {
      if (recording) {
        focusTab(activeTab);
      }
      sendMessageTab(activeTab, { type: "stop-recording-tab" }, null, () => {
        // Tab doesn't exist, so just set activeTab to null
        sendMessageTab(tabId, { type: "stop-recording-tab" });
        chrome.storage.local.set({ activeTab: tabId });
      });
    } catch (error) {
      sendMessageTab(tabId, { type: "stop-recording-tab" });
      chrome.storage.local.set({ activeTab: tabId });
    }

    // Update icon
    chrome.action.setIcon({ path: "assets/icon-34.png" });
  }
});

const discardRecording = async () => {
  sendMessageRecord({ type: "dismiss-recording" });
  chrome.action.setIcon({ path: "assets/icon-34.png" });
  discardOffscreenDocuments();
  chrome.storage.local.set({
    recordingTab: null,
    sandboxTab: null,
    recording: false,
  });
  chrome.runtime.sendMessage({ type: "discard-backup" });
};

// Check if still (actually) recording by looking at recordingTab or offscreen document
const checkRecording = async () => {
  const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
  const { offscreen } = await chrome.storage.local.get(["offscreen"]);
  if (recordingTab && !offscreen) {
    try {
      chrome.tabs.get(recordingTab, (tab) => {
        if (!tab) {
          discardRecording();
        }
      });
    } catch (error) {
      discardRecording();
    }
  } else if (offscreen) {
    const existingContexts = await chrome.runtime.getContexts({});
    const offDocument = existingContexts.find(
      (c) => c.contextType === "OFFSCREEN_DOCUMENT"
    );
    if (!offDocument) {
      discardRecording();
    }
  }
};

const newSandboxPageRestart = async () => {
  resetActiveTabRestart();
};

const isPinned = (sendResponse) => {
  chrome.action.getUserSettings().then((userSettings) => {
    sendResponse({ pinned: userSettings.isOnToolbar });
  });
};

const requestDownload = async (base64, title) => {
  // Open a new tab to get URL
  chrome.tabs.create(
    {
      url: "download.html",
      active: false,
    },
    (tab) => {
      chrome.tabs.onUpdated.addListener(function _(
        tabId,
        changeInfo,
        updatedTab
      ) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(_);
          sendMessageTab(tab.id, {
            type: "download-video",
            base64: base64,
            title: title,
          });
        }
      });
    }
  );
};

const downloadIndexedDB = async () => {
  // Open a new tab to get URL
  chrome.tabs.create(
    {
      url: "download.html",
      active: false,
    },
    (tab) => {
      chrome.tabs.onUpdated.addListener(function _(
        tabId,
        changeInfo,
        updatedTab
      ) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(_);
          sendMessageTab(tab.id, {
            type: "download-indexed-db",
          });
        }
      });
    }
  );
};

const getPlatformInfo = (sendResponse) => {
  chrome.runtime.getPlatformInfo((info) => {
    sendResponse(info);
  });
};

const restoreRecording = async () => {
  let editor_url = "editorfallback.html";

  // Check if Chrome version is 109 or below
  if (navigator.userAgent.includes("Chrome/")) {
    const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
    if (version <= 109) {
      editor_url = "editorfallback.html";
    }
  }

  let chunks = [];
  await chunksStore.iterate((value, key) => {
    chunks.push(value);
  });

  if (chunks.length === 0) {
    return;
  }

  chrome.tabs.create(
    {
      url: editor_url,
      active: true,
    },
    (tab) => {
      chrome.tabs
        .update(tab.id, { autoDiscardable: false })
        .then(async (tab) => {
          // Set URL as sandbox tab
          chrome.storage.local.set({ sandboxTab: tab.id });
          // Wait for the tab to be loaded
          await new Promise((resolve) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (info.status === "complete" && tabId === tab.id) {
                sendMessageTab(tab.id, {
                  type: "restore-recording",
                });

                sendChunks();
              }
            });
          });
        });
    }
  );
};

const checkRestore = async (sendResponse) => {
  const chunks = [];
  await chunksStore.iterate((value, key) => {
    chunks.push(value);
  });

  if (chunks.length === 0) {
    sendResponse({ restore: false, chunks: [] });
    return;
  }
  sendResponse({ restore: true });
};

const base64ToUint8Array = (base64) => {
  const dataUrlRegex = /^data:(.*?);base64,/;
  const matches = base64.match(dataUrlRegex);
  if (matches !== null) {
    // Base64 is a data URL
    const mimeType = matches[1];
    const binaryString = atob(base64.slice(matches[0].length));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } else {
    // Base64 is a regular string
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: "video/webm" });
  }
};

const desktopCapture = async (request) => {
  const { backup } = await chrome.storage.local.get(["backup"]);
  const { backupSetup } = await chrome.storage.local.get(["backupSetup"]);
  chrome.storage.local.set({ sendingChunks: false });
  if (backup) {
    if (!backupSetup) {
      localDirectoryStore.clear();
    }

    let activeTab = await getCurrentTab();
    initBackup(request, activeTab.id);
  } else {
    offscreenDocument(request);
  }
};

const writeFile = async (request) => {
  // Need to add safety check here to make sure the tab is still open
  const { backupTab } = await chrome.storage.local.get(["backupTab"]);

  if (backupTab) {
    sendMessageTab(
      backupTab,
      {
        type: "write-file",
        index: request.index,
      },
      null,
      () => {
        sendMessageRecord({ type: "stop-recording-tab" });
      }
    );
  } else {
    sendMessageRecord({ type: "stop-recording-tab" });
  }
};

const videoReady = async () => {
  const { backupTab } = await chrome.storage.local.get(["backupTab"]);
  if (backupTab) {
    sendMessageTab(backupTab, { type: "close-writable" });
  }
  stopRecording();
};

const newChunk = async (request) => {
  const { sandboxTab } = await chrome.storage.local.get(["sandboxTab"]);
  sendMessageTab(sandboxTab, {
    type: "new-chunk-tab",
    chunk: request.chunk,
    index: request.index,
  });

  sendResponse({ status: "ok" });
};

const handleGetStreamingData = async () => {
  const data = await getStreamingData();
  sendMessageRecord({ type: "streaming-data", data: JSON.stringify(data) });
};

const cancelRecording = async () => {
  chrome.action.setIcon({ path: "assets/icon-34.png" });
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);
  sendMessageTab(activeTab, { type: "stop-pending" });
  focusTab(activeTab);
  discardOffscreenDocuments();
};

const handleStopRecordingTab = async (request) => {
  if (request.memoryError) {
    chrome.storage.local.set({
      recording: false,
      restarting: false,
      tabRecordedID: null,
      memoryError: true,
    });
  }
  sendMessageRecord({ type: "stop-recording-tab" });
};

const handleRestartRecordingTab = async () => {
  //removeSandbox();
};

const handleDismissRecordingTab = async () => {
  chrome.runtime.sendMessage({ type: "discard-backup" });
  discardRecording();
};

const setMicActiveTab = async (request) => {
  chrome.storage.local.get(["region"], (result) => {
    if (result.region) {
      sendMessageRecord({
        type: "set-mic-active-tab",
        active: request.active,
        defaultAudioInput: request.defaultAudioInput,
      });
    }
  });
};

const handleRecordingError = async (request) => {
  // get actual active tab
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);

  sendMessageRecord({ type: "recording-error" }).then(() => {
    sendMessageTab(activeTab, { type: "stop-pending" });
    focusTab(activeTab);
    if (request.error === "stream-error") {
      sendMessageTab(activeTab, { type: "stream-error", why: request.why });
    } else if (request.error === "backup-error") {
      sendMessageTab(activeTab, { type: "backup-error" });
    }
  });

  // Close recording tab
  const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
  const { region } = await chrome.storage.local.get(["region"]);
  // Check if tab exists (with tab api)
  if (recordingTab && !region) {
    removeTab(recordingTab);
  }
  chrome.storage.local.set({ recordingTab: null });
  discardOffscreenDocuments();
};

const handleOnGetPermissions = async (request) => {
  // Send a message to (actual) active tab
  const activeTab = await getCurrentTab();
  if (activeTab) {
    sendMessageTab(activeTab.id, {
      type: "on-get-permissions",
      data: request,
    });
  }
};

const handleRecordingComplete = async () => {
  // Close the recording tab
  const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);

  // Check if tab exists (with tab api)
  if (recordingTab) {
    chrome.tabs.get(recordingTab, (tab) => {
      if (tab) {
        // Check if tab url contains chrome-extension and recorder.html
        if (
          tab.url.includes("chrome-extension") &&
          tab.url.includes("recorder.html")
        ) {
          removeTab(recordingTab);
        }
      }
    });
  }
};

const setSurface = async (request) => {
  chrome.storage.local.set({
    surface: request.surface,
  });

  const { activeTab } = await chrome.storage.local.get(["activeTab"]);
  sendMessageTab(activeTab, {
    type: "set-surface",
    surface: request.surface,
  });
};

const handlePip = async (started = false) => {
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);
  if (started) {
    sendMessageTab(activeTab, { type: "pip-started" });
  } else {
    sendMessageTab(activeTab, { type: "pip-ended" });
  }
};

const handleStopRecordingTabBackup = async (request) => {
  chrome.storage.local.set({
    recording: false,
    restarting: false,
    tabRecordedID: null,
    memoryError: true,
  });
  sendMessageRecord({ type: "stop-recording-tab" });

  // Get active tab
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);
  // Check if actual tab
  sendMessageTab(activeTab, { type: "stop-pending" });
  focusTab(activeTab);
};

const clearAllRecordings = async () => {
  chunksStore.clear();
};

const resizeWindow = async (width, height) => {
  if (width === 0 || height === 0) {
    return;
  }

  chrome.windows.getCurrent((window) => {
    chrome.windows.update(window.id, {
      width: width,
      height: height,
    });
  });
};

const checkAvailableMemory = (sendResponse) => {
  navigator.storage.estimate().then((data) => {
    sendResponse({ data: data });
  });
};

const storeClickData = async (request) => {
  console.log(request);
  // Don't store clicks if it is for pausing, resuming or stopping from toolbar
  /**
   * Handling resume -> isPaused is false, so this case will be taken care of in the condition where we are not storing clicks when isPaused is true
   * Handling stop -> We can simply remove the last timestamp, but in the case of stopping from the `STOP SHARING` button given by chrome, we will lose the intentional clickData
   * Handling pause -> Have to figure out.
   *
   *
   * BETTER WAY: To not consider any clickData from toolbar
   */
  const isToolbarClick = request.data.isToolbarClick;
  if (isToolbarClick) {
    console.log("Click from toolbar, not storing click data");
    return;
  }

  // Don't store clicks if the recording is paused
  const { isPaused } = await chrome.storage.local.get(["isPaused"]); // -> This also handles not storing resume click in toolbar because isPaused is true.
  if (isPaused) {
    console.log("Recording is paused, not storing click data");
    return;
  }

  console.log("Storing click data", request.data);
  await storeScreenData(request);

  if (request.data.x == 0 && request.data.y == 0) {
    return;
  }

  const { recordingStartTime } = await chrome.storage.local.get([
    "recordingStartTime",
  ]);

  // Only store the click data after recording started
  if (Number(recordingStartTime) > Number(request.data.timestamp)) {
    return;
  }

  const newClickPoint = {
    x: request.data.x,
    y: request.data.y,
    timestamp: request.data.timestamp,
  };

  // Get existing click data
  let allClicks = await getClickData();

  // Append to existing click data
  if (allClicks) {
    // Only append if last click timestamp is less than current click timestamp. Return if not
    if (
      allClicks.length > 0 &&
      allClicks[allClicks.length - 1].timestamp >
      newClickPoint.timestamp
    ) {
      return;
    }

    allClicks.push(newClickPoint);
    await clicksStore.setItem("clickData", allClicks);
  } else {
    allClicks = [newClickPoint];
    await clicksStore.setItem("clickData", allClicks);
  }

  // Store in chrome.storage.local
  await chrome.storage.local.set({
    clickData: allClicks,
  });
};

const storeScreenData = async (request) => {
  if (request.data.screenHeight !== 0) {
    screenSizes.screenHeight = request.data.screenHeight;
  }
  if (request.data.screenWidth !== 0) {
    screenSizes.screenWidth = request.data.screenWidth;
  }
  if (request.data.viewportHeight !== 0) {
    screenSizes.viewportHeight = request.data.viewportHeight;
  }
  if (request.data.viewportWidth !== 0) {
    screenSizes.viewportWidth = request.data.viewportWidth;
  }
};

const storeAllClickData = async (request) => {
  const { recordingStartTime } = await chrome.storage.local.get([
    "recordingStartTime",
  ]);
};

const checkAvailableCredits = async (sendResponse) => {
  const { accessTokenValue } = await chrome.storage.local.get([
    "accessTokenValue",
  ]);
  if (!accessTokenValue) {
    sendResponse({ creditsExhausted: true });
  } else {
    const credits = await CheckUserCredits(accessTokenValue);
    if (credits <= 0) {
      sendResponse({ creditsExhausted: true });
    } else {
      sendResponse({ creditsExhausted: false });
    }
  }
};

const handlePauseRecording = async (request) => {
  console.log("Clicked pause at " + Date.now());
  // Store all the pauses

  const newPause = {
    startTime: Date.now(),
  };

  let allPauses = await getPauseData();

  if (allPauses) {
    allPauses.push(newPause);
    await pauseStore.setItem("pauseData", allPauses);
  } else {
    allPauses = [newPause];
    await pauseStore.setItem("pauseData", allPauses);
  }

  // Store in chrome.storage.local
  await chrome.storage.local.set({
    pauseData: allPauses,
    isPaused: true,
    pauseStartTime: Date.now()
  });

  // Notify all tabs about the pause
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: "recording-paused",
      pauseStartTime: Date.now(),
      allPauses: allPauses
    }).catch(() => {
      // Ignore errors for tabs that can't receive messages
      console.log("Could not send pause message to tab:", tab.id);
    });
  });
};

const handleResumeRecording = async (request) => {
  console.log("Clicked resume at " + Date.now());
  // Get all the pauses
  const allPauses = await getPauseData();

  if (!allPauses || allPauses.length === 0) {
    console.error("No pauses found to add end time");
    return;
  }

  const resumeTime = Date.now();
  allPauses[allPauses.length - 1].endTime = resumeTime;
  await pauseStore.setItem("pauseData", allPauses);

  // Calculate total pause time
  let totalPauseTime = 0;
  for (const pause of allPauses) {
    if (pause.endTime) {
      totalPauseTime += (pause.endTime - pause.startTime) / 1000;
    }
  }

  // Store in chrome.storage.local
  await chrome.storage.local.set({
    pauseData: allPauses,
    isPaused: false,
    pauseStartTime: null,
    totalPauseTime: totalPauseTime
  });

  // Notify all tabs about the resume
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "recording-resumed",
        resumeTime: resumeTime,
        totalPauseTime: totalPauseTime,
        allPauses: allPauses
      });
    } catch (err) {
      // Ignore errors for tabs that can't receive messages
      console.log("Could not send resume message to tab:", tab.id);
    }
  }

  // Send message to recorder
  sendMessageRecord({ type: "resume-recording-tab" });
};

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "desktop-capture") {
    desktopCapture(request);
  } else if (request.type === "backup-created") {
    offscreenDocument(request.request, request.tabId);
  } else if (request.type === "write-file") {
    writeFile(request);
  } else if (request.type === "handle-restart") {
    handleRestart();
  } else if (request.type === "handle-dismiss") {
    handleDismiss();
  } else if (request.type === "reset-active-tab") {
    resetActiveTab();
  } else if (request.type === "reset-active-tab-restart") {
    resetActiveTabRestart();
  } else if (request.type === "start-rec") {
    startRecording();
  } else if (request.type === "video-ready") {
    videoReady();
  } else if (request.type === "start-recording") {
    startRecording();
  } else if (request.type === "restarted") {
    restartActiveTab();
  } else if (request.type === "new-chunk") {
    newChunk(request);
    return true;
  } else if (request.type === "get-streaming-data") {
    handleGetStreamingData();
  } else if (request.type === "cancel-recording") {
    cancelRecording();
  } else if (request.type === "stop-recording-tab") {
    handleStopRecordingTab(request);
  } else if (request.type === "restart-recording-tab") {
    handleRestartRecordingTab();
  } else if (request.type === "dismiss-recording-tab") {
    handleDismissRecordingTab();
  } else if (request.type === "pause-recording-tab") {
    handlePauseRecording(request);
    sendMessageRecord({ type: "pause-recording-tab" });
  } else if (request.type === "resume-recording-tab") {
    handleResumeRecording(request);
    sendMessageRecord({ type: "resume-recording-tab" });
  } else if (request.type === "set-mic-active-tab") {
    setMicActiveTab(request);
  } else if (request.type === "recording-error") {
    console.log(request);
    handleRecordingError(request);
  } else if (request.type === "on-get-permissions") {
    handleOnGetPermissions(request);
  } else if (request.type === "recording-complete") {
    handleRecordingComplete();
  } else if (request.type === "check-recording") {
    checkRecording();
  } else if (request.type === "follow-twitter") {
    createTab("https://twitter.com/TrupeerAI/", false, true);
  } else if (request.type === "open-processing-info") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "upgrade-info") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "trim-info") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "join-waitlist") {
    createTab("https://www.twitter.com/TrupeerAI", false, true);
  } else if (request.type === "chrome-update-info") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "set-surface") {
    setSurface(request);
  } else if (request.type === "pip-ended") {
    handlePip(false);
  } else if (request.type === "pip-started") {
    handlePip(true);
  } else if (request.type === "new-sandbox-page-restart") {
    newSandboxPageRestart();
  } else if (request.type === "open-help") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "memory-limit-help") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "open-home") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "report-bug") {
    createTab("https://www.trupeer.ai/", false, true);
  } else if (request.type === "clear-recordings") {
    clearAllRecordings();
  } else if (request.type === "force-processing") {
    forceProcessing();
  } else if (request.type === "focus-this-tab") {
    focusTab(sender.tab.id);
  } else if (request.type === "stop-recording-tab-backup") {
    handleStopRecordingTabBackup(request);
  } else if (request.type === "indexed-db-download") {
    downloadIndexedDB();
  } else if (request.type === "get-platform-info") {
    getPlatformInfo(sendResponse);
    return true;
  } else if (request.type === "restore-recording") {
    restoreRecording();
  } else if (request.type === "check-restore") {
    checkRestore(sendResponse);
    return true;
  } else if (request.type === "check-capture-permissions") {
    chrome.permissions.contains(
      {
        permissions: ["desktopCapture", "offscreen"],
      },
      (result) => {
        if (!result) {
          chrome.permissions.request(
            {
              permissions: ["desktopCapture", "offscreen"],
            },
            (granted) => {
              if (!granted) {
                sendResponse({ status: "error" });
              } else {
                // addAlarmListener();
                sendResponse({ status: "ok" });
              }
            }
          );
        } else {
          sendResponse({ status: "ok" });
        }
      }
    );
    return true;
  } else if (request.type === "is-pinned") {
    isPinned(sendResponse);
    return true;
  } else if (request.type === "request-download") {
    requestDownload(request.base64, request.title);
  } else if (request.type === "resize-window") {
    resizeWindow(request.width, request.height);
  } else if (request.type === "available-memory") {
    checkAvailableMemory(sendResponse);
    return true;
  } else if (request.type === "extension-media-permissions") {
    createTab(
      "chrome://settings/content/siteDetails?site=chrome-extension://" +
      chrome.runtime.id,
      false,
      true
    );
  } else if (request.type === "click-event") {
    storeClickData(request);
  } else if (request.type === "click-events") {
    storeAllClickData(request);
  } else if (request.type === "screen-event") {
    storeScreenData(request);
  } else if (request.type === "check-user-credits") {
    checkAvailableCredits(sendResponse);
    return true;
  } else if (request.type == "open-playground") {
    openPlaygroundTab();
  }
});

chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.message === "logout") {
      chrome.storage.local.set({ accessTokenValue: "", userInfo: null });
      sendResponse({ success: true, message: "Logout from extension" });
    }
    if (request.accessToken && request.userInfo) {
      chrome.storage.local.set({
        accessTokenValue: request.accessToken,
        userInfo: request.userInfo,
      });
      sendResponse({ success: true, message: "Token has been received" });
    }
    if (request.openExtension) {
      if (sender.tab) {
        onClickAction(sender.tab);
      }
    }
  }
);

// self.addEventListener("message", (event) => {
//   handleMessage(event.data);
// });