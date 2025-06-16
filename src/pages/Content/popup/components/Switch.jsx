import React, { useContext, useEffect, useState, useRef } from "react";
import * as S from "@radix-ui/react-switch";

// Components
import { DropdownIcon } from "../../images/popup/images";

import { getAllLanguages } from "../../../../utils/trupeer";

// Context
import { contentStateContext } from "../../context/ContentState";
import ReactCountryFlag from "react-country-flag";

const Switch = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const [languagesMasterInfo, setLanguagesMasterInfo] = useState([]);
  const switchRef = useRef(null);
  const [hideToolbarLabel, setHideToolbarLabel] = useState(
    chrome.i18n.getMessage("hideToolbarLabel")
  );
  const [hideToolbarState, setHideToolbarState] = useState(1);

  useEffect(() => {
    // Check click outside
    const handleClickOutside = (event) => {
      if (props.name != "hideUI") return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !dropdownInRef.current.contains(event.target)
      ) {
        if (dropdownRef.current.querySelector(":hover")) return;
        if (dropdownInRef.current.querySelector(":hover")) return;
        // Check if any children of dropdownref are clicked also
        let children = dropdownRef.current.querySelectorAll("*");
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(event.target)) return;
        }

        dropdownRef.current.classList.remove("labelDropdownActive");
      }
    };

    // On load, always set the props.value to be true for hideToolbar
    if (props.name == "hideUI" && props.value) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        [props.value]: true,
      }));
      chrome.storage.local.set({ [props.value]: true });
      setContentState((prevContentState) => ({
        ...prevContentState,
        hideToolbar: true,
        hideUIAlerts: false,
        toolbarHover: false,
      }));
      chrome.storage.local.set({
        hideToolbar: true,
        hideUIAlerts: false,
        toolbarHover: false,
      });
    }

    // Bind the event listener
    document.addEventListener("click", handleClickOutside);

    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (props.name === "hideUI") {
      if (contentState.hideUIAlerts) {
        setHideToolbarLabel(chrome.i18n.getMessage("hideUIAlerts"));
        setHideToolbarState(2);
      } else if (contentState.hideToolbar) {
        setHideToolbarLabel(chrome.i18n.getMessage("hideToolbarLabel"));
        setHideToolbarState(1);
      } else if (contentState.toolbarHover) {
        setHideToolbarLabel(chrome.i18n.getMessage("toolbarHoverOnly"));
        setHideToolbarState(3);
      }
    }
  }, [contentState.hideToolbar]);

  useEffect(() => {
    const fetchLanguages = async () => {
      const accessTokenValue = await chrome.storage.local.get(["accessTokenValue"]);
      const languages = await getAllLanguages(accessTokenValue.accessTokenValue || "");
      // languages will be array of {tag: string, name: string, countryCode: string}
      languages.sort((a, b) => a.name.localeCompare(b.name));
      setLanguagesMasterInfo(languages);
    };
    fetchLanguages();
  }, []);

  const dropdownRef = useRef(null);
  const dropdownInRef = useRef(null);
  return (
    <form>
      <div className="SwitchRow">
        <label
          className="Label"
          htmlFor={props.name}
          style={{ paddingRight: 15 }}
        // onClick={(e) => {
        //   if (props.name === "hideUI") {
        //     e.preventDefault();
        //     e.stopPropagation();
        //     if (e.target.classList.contains("labelDropdownContentItem"))
        //       return;
        //     dropdownRef.current.classList.toggle("labelDropdownActive");
        //   }
        // }}
        >
          {props.label}
          {/* FEATURE_DISABLED {props.name === "hideUI" && (
            <div className="labelDropdownWrap" ref={dropdownRef}>
              <div className="labelDropdown" ref={dropdownInRef}>
                {hideToolbarLabel}
                <img src={DropdownIcon} />
              </div>
              <div className="labelDropdownContent">
                <div
                  className="labelDropdownContentItem"
                  onClick={() => {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: true,
                      hideUIAlerts: false,
                      toolbarHover: false,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: true,
                      hideUIAlerts: false,
                      toolbarHover: false,
                    });
                    setHideToolbarLabel(
                      chrome.i18n.getMessage("hideToolbarLabel")
                    );
                    dropdownRef.current.classList.remove("labelDropdownActive");
                    setHideToolbarState(1);
                  }}
                >
                  {chrome.i18n.getMessage("hideToolbarLabel")}
                </div>
                <div
                  className="labelDropdownContentItem"
                  onClick={() => {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: false,
                      hideUIAlerts: true,
                      toolbarHover: false,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: false,
                      hideUIAlerts: true,
                      toolbarHover: false,
                    });
                    setHideToolbarLabel(chrome.i18n.getMessage("hideUIAlerts"));
                    dropdownRef.current.classList.remove("labelDropdownActive");
                    setHideToolbarState(2);
                  }}
                >
                  {chrome.i18n.getMessage("hideUIAlerts")}
                </div>
                <div
                  className="labelDropdownContentItem"
                  onClick={() => {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: false,
                      hideUIAlerts: false,
                      toolbarHover: true,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: false,
                      hideUIAlerts: false,
                      toolbarHover: true,
                    });
                    setHideToolbarLabel(
                      chrome.i18n.getMessage("toolbarHoverOnly")
                    );
                    dropdownRef.current.classList.remove("labelDropdownActive");
                    setHideToolbarState(3);
                  }}
                >
                  {chrome.i18n.getMessage("toolbarHoverOnly")}
                </div>
              </div>
            </div>
          )} */}
          {props.experimental && (
            <span className="ExperimentalLabel">Experimental</span>
          )}
        </label>
        {props.name === "languageSelector" && (
          <div
            className="labelDropdownWrap"
            ref={dropdownRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.target.classList.contains("labelDropdownContentItem"))
                return;
              dropdownRef.current.classList.toggle("labelDropdownActive");
            }}
          >
            <div
              className="labelDropdown"
              ref={dropdownRef}
              onClick={() => {
                dropdownRef.current.classList.toggle("labelDropdownActive");
              }}
            >
              <ReactCountryFlag
                countryCode={languagesMasterInfo.find(language => language.tag === contentState["inputLanguage"])?.countryCode}
                svg
                style={{
                  transform: "rotate(0deg)",
                }}
              />
              {languagesMasterInfo.find(language => language.tag === contentState["inputLanguage"])?.name}
              <img src={DropdownIcon} alt="Dropdown Icon" />
            </div>
            <div className="labelDropdownContent">
              {languagesMasterInfo.map((language) => (
                <div
                  key={language.tag}
                  className="labelDropdownContentItem"
                  onClick={() => {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      inputLanguage: language.tag,
                    }));
                    chrome.storage.local.set({ inputLanguage: language.tag });
                    dropdownRef.current.classList.remove("labelDropdownActive");
                  }}
                >
                  <ReactCountryFlag
                    countryCode={language.countryCode}
                    svg
                    style={{
                      transform: "rotate(0deg)",
                    }}
                  />
                  {language.name}
                </div>
              ))}
            </div>
          </div>
        )}
        {props.name !== "languageSelector" &&
          (props.value ? (
            <S.Root
              className="SwitchRoot"
              id={props.value}
              ref={switchRef}
              checked={
                props.name == "hideUI"
                  ? !contentState[props.value]
                  : contentState[props.value]
              }
              onCheckedChange={(checked) => {
                if (props.name == "hideUI") {
                  setContentState((prevContentState) => ({
                    ...prevContentState,
                    [props.value]: !checked,
                  }));
                  chrome.storage.local.set({ [props.value]: !checked });
                } else {
                  setContentState((prevContentState) => ({
                    ...prevContentState,
                    [props.value]: checked,
                  }));
                  chrome.storage.local.set({ [props.value]: checked });
                }

                if (props.value === "customRegion") {
                  if (checked) {
                    chrome.storage.local.set({
                      region: true,
                    });
                  }
                }

                if (props.name === "hideUI") {
                  if (hideToolbarState === 1) {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: true,
                      hideUIAlerts: false,
                      toolbarHover: false,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: true,
                      hideUIAlerts: false,
                      toolbarHover: false,
                    });
                  } else if (hideToolbarState === 2) {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: false,
                      hideUIAlerts: true,
                      toolbarHover: false,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: false,
                      hideUIAlerts: true,
                      toolbarHover: false,
                    });
                  } else if (hideToolbarState === 3) {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: false,
                      hideUIAlerts: false,
                      toolbarHover: true,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: false,
                      hideUIAlerts: false,
                      toolbarHover: true,
                    });
                  }
                } else if (props.name === "pushToTalk") {
                  if (!checked) {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      micActive: true,
                    }));
                  }
                }
              }}
            >
              <S.Thumb className="SwitchThumb" />
            </S.Root>
          ) : (
            <S.Root className="SwitchRoot" id={props.name}>
              <S.Thumb className="SwitchThumb" />
            </S.Root>
          ))}
      </div>
    </form>
  );
};

export default Switch;
