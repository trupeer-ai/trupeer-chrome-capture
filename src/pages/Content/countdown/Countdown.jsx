import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";

// Context
import { contentStateContext } from "../context/ContentState";
import { CountdownVisual, CountdownText } from "../images/popup/images";

const Countdown = () => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const [count, setCount] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countActive, setCountActive] = useState(false);
  const backgroundRef = useRef(null);
  const circleRef = useRef(null);
  const c1Ref = useRef(null);
  const c2Ref = useRef(null);
  const countdownRef = useRef(contentState.countdown);
  const wrapperRef = useRef(null);
  const cancelRef = useRef(false);

  // 3, 2, 1 countdown when recording starts
  useEffect(() => {
    if (countActive && count > 1) {
      const timer = setInterval(() => {
        setCount((prevCount) => prevCount - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countActive, count]);

  const startCountdown = () => {
    if (circleRef.current === null) return;
    if (backgroundRef.current === null) return;

    setCount(3);
    cancelRef.current = false;

    if (wrapperRef.current === null) return;
    wrapperRef.current.style.pointerEvents = "all";

    setTimeout(() => {
      if (circleRef.current === null) return;
      if (backgroundRef.current === null) return;
      circleRef.current.style.transform = "scale(1)";
      backgroundRef.current.style.transform = "rotate(90deg)";
    }, 10);
    setTimeout(() => {
      if (circleRef.current === null) return;
      circleRef.current.style.transform = "scale(.8)";
    }, (count * 1000) / 2);
  };

  useEffect(() => {
    countdownRef.current = contentState.countdown;
  }, [contentState.countdown]);

  const onMessage = useCallback(
    (request, sender, sendResponse) => {
      if (request.type === "ready-to-record") {
        if (countdownRef.current) {
          setCountActive(true);
          setShowCountdown(true);
          startCountdown();

          setTimeout(() => {
            if (!cancelRef.current) {
              setShowCountdown(false);
              setCountActive(false);
              cancelRef.current = false;
              setCount(3);
              if (wrapperRef.current === null) return;
              wrapperRef.current.style.pointerEvents = "none";

              // Play beep sound at 50% volume
              const audio = new Audio(
                chrome.runtime.getURL("/assets/sounds/beep2.mp3")
              );
              audio.volume = 0.5;
              audio.play();
              setTimeout(() => {
                contentState.startRecording();
              }, 500);
            }
          }, count * 1000);
        } else {
          if (!cancelRef.current) {
            // Play beep sound at 50% volume
            const audio = new Audio(
              chrome.runtime.getURL("/assets/sounds/beep2.mp3")
            );
            audio.volume = 0.5;
            audio.play();
            setShowCountdown(false);
            setCountActive(false);
            setTimeout(() => {
              contentState.startRecording();
            }, 500);
          }
        }
      }
    },
    [countdownRef, contentState, cancelRef.current]
  );

  useEffect(() => {
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      setCountActive(false);
      setShowCountdown(false);
      setCount(3);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  // I need to make a 3, 2, 1 countdown, full screen (black overlay with the number in a circle on the middle), with a beep at the end
  return (
    <div
      className={!countActive ? "countdown" : "countdown recording-countdown"}
      // onClick={() => {
      //   if (countActive) {
      //     if (wrapperRef.current === null) return;
      //     if (cancelRef.current === null) return;

      //     cancelRef.current = true;
      //     wrapperRef.current.style.pointerEvents = "none";
      //     setCountActive(false);
      //     setShowCountdown(false);
      //     setCount(5);
      //     contentState.dismissRecording();
      //     setContentState((prevContentState) => ({
      //       ...prevContentState,
      //       recording: false,
      //       showPopup: true,
      //       showExtension: true,
      //     }));
      //   }
      // }}
      ref={wrapperRef}
    >
      {showCountdown && (
        <div>
          <div className="countdown-access">
            <div className="countdown-access-visual">
              <div className="countdown-access-visual-timer">
                {count}
              </div>
              <img src={CountdownVisual} alt="Countdown UI" />
            </div>
            <div className="countdown-access-text">
              <img src={CountdownText} alt="Countdown UI" className="countdown-access-text-img" />
            </div>
          </div>
          {/* <div className="countdown-info">
            {chrome.i18n.getMessage("countdownMessage")}
          </div> */}
          <div className="countdown-overlay"></div>
        </div>
      )}
    </div>
  );
};

export default Countdown;
