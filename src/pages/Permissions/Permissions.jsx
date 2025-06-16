import React, { useEffect, useState, useRef, useCallback } from "react";

const Recorder = () => {
  useEffect(() => {
    window.parent.postMessage(
      {
        type: "trupeer-ai-permissions-loaded",
      },
      "*"
    );
  }, []);

  const checkPermissions = async () => {
    // Individually check the microphone permissions using the Permissions API. Then enumerate devices.
    try {
      const microphonePermission = await navigator.permissions.query({
        name: "microphone",
      });

      microphonePermission.onchange = () => {
        checkPermissions();
      };

      // If the permissions are granted, enumerate devices
      if (
        microphonePermission.state === "granted"
      ) {
        enumerateDevices(true);
      } else {
        // Post message to parent window
        window.parent.postMessage(
          {
            type: "trupeer-ai-permissions",
            success: false,
            error: err.name,
          },
          "*"
        );
        // sendResponse({ success: false, error: err.name });
      }
    } catch (err) {
      enumerateDevices();
    }
  };

  // Enumerate devices
  const enumerateDevices = async (micGranted = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micGranted,
      });

      const devicesInfo = await navigator.mediaDevices.enumerateDevices();

      if (!devicesInfo) {
        console.error("No devices found in enumerateDevices");
        return;
      }

      let audioinput = [];
      let audiooutput = [];

      if (micGranted) {
        // Filter by audio input
        audioinput = devicesInfo
          .filter((device) => device.kind === "audioinput")
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label,
          }));

        // Filter by audio output and extract relevant properties
        audiooutput = devicesInfo
          .filter((device) => device.kind === "audiooutput")
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label,
          }));
      }

      // Save in Chrome local storage
      chrome.storage.local.set({
        // Set available devices
        audioinput: audioinput,
        audiooutput: audiooutput,
        microphonePermission: micGranted,
      });

      // Post message to parent window
      window.parent.postMessage(
        {
          type: "trupeer-ai-permissions",
          success: true,
          audioinput: audioinput,
          audiooutput: audiooutput,
          microphonePermission: micGranted,
        },
        "*"
      );

      //sendResponse({ success: true, audioinput, audiooutput });

      // End the stream
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    } catch (err) {
      // Post message to parent window
      window.parent.postMessage(
        {
          type: "trupeer-ai-permissions",
          success: false,
          error: err.name,
        },
        "*"
      );
      //sendResponse({ success: false, error: err.name });
    }
  };

  const onMessage = (message) => {
    if (message.type === "trupeer-ai-get-permissions") {
      checkPermissions();
    }
  };

  // Post message listener
  useEffect(() => {
    window.addEventListener("message", (event) => {
      onMessage(event.data);
    });
  }, []);

  return <div></div>;
};

export default Recorder;
