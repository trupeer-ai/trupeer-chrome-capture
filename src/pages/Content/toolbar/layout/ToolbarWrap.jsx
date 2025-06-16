import React, { useLayoutEffect, useEffect, useContext, useRef } from "react";
import * as Toolbar from "@radix-ui/react-toolbar";

import { Rnd } from "react-rnd";

// Layout
import DrawingToolbar from "./DrawingToolbar";
import CursorToolbar from "./CursorToolbar";

// Components
import ToolTrigger from "../components/ToolTrigger";
import Toast from "../components/Toast";

// Context
import { contentStateContext } from "../../context/ContentState";

// Icons
import {
  GrabIcon,
  StopIcon,
  DrawIcon,
  PauseIcon,
  ResumeIcon,
  CursorIcon,
  TargetCursorIcon,
  HighlightCursorIcon,
  SpotlightCursorIcon,
  RestartIcon,
  DiscardIcon,
  CameraIcon,
  BlurIcon,
  OnboardingArrow,
  CloseButtonToolbar,
  ArrowIcon,
  EyeOpenIcon,
  EyeCloseIcon,
} from "../components/SVG";
import MicToggle from "../components/MicToggle";

const ToolbarWrap = () => {
  const [contentState, setContentState, t, setT] =
    useContext(contentStateContext);
  const [mode, setMode] = React.useState("");
  const DragRef = React.useRef(null);
  const ToolbarRef = React.useRef(null);
  const [side, setSide] = React.useState("ToolbarTop");
  const [elastic, setElastic] = React.useState("");
  const [shake, setShake] = React.useState("");
  const [dragging, setDragging] = React.useState("");
  const [timer, setTimer] = React.useState(0);
  const [timestamp, setTimestamp] = React.useState("00:00");
  const [transparent, setTransparent] = React.useState(false);
  const [forceTransparent, setForceTransparent] = React.useState("");
  const timeRef = React.useRef("");
  const recordingStartTimeRef = useRef(null);
  const pauseStartTimeRef = useRef(null);
  const totalPauseTimeRef = useRef(0);
  const [isTimerInitialized, setIsTimerInitialized] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  useEffect(() => {
    if (contentState.toolbarHover && contentState.hideUI) {
      setTransparent("ToolbarTransparent");
    } else {
      setTransparent(false);
      setForceTransparent("");
    }
  }, [contentState.toolbarHover, contentState.hideUI]);

  // If mouse is down and toolbarHover is true, set forceTransparent
  useEffect(() => {
    if (!contentState.toolbarHover) return;
    if (!contentState.shadowRef) return;
    if (!contentState.hideUI) return;
    const handleMouseDown = (e) => {
      if (contentState.toolbarHover && contentState.hideUI) {
        // check if mouse is over toolbar
        if (ToolbarRef.current && ToolbarRef.current.contains(e.target)) return;
        if (
          contentState.shadowRef &&
          (contentState.shadowRef.contains(e.target) ||
            contentState.shadowRef === e.target ||
            contentState.shadowRef === e.target.parentNode)
        )
          return;

        setForceTransparent("ForceTransparent");
      }
    };

    const handleMouseUp = (e) => {
      setForceTransparent("");
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [contentState.toolbarHover, contentState.shadowRef, contentState.hideUI]);

  useEffect(() => {
    if (!contentState.recording) {
      setTimestamp("00:00");
      recordingStartTimeRef.current = null;
      pauseStartTimeRef.current = null;
      totalPauseTimeRef.current = 0;
      setIsTimerInitialized(false);
      chrome.storage.local.remove(['recordingStartTime', 'totalPauseTime']);
      return;
    }

    // Initialize recording start time if not set
    if (!recordingStartTimeRef.current) {
      chrome.storage.local.get(['recordingStartTime', 'totalPauseTime', 'isPaused', 'pauseStartTime'], (result) => {
        const now = Date.now();

        // Validate stored time - ensure it's not older than 24 hours
        if (result.recordingStartTime &&
          (now - result.recordingStartTime) < 24 * 60 * 60 * 1000) {
          recordingStartTimeRef.current = result.recordingStartTime;
          totalPauseTimeRef.current = result.totalPauseTime || 0;

          // If recording was paused when URL changed
          if (result.isPaused && result.pauseStartTime) {
            pauseStartTimeRef.current = result.pauseStartTime;
            // Sync pause state with ContentState
            setContentState(prev => ({
              ...prev,
              paused: true
            }));
          }
        } else {
          // If no valid stored time, set new start time
          recordingStartTimeRef.current = now;
          totalPauseTimeRef.current = 0;
          chrome.storage.local.set({
            recordingStartTime: recordingStartTimeRef.current,
            totalPauseTime: 0,
            isPaused: false,
            pauseStartTime: null
          });
        }
        setIsTimerInitialized(true);
      });
      return;
    }

    if (!isTimerInitialized) return;

    // Handle pause start
    if (contentState.paused && !pauseStartTimeRef.current) {
      pauseStartTimeRef.current = Date.now();
      chrome.storage.local.set({
        isPaused: true,
        pauseStartTime: pauseStartTimeRef.current
      });
      return;
    }

    // Handle resume
    if (!contentState.paused && pauseStartTimeRef.current) {
      const pauseDuration = Math.max(0, (Date.now() - pauseStartTimeRef.current) / 1000);
      totalPauseTimeRef.current = Math.max(0, totalPauseTimeRef.current + pauseDuration);
      chrome.storage.local.set({
        totalPauseTime: totalPauseTimeRef.current,
        isPaused: false,
        pauseStartTime: null
      });
      pauseStartTimeRef.current = null;
    }

    let interval;
    if (!contentState.paused) {
      const updateTimer = () => {
        const now = Date.now();
        const totalElapsed = (now - recordingStartTimeRef.current) / 1000;

        // Ensure we don't get negative values
        const adjustedTime = Math.max(0, Math.floor(totalElapsed - totalPauseTimeRef.current));

        const hours = Math.floor(adjustedTime / 3600);
        const minutes = Math.floor((adjustedTime % 3600) / 60);
        const seconds = Math.floor(adjustedTime % 60);

        const newTimestamp = hours > 0
          ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        if (timeRef.current) {
          timeRef.current.style.width = hours > 0 ? "58px" : "42px";
        }

        setTimestamp(newTimestamp);
      };

      // Update immediately
      updateTimer();

      // Then update every second
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [contentState.recording, contentState.paused, isTimerInitialized]);

  useLayoutEffect(() => {
    function setToolbarPosition(e) {
      let xpos = DragRef.current.getDraggablePosition().x;
      let ypos = DragRef.current.getDraggablePosition().y;

      // Width and height of toolbar
      const width = ToolbarRef.current.getBoundingClientRect().width;
      const height = ToolbarRef.current.getBoundingClientRect().height;

      // Keep toolbar positioned relative to the bottom and right of the screen, proportionally
      if (xpos + width + 30 > window.innerWidth) {
        xpos = window.innerWidth - width - 30;
      }
      if (ypos + height - 60 > window.innerHeight) {
        ypos = window.innerHeight - height + 60;
      }

      DragRef.current.updatePosition({ x: xpos, y: ypos });
    }
    window.addEventListener("resize", setToolbarPosition);
    setToolbarPosition();
    return () => window.removeEventListener("resize", setToolbarPosition);
  }, []);

  const handleChange = (value) => {
    setMode(value);
  };

  const handleDragStart = (e, d) => {
    setDragging("ToolbarDragging");
  };

  const handleDrag = (e, d) => {
    // Width and height
    const width = ToolbarRef.current.getBoundingClientRect().width;
    const height = ToolbarRef.current.getBoundingClientRect().height;

    if (d.y < 130) {
      setSide("ToolbarBottom");
    } else {
      setSide("ToolbarTop");
    }

    if (
      d.x < -25 ||
      d.x + width > window.innerWidth ||
      d.y < 60 ||
      d.y + height - 80 > window.innerHeight
    ) {
      setShake("ToolbarShake");
    } else {
      setShake("");
    }
  };

  const handleDrop = (e, d) => {
    setShake("");
    setDragging("");
    let xpos = d.x;
    let ypos = d.y;

    // Width and height
    const width = ToolbarRef.current.getBoundingClientRect().width;
    const height = ToolbarRef.current.getBoundingClientRect().height;

    // Check if toolbar is off screen
    if (d.x < -10) {
      setElastic("ToolbarElastic");
      xpos = -10;
    } else if (d.x + width + 30 > window.innerWidth) {
      setElastic("ToolbarElastic");
      xpos = window.innerWidth - width - 30;
    }

    if (d.y < 130) {
      setSide("ToolbarBottom");
    } else {
      setSide("ToolbarTop");
    }

    if (d.y < 80) {
      setElastic("ToolbarElastic");
      ypos = 80;
    } else if (d.y + height - 60 > window.innerHeight) {
      setElastic("ToolbarElastic");
      ypos = window.innerHeight - height + 60;
    }
    DragRef.current.updatePosition({ x: xpos, y: ypos });

    setTimeout(() => {
      setElastic("");
    }, 250);

    setContentState((prevContentState) => ({
      ...prevContentState,
      toolbarPosition: {
        ...prevContentState.toolbarPosition,
        offsetX: xpos,
        offsetY: ypos,
        left: xpos < window.innerWidth / 2 ? true : false,
        right: xpos < window.innerWidth / 2 ? false : true,
        top: ypos < window.innerHeight / 2 ? true : false,
        bottom: ypos < window.innerHeight / 2 ? false : true,
      },
    }));

    // Is it on the left or right, also top or bottom

    let left = xpos < window.innerWidth / 2 ? true : false;
    let right = xpos < window.innerWidth / 2 ? false : true;
    let top = ypos < window.innerHeight / 2 ? true : false;
    let bottom = ypos < window.innerHeight / 2 ? false : true;
    let offsetX = xpos;
    let offsetY = ypos;

    if (right) {
      offsetX = window.innerWidth - xpos;
    }
    if (bottom) {
      offsetY = window.innerHeight - ypos;
    }

    setContentState((prevContentState) => ({
      ...prevContentState,
      toolbarPosition: {
        ...prevContentState.toolbarPosition,
        offsetX: offsetX,
        offsetY: offsetY,
        left: left,
        right: right,
        top: top,
        bottom: bottom,
      },
    }));

    chrome.storage.local.set({
      toolbarPosition: {
        offsetX: offsetX,
        offsetY: offsetY,
        left: left,
        right: right,
        top: top,
        bottom: bottom,
      },
    });
  };

  useEffect(() => {
    let x = contentState.toolbarPosition.offsetX;
    let y = contentState.toolbarPosition.offsetY;

    if (contentState.toolbarPosition.bottom) {
      y = window.innerHeight - contentState.toolbarPosition.offsetY;
    }

    if (contentState.toolbarPosition.right) {
      x = window.innerWidth - contentState.toolbarPosition.offsetX;
    }

    DragRef.current.updatePosition({ x: x, y: y });

    handleDrop(null, { x: x, y: y });
  }, []);

  useEffect(() => {
    if (!contentState.openToast) return;
    if (contentState.drawingMode) {
      contentState.openToast(chrome.i18n.getMessage("drawingModeToast"), () => {
        setMode("");
      });
    }
    if (contentState.blurMode) {
      contentState.openToast(chrome.i18n.getMessage("blurModeToast"), () => {
        setMode("");
      });
    }
  }, [contentState.drawingMode, contentState.blurMode, contentState.openToast]);

  useEffect(() => {
    if (mode === "draw") {
      setContentState((prevContentState) => ({
        ...prevContentState,
        drawingMode: true,
        showOnboardingArrow: false,
      }));
    } else {
      setContentState((prevContentState) => ({
        ...prevContentState,
        drawingMode: false,
      }));
    }
    if (mode === "blur") {
      setContentState((prevContentState) => ({
        ...prevContentState,
        blurMode: true,
        drawingMode: false,
      }));
    } else {
      setContentState((prevContentState) => ({
        ...prevContentState,
        blurMode: false,
      }));
    }
  }, [mode]);

  const enableCamera = () => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      cameraActive: true,
    }));
    chrome.storage.local.set({
      cameraActive: true,
    });
    setContentState((prevContentState) => ({
      ...prevContentState,
      pipEnded: true,
    }));
  };

  useEffect(() => {
    const handleMessage = (message) => {
      if (message.type === "recording-paused") {
        setContentState(prev => ({
          ...prev,
          paused: true
        }));
        pauseStartTimeRef.current = message.pauseStartTime;
        chrome.storage.local.set({
          isPaused: true,
          pauseStartTime: message.pauseStartTime
        });
      } else if (message.type === "recording-resumed") {
        setContentState(prev => ({
          ...prev,
          paused: false
        }));

        // Update pause-related refs with the synced data
        pauseStartTimeRef.current = null;
        totalPauseTimeRef.current = message.totalPauseTime;

        // Update local storage with synced data
        chrome.storage.local.set({
          totalPauseTime: message.totalPauseTime,
          isPaused: false,
          pauseStartTime: null,
          pauseData: message.allPauses
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return (
    <div>
      <Toast />
      <div
        className={
          contentState.paused && contentState.recording
            ? "ToolbarPaused"
            : "ToolbarPaused hidden"
        }
      ></div>
      <div className={"ToolbarBounds" + " " + shake}></div>
      <Rnd
        default={{
          x: 200,
          y: 500,
        }}
        className={
          "react-draggable" + " " + elastic + " " + shake + " " + dragging
        }
        dragHandleClassName="grab"
        enableResizing={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDrop}
        ref={DragRef}
      >
        {!collapsed ? (
          <Toolbar.Root
            className={
              "ToolbarRoot" +
              " " +
              side +
              " " +
              transparent +
              " " +
              forceTransparent +
              " grab"
            }
            ref={ToolbarRef}
          >
            {/* Collapse button using ToolTrigger for consistency */}
            <div className="ToolbarToggleWrap">
              <ToolTrigger
                type="button"
                content={chrome.i18n.getMessage("collapseToolbarTooltip") || "Collapse toolbar"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCollapsed(true);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-left-icon lucide-chevrons-left"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
              </ToolTrigger>
            </div>
            <Toolbar.Separator className="ToolbarSeparator" />
            <div className={"ToolbarRecordingControls"}>
              <ToolTrigger
                type="button"
                content={chrome.i18n.getMessage("finishRecordingTooltip")}
                disabled={!contentState.recording}
                onClick={() => {
                  contentState.stopRecording();
                }}
              >
                <StopIcon width="20" height="20" />
              </ToolTrigger>
              <div className="ToolbarRecordingTime" ref={timeRef}>
                {timestamp}
              </div>
              <ToolTrigger
                type="button"
                content={chrome.i18n.getMessage("restartRecordingTooltip")}
                disabled={!contentState.recording}
                onClick={() => {
                  contentState.tryRestartRecording();
                }}
              >
                <RestartIcon />
              </ToolTrigger>
              {!contentState.paused && (
                <ToolTrigger
                  type="button"
                  content={chrome.i18n.getMessage("pauseRecordingTooltip")}
                  disabled={!contentState.recording}
                  onClick={() => {
                    contentState.pauseRecording();
                  }}
                >
                  <PauseIcon />
                </ToolTrigger>
              )}
              {contentState.recording && contentState.paused && (
                <ToolTrigger
                  type="button"
                  resume
                  content={chrome.i18n.getMessage("resumeRecordingTooltip")}
                  disabled={!contentState.recording}
                  onClick={() => {
                    contentState.resumeRecording();
                  }}
                >
                  <ResumeIcon />
                </ToolTrigger>
              )}
              <ToolTrigger
                type="button"
                content={chrome.i18n.getMessage("cancelRecordingTooltip")}
                disabled={!contentState.recording}
                onClick={() => {
                  if (contentState.tryDismissRecording !== undefined) {
                    contentState.tryDismissRecording();
                  }
                }}
              >
                <DiscardIcon />
              </ToolTrigger>
            </div>
            <Toolbar.Separator className="ToolbarSeparator" />
            <Toolbar.ToggleGroup
              type="single"
              className="ToolbarToggleGroup"
              value={mode}
              onValueChange={handleChange}
            >
              <div className="ToolbarToggleWrap">
                <ToolTrigger
                  type="mode"
                  content={chrome.i18n.getMessage("toggleCursorOptionsTooltip")}
                  value="cursor"
                >
                  {contentState.cursorMode === "target" && <TargetCursorIcon />}
                  {contentState.cursorMode === "highlight" && (
                    <HighlightCursorIcon />
                  )}
                  {contentState.cursorMode === "spotlight" && (
                    <SpotlightCursorIcon />
                  )}
                  {contentState.cursorMode === "none" && <CursorIcon />}
                </ToolTrigger>
                <CursorToolbar
                  visible={mode === "cursor" ? "show-toolbar" : ""}
                  mode={mode}
                  setMode={setMode}
                />
              </div>
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
        ) : (
          // Collapsed state: minimal toolbar with expand button
          <Toolbar.Root
            className={
              "ToolbarRoot" +
              " " +
              side +
              " " +
              transparent +
              " " +
              forceTransparent +
              " grab"
            }
            style={{
              minWidth: "auto",
              width: "fit-content"
            }}
            ref={ToolbarRef}
          >
            <div className="ToolbarToggleWrap">
              <ToolTrigger
                type="button"
                content={chrome.i18n.getMessage("expandToolbarTooltip") || "Expand toolbar"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCollapsed(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-right-icon lucide-chevrons-right"><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></svg>
              </ToolTrigger>
            </div>
            <Toolbar.Separator className="ToolbarSeparator" />
            <div className="ToolbarRecordingControls ToolbarRecordingControls--collapsed">
              <ToolTrigger
                type="button"
                content={chrome.i18n.getMessage("finishRecordingTooltip")}
                disabled={!contentState.recording}
                onClick={() => {
                  contentState.stopRecording();
                }}
              >
                <StopIcon width="20" height="20" />
              </ToolTrigger>
              <div className="ToolbarRecordingTime" ref={timeRef} style={{ minWidth: 42 }}>
                {timestamp}
              </div>
              {!contentState.paused && (
                <ToolTrigger
                  type="button"
                  content={chrome.i18n.getMessage("pauseRecordingTooltip")}
                  disabled={!contentState.recording}
                  onClick={() => {
                    contentState.pauseRecording();
                  }}
                >
                  <PauseIcon />
                </ToolTrigger>
              )}
              {contentState.recording && contentState.paused && (
                <ToolTrigger
                  type="button"
                  resume
                  content={chrome.i18n.getMessage("resumeRecordingTooltip")}
                  disabled={!contentState.recording}
                  onClick={() => {
                    contentState.resumeRecording();
                  }}
                >
                  <ResumeIcon />
                </ToolTrigger>
              )}
            </div>
          </Toolbar.Root>
        )}
      </Rnd>
    </div>
  );
};

export default ToolbarWrap;
