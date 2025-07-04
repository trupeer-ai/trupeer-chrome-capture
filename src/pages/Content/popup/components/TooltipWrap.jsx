import React, { useEffect, useContext, useState } from "react";

import * as Tooltip from "@radix-ui/react-tooltip";

// Context
import { contentStateContext } from "../../context/ContentState";

const TooltipWrap = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const classname = props.name ? props.name : "";
  const [override, setOverride] = useState("");

  useEffect(() => {
    // Check if hideUI is set
    if (contentState.hideUI) {
      setOverride("override");
    } else {
      setOverride("");
    }
  }, [contentState.hideUI]);

  const style = props ? props.style : undefined;

  return (
    <div className={classname} style={style}>
      {props.content == "" ? (
        <div>{props.children}</div>
      ) : (
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={700} defaultOpen={false}>
            <Tooltip.Trigger asChild>{props.children}</Tooltip.Trigger>
            <Tooltip.Portal
              container={
                document.getElementsByClassName("trupeer-ai-shadow-dom")[0]
              }
            >
              <Tooltip.Content
                className={
                  "TooltipContent" +
                  " " +
                  props.override +
                  " " +
                  props.hide +
                  " " +
                  override
                }
                style={{
                  display: override === "override" ? "none" : "block",
                }}
                side={"left"}
              >
                {props.content}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
  );
};

export default TooltipWrap;
