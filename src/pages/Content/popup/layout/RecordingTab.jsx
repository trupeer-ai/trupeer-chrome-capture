import React, { useEffect, useState, useContext } from "react";
import * as Tabs from "@radix-ui/react-tabs";

import RecordingType from "./RecordingType";
import {
  ScreenTabOn,
  ScreenTabOff,
  RegionTabOn,
  RegionTabOff,
  MockupTabOn,
  MockupTabOff,
  CameraTabIconOn,
  CameraTabIconOff,
} from "../../images/popup/images";

// Context
import { contentStateContext } from "../../context/ContentState";

const RecordingTab = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);

  const onValueChange = (tab) => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      recordingType: tab,
    }));
    chrome.storage.local.set({ recordingType: tab });

    if (tab === "camera") {
      chrome.runtime.sendMessage({ type: "camera-only-update" });
    } else {
      chrome.runtime.sendMessage({ type: "screen-update" });
    }
  };

  return (
    <div className="recording-ui">
      <Tabs.Root
        className="TabsRoot"
        defaultValue="screen"
        onValueChange={onValueChange}
        value={contentState.recordingType}
      >
        <Tabs.List
          className="TabsList"
          aria-label="Manage your account"
          tabIndex={0}
        >
          <Tabs.Trigger className="TabsTrigger" value="screen" tabIndex={0}>
            <div className="TabsTriggerLabel">
              {/* <div className="TabsTriggerIcon">
                <img
                  src={
                    contentState.recordingType === "screen"
                      ? ScreenTabOn
                      : ScreenTabOff
                  }
                />
              </div>
              <span>{chrome.i18n.getMessage("screenType")}</span> */}
            </div>
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content className="TabsContent" value="screen">
          <div style={{
            fontFamily: '"Satoshi-Medium", sans-serif',
            color: '#29292f',
            fontSize: '16px',
            borderRadius: '15px',
            background: '#f6f7fb',
            marginBottom: '16px',
            textAlign: 'center',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            width: '100%',
            maxWidth: '100%',
            padding: '8px 0px',
          }}>
            Welcome, {contentState?.userInfo?.name || contentState?.userInfo?.email || "User"}
          </div>
          <RecordingType shadowRef={props.shadowRef} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default RecordingTab;
