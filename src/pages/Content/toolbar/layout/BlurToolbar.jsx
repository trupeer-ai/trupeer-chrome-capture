import React from "react";
import * as Toolbar from "@radix-ui/react-toolbar";

// Components
import ToolTrigger from "../components/ToolTrigger";

// Icons
import { TransformIcon, TrashIcon } from "../components/SVG";

const BlurToolbar = (props) => {
  return (
    <Toolbar.Root
      className={"DrawingToolbar" + " " + props.visible}
      aria-label="Cursor options"
      tabIndex="0"
    >
      <Toolbar.ToggleGroup
        type="single"
        className="ToolbarToggleGroup"
        value="target"
      >
        <div className="ToolbarToggleWrap">
          <Toolbar.ToggleItem className="ToolbarToggleItem" value="target">
            <TransformIcon />
          </Toolbar.ToggleItem>
        </div>
        <Toolbar.Separator className="ToolbarSeparator" />
        <ToolTrigger
          type="button"
          content={chrome.i18n.getMessage("clearBlurredElementsTooltip")}
          onClick={() => {
            // Remove class trupeer-ai-blur from all elements
            const blurredElements =
              document.querySelectorAll(".trupeer-ai-blur");
            blurredElements.forEach((element) => {
              element.classList.remove("trupeer-ai-blur");
            });
          }}
        >
          <TrashIcon />
        </ToolTrigger>
      </Toolbar.ToggleGroup>
    </Toolbar.Root>
  );
};

export default BlurToolbar;
