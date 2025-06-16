import React from "react";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import { MoonLoader, RingLoader } from "react-spinners";
import "./popupStyles.css";

const PopupComponent = ({ isOpen, popupText, showLoader, allowClose }) => {
  return (
    <Popup open={isOpen} closeOnDocumentClick={allowClose}>
      <div className="loading-popup-content">
        <div className="loading-popup-text">{popupText}</div>
        {showLoader && (
          <div className="loader-container">
            <MoonLoader size={40} color={"#fff"} loading={true} />
          </div>
        )}
      </div>
    </Popup>
  );
};

export default PopupComponent;
