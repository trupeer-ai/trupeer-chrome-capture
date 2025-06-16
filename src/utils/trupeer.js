import { getBackendBaseEndpoint, getFrontendBaseEndpoint } from "./constants";
import fixWebmDuration from "fix-webm-duration";
import { default as fixWebmDurationFallback } from "webm-duration-fix";

const uploadV2APIEndpoint = `${getBackendBaseEndpoint()}/bot/workflow/create`;
const updateVideoUploadStatusAPIEndpoint = `${getBackendBaseEndpoint()}/bot/workflow/upload/confirm`;
const appExtensionImportUrl = `${getFrontendBaseEndpoint()}/content/recording`;

const convertBlobToBase64 = async (videoBlob) => {
    // Convert blob to base64 for transfer
    const reader = new FileReader();
    const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });
    reader.readAsDataURL(videoBlob);
    const base64Data = await base64Promise;

    // Remove codec from base64Data
    const base64DataWithoutCodec = base64Data.split('base64,')[1];
    const base64DataWithCodec = `data:video/webm;base64,${base64DataWithoutCodec}`;

    return base64DataWithCodec;
}

export const fixWebMDuration = async (videoBlob, recordingDuration) => {
    if (!videoBlob) {
        throw new Error("No video blob provided");
    }
    if (!recordingDuration) {
        throw new Error("No recording duration provided");
    }

    // Check if user is in Windows 10
    const isWindows10 = navigator.userAgent.match(/Windows NT 10.0/);

    try {
        let fixedWebm = videoBlob;
        if (recordingDuration > 0) {
            if (!isWindows10) {
                // Use primary duration fix method
                fixedWebm = await new Promise((resolve, reject) => {
                    fixWebmDuration(
                        videoBlob,
                        recordingDuration,
                        (fixed) => resolve(fixed),
                        { logger: false }
                    );
                });
            } else {
                // Use fallback method for Windows 10
                fixedWebm = await fixWebmDurationFallback(videoBlob, {
                    type: "video/webm; codecs=vp8, opus",
                });
            }
        }
        return fixedWebm;
    } catch (error) {
        console.error("Error fixing WebM duration:", error);
        throw new Error(`Failed to fix WebM duration: ${error.message}`);
    }
};

export const createAgent = async (videoBlob, clickData, screenSizes, inputlanguageCode, accessTokenValue) => {
    console.log("Inside createAgent", videoBlob, clickData, screenSizes, inputlanguageCode, accessTokenValue);
    if (!videoBlob) {
        throw new Error("No video file provided");
    }

    const videoSize = videoBlob.size;
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
            // Check specifically for 402 Payment Required status
            if (response.status === 402) {
                throw new Error("PAYMENT_REQUIRED");
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Failed to create agent: ${errorData.message || response.statusText}`
            );
        }

        const { data } = await response.json();
        const agentId = data.agentId;
        const writeURL = data.writeURL;

        if (!agentId || !writeURL) {
            throw new Error("Invalid response data from server");
        }

        return { agentId, writeURL };
    } catch (error) {
        console.error("Error creating agent:", error);
        throw error;
    }
}

export const sendVideoToApp = async (videoBlob, agentId) => {
    console.log("Inside sendVideoToApp", videoBlob, agentId);
    // Encode metadata for URL
    const uploadUrl = `${appExtensionImportUrl}?agentId=${agentId}`;

    // Create tab and wait for it to load
    const tab = await chrome.tabs.create({ url: uploadUrl });

    return new Promise((resolve, reject) => {
        // Listen for message from the app
        console.log("Setting up message listener for agentId:", agentId);
        chrome.runtime.onMessageExternal.addListener(function messageListener(message, sender, sendResponse) {
            console.log("Received external message:", message);
            if (message.type === 'CACHE_INSERTION_COMPLETE' && message.data.agentID === agentId) {
                console.log("Cache insertion complete", message);
                // Remove the listener to avoid memory leaks
                chrome.runtime.onMessageExternal.removeListener(messageListener);
                sendResponse({ success: true });  // Send response back to the webpage
                resolve(true);
            }
            return true;  // Keep the message channel open
        });

        // Inject content script after tab is loaded
        chrome.tabs.onUpdated.addListener(async function listener(tabId, info) {
            if (info.status === 'complete' && tabId === tab.id) {
                const base64DataWithCodec = await convertBlobToBase64(videoBlob);
                // Inject content script
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (videoData) => {
                        // This code runs in the context of the webpage
                        window.postMessage({
                            type: 'EXTENSION_VIDEO_UPLOAD',
                            data: {
                                video: videoData,
                            }
                        }, '*');
                    },
                    args: [base64DataWithCodec]
                });

                chrome.tabs.onUpdated.removeListener(listener);
            }
        });
    });
};

const UpdateVideoUploadStatus = async (agentId, accessTokenValue) => {
    try {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${accessTokenValue}`);
        headers.append("Content-Type", "application/json");

        const response = await fetch(`${updateVideoUploadStatusAPIEndpoint}?agentId=${agentId}`, {
            method: "POST",
            headers: headers,
            cache: "no-store",
        });

        if (!response.ok) {
            // Check specifically for 402 Payment Required status
            if (response.status === 402) {
                throw new Error("PAYMENT_REQUIRED");
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Failed to update video upload status: ${errorData.message || response.statusText}`
            );
        }

        const res_json = await response.json();

        if (res_json && res_json.success === "true") {
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error creating agent:", error);
        throw error;
    }
}

// @DOCUMENTATION: https://learn.microsoft.com/en-us/rest/api/storageservices/put-range
// @DOCUMENTATION: https://learn.microsoft.com/en-us/rest/api/storageservices/specifying-the-range-header-for-file-service-operations
export const uploadFileToAzure = async (agentId, writeURL, videoBlob, accessTokenValue, maxRetries = 3) => {
    console.log("Inside uploadFileToAzure", writeURL, videoBlob);

    const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB chunks
    const totalSize = videoBlob.size;

    const uploadChunkWithRetry = async (chunk, start, attempt = 1) => {
        try {
            const response = await fetch(`${writeURL}&comp=range`, {
                method: "PUT",
                headers: {
                    'Content-Length': chunk.size.toString(),
                    'x-ms-range': `bytes=${start}-${start + chunk.size - 1}`,
                    'x-ms-write': 'update'
                },
                body: chunk
            });

            if (!response.ok) {
                throw new Error(`Failed with status ${response.status}: ${response.statusText}`);
            }

            return true;
        } catch (error) {
            if (attempt <= maxRetries) {
                console.warn(`Retrying chunk (Attempt ${attempt}/${maxRetries})...`, error);
                await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
                return uploadChunkWithRetry(chunk, start, attempt + 1);
            }
            throw error;
        }
    };

    try {
        // Upload all chunks
        for (let offset = 0; offset < totalSize; offset += CHUNK_SIZE) {
            const chunk = videoBlob.slice(offset, Math.min(offset + CHUNK_SIZE, totalSize));
            await uploadChunkWithRetry(chunk, offset);
            console.log(`Uploaded chunk (${offset}-${offset + chunk.size}/${totalSize})`);
        }

        // Update video upload status
        const success = await UpdateVideoUploadStatus(agentId, accessTokenValue);
        if (!success) {
            throw new Error("Failed to update video upload status");
        }

        console.log("Uploaded file to Azure successfully!");
        return true;
    } catch (error) {
        console.error("Final upload failure:", error);
        throw error;
    }
};

const ALL_LANGUAGES_CACHE_KEY = 'allLanguagesCache';
const ALL_LANGUAGES_CACHE_EXPIRE_IN = 24 * 60 * 60 * 1000;

const languageMasterInfo = {
    "en": {
        Name: "English",
        CountryCode: "GB",
        EndingPatterns: [
            ".", "!", "?",
        ],
    },
    "zh": {
        Name: "Chinese",
        CountryCode: "CN",
        EndingPatterns: [
            "。", "！", "？", "…", "⋯",
        ],
    },
    "ja": {
        Name: "Japanese",
        CountryCode: "JP",
        EndingPatterns: [
            "。", "！", "？", "．", "…", "⋯",
        ],
    },
    "ko": {
        Name: "Korean",
        CountryCode: "KR",
        EndingPatterns: [
            ".", "!", "?", "。", "！", "？",
        ],
    },
    "ar": {
        Name: "Arabic",
        CountryCode: "AE",
        EndingPatterns: [
            ".", "!", "؟", "؛", "،",
        ],
    },
    "hi": {
        Name: "Hindi",
        CountryCode: "IN",
        EndingPatterns: [
            "।", "॥", ".", "!", "?",
        ],
    },
    "ta": {
        Name: "Tamil",
        CountryCode: "IN",
        EndingPatterns: [
            ".", "!", "?", "।",
        ],
    },
    "ru": {
        Name: "Russian",
        CountryCode: "RU",
        EndingPatterns: [
            ".", "!", "?", "…",
        ],
    },
    "es": {
        Name: "Spanish",
        CountryCode: "ES",
        EndingPatterns: [
            ".", "!", "?", "¡", "¿",
        ],
    },
    "pt": {
        Name: "Portuguese",
        CountryCode: "PT",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "it": {
        Name: "Italian",
        CountryCode: "IT",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "fr": {
        Name: "French",
        CountryCode: "FR",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "de": {
        Name: "German",
        CountryCode: "DE",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "sv": {
        Name: "Swedish",
        CountryCode: "SE",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "fi": {
        Name: "Finnish",
        CountryCode: "FI",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "nl": {
        Name: "Dutch",
        CountryCode: "NL",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "id": {
        Name: "Indonesian",
        CountryCode: "ID",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "tr": {
        Name: "Turkish",
        CountryCode: "TR",
        EndingPatterns: [
            ".", "!", "?", "...",
        ],
    },
    "pl": { // Polish
        Name: "Polish",
        CountryCode: "PL",
        EndingPatterns: [
            ".", "!", "?", "...", "…",
        ],
    },
}

const StoreHardCodedLanguageList = (languages) => {
    chrome.storage.local.set({
        [ALL_LANGUAGES_CACHE_KEY]: {
            languages: languages,
            timestamp: Date.now()
        }
    });
}

const getLanguageList = () => {
    const languages = [];
    for (const tag in languageMasterInfo) {
        if (Object.prototype.hasOwnProperty.call(languageMasterInfo, tag)) {
            const info = languageMasterInfo[tag];
            languages.push({
                tag: tag,
                name: info.Name,
                countryCode: info.CountryCode,
            });
        }
    }
    // Sort by tag to ensure consistent order
    languages.sort((a, b) => a.tag.localeCompare(b.tag));
    StoreHardCodedLanguageList(languages);
    return languages;
};

const getLanguageListFromCache = async () => {
    const cacheObj = await chrome.storage.local.get([ALL_LANGUAGES_CACHE_KEY]);
    const cache = cacheObj[ALL_LANGUAGES_CACHE_KEY];
    const now = Date.now();
    if (cache && cache.languages && Array.isArray(cache.languages) && cache.timestamp && (now - cache.timestamp < ALL_LANGUAGES_CACHE_EXPIRE_IN)) {
        return cache.languages;
    } else {
        // Remove the cache
        chrome.storage.local.remove(ALL_LANGUAGES_CACHE_KEY);
        return null;
    }
}

export const getAllLanguages = async (accessTokenValue) => {
    if (!accessTokenValue) {
        console.log("No access token value provided");
        return [];
    }

    // Check chrome.storage.local for cached data
    const cache = await getLanguageListFromCache();
    if (cache) {
        return cache;
    }

    try {
        // Fetch from API
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${accessTokenValue}`);
        headers.append("Content-Type", "application/json");

        const response = await fetch(`${getBackendBaseEndpoint()}/admin/languages`, {
            headers: headers,
        });
        const res_json = await response.json();
        if (res_json && Array.isArray(res_json)) {
            // Store in chrome.storage.local
            await chrome.storage.local.set({
                [ALL_LANGUAGES_CACHE_KEY]: {
                    languages: res_json,
                    timestamp: now
                }
            });
            return res_json;
        }
    } catch (error) {
        console.error("Error getting all languages:", error);
    }

    return getLanguageList();
}