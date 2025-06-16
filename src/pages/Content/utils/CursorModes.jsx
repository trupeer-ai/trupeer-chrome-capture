import React, { useState, useEffect, useContext, useRef } from "react";

// Context
import { contentStateContext } from "../context/ContentState";

const CursorModes = () => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const modeRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef(null); // Ref to store the timeout ID

  useEffect(() => {
    modeRef.current = contentState.cursorMode;
  }, [contentState.cursorMode]);

  const mouseDownHandler = (e) => {
    if (modeRef.current === "target") {
      const cursorClickTarget = document.querySelector(".cursor-click-target");
      if (cursorClickTarget) {
        cursorClickTarget.style.transform = "translate(-50%, -50%) scale(1)";
        cursorClickTarget.style.opacity = "1";
      }
    }
  };

  const mouseUpHandler = (e) => {
    if (modeRef.current === "target") {
      const cursorClickTarget = document.querySelector(".cursor-click-target");
      if (cursorClickTarget) {
        document.querySelector(".cursor-click-target").style.transform =
          "translate(-50%, -50%) scale(0)";
        document.querySelector(".cursor-click-target").style.opacity = "0";

        timeoutRef.current = window.setTimeout(() => {
          cursorClickTarget.style.transform = "translate(-50%, -50%) scale(1)";
        }, 350);
      }
    }
  };

  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const lastMouseRef = useRef(lastMousePosition);

  useEffect(() => {
    lastMouseRef.current = lastMousePosition;
  }, [lastMousePosition]);

  const updateCursorPosition = () => {
    const scrollTop = window.scrollY;
    const scrollLeft = window.scrollX;

    const cursorElement =
      modeRef.current === "target"
        ? document.querySelector(".cursor-click-target")
        : modeRef.current === "highlight"
          ? document.querySelector(".cursor-highlight")
          : document.querySelector(".spotlight");

    if (cursorElement) {
      cursorElement.style.top = lastMouseRef.current.y + scrollTop + "px";
      cursorElement.style.left = lastMouseRef.current.x + scrollLeft + "px";
    }
  };

  const mouseMoveHandler = (e) => {
    setLastMousePosition({ x: e.clientX, y: e.clientY });
    updateCursorPosition();
  };

  const scrollHandler = () => {
    updateCursorPosition();
  };

  const clickEvent = (event) => {
    const clickTimestamp = Date.now();
    const clickX = event.clientX;
    const clickY = event.clientY;

    // EUREKA --- WORKS!!!!!!!
    // Get the toolbar element and its bounds
    const shadowRoot = document.getElementById("trupeer-ai-root-container")?.shadowRoot;
    if (!shadowRoot) {
      console.log("No shadow root found to get toolbar");
      return;
    }
    const containerChild = shadowRoot.children[0];
    const toolbar = containerChild.querySelectorAll('div[role="toolbar"]');
    // Get the bounding boxes of each element of toolbar and check if the click is within any of them
    const isToolbarClick = Array.from(toolbar).some((element) => {
      const elementRect = element.getBoundingClientRect();
      return (
        clickX >= elementRect.left &&
        clickX <= elementRect.right &&
        clickY >= elementRect.top &&
        clickY <= elementRect.bottom
      );
    });

    if (clickX !== 0 || clickY !== 0) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const screenHeight = screen.height;
      const screenWidth = screen.width;

      console.log(
        "click event",
        clickTimestamp,
        clickX,
        clickY,
        event.isTrusted
      );
      chrome.runtime.sendMessage({
        type: "click-event",
        data: {
          timestamp: clickTimestamp,
          x: clickX,
          y: clickY,
          viewportWidth: viewportWidth,
          viewportHeight: viewportHeight,
          screenHeight: screenHeight,
          screenWidth: screenWidth,
          isToolbarClick: isToolbarClick,
        },
      });
    }
  };

  // Show click target when user clicks anywhere for 1 second, animate scale up and fade out
  useEffect(() => {
    document.addEventListener("mousedown", mouseDownHandler);
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.addEventListener("scroll", scrollHandler);
    document.addEventListener("click", clickEvent, true);

    return () => {
      document.removeEventListener("mousedown", mouseDownHandler);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
      document.removeEventListener("scroll", scrollHandler);
      document.removeEventListener("click", clickEvent);

      // Clear the timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Log viewport dimensions
    let viewportWidth = 0;
    let viewportHeight = 0;
    let screenHeight = 0;
    let screenWidth = 0;

    if (window) {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
    }

    if (screen) {
      const screenHeight = screen.height;
      const screenWidth = screen.width;
    }

    chrome.runtime.sendMessage({
      type: "screen-event",
      data: {
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight,
        screenHeight: screenHeight,
        screenWidth: screenWidth,
      },
    });
  }, []);

  return (
    <div>
      <div
        className="cursor-highlight"
        style={{
          display: "block",
          visibility:
            contentState.cursorMode === "highlight" ? "visible" : "hidden",
          position: "absolute",
          top: 0,
          left: 0,
          width: "80px",
          height: "80px",
          pointerEvents: "none",
          zIndex: 99999999999,
          background: "yellow",
          opacity: ".5",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          animation: "none",
        }}
      ></div>
      <div
        className="cursor-click-target"
        style={{
          display: "block",
          visibility:
            contentState.cursorMode === "target" ? "visible" : "hidden",
          position: "absolute",
          top: 0,
          opacity: 0,
          left: 0,
          width: "40px",
          height: "40px",
          transform: "translate(-50%, -50%) scale(1)",
          pointerEvents: "none",
          zIndex: 99999999999,
          border: "3px solid red",
          transform: "none",
          borderRadius: "50%",
          animation: "none",
          transition:
            "opacity 1s cubic-bezier(.25,.8,.25,1), transform .35s cubic-bezier(.25,.8,.25,1)",
          backgroundColor: "rgba(240, 128, 128, 0.3)",
        }}
      ></div>
      <div
        className="spotlight"
        style={{
          position: "absolute",
          display: contentState.cursorMode === "spotlight" ? "block" : "none",
          top: mousePosition.y + "px",
          left: mousePosition.x + "px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 99999999999,
        }}
      ></div>
      <style>
        {`
					@keyframes scaleDown {
							from {
									transform: translate(-50%, -50%) scale(1);
									opacity: 1;
							}
							to {
									transform: translate(-50%, -50%) scale(0);
									opacity: 0;
							}
					`}
      </style>
    </div>
  );
};

export default CursorModes;
