import React, { useState, useContext, useEffect, useRef } from "react";

// Components
import Wrapper from "./Wrapper";

// Context
import ContentState from "./context/ContentState";

const Content = () => {
  return (
    <div className="trupeer-ai-shadow-dom">
      <ContentState>
        <Wrapper />
      </ContentState>
      <style type="text/css">{`
			#trupeer-ai-ui, #trupeer-ai-ui div {
				background-color: unset;
				padding: unset;
				width: unset;
				box-shadow: unset;
				display: unset;
				margin: unset;
				border-radius: unset;
			}
			.trupeer-ai-outline {
				position: absolute;
				z-index: 99999999999;
				border: 2px solid #6f66c5;
				outline-offset: -2px;
				pointer-events: none;
				border-radius: 5px!important;
			}
		.trupeer-ai-blur {
			filter: blur(10px)!important;
		}
			.trupeer-ai-shadow-dom * {
				transition: unset;
			}
			.trupeer-ai-shadow-dom .TooltipContent {
  border-radius: 30px!important;
	background-color: #29292F!important;
  padding: 10px 15px!important;
  font-size: 12px;
	margin-bottom: 10px!important;
	bottom: 100px;
  line-height: 1;
	font-family: 'Satoshi-Medium', sans-serif;
	z-index: 99999999!important;
  color: #FFF;
  box-shadow: hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px!important;
  user-select: none;
	transition: opacity 0.3 ease-in-out;
  will-change: transform, opacity;
	animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.trupeer-ai-shadow-dom .hide-tooltip {
	display: none!important;
}

.trupeer-ai-shadow-dom .tooltip-tall {
	margin-bottom: 20px;
}

.trupeer-ai-shadow-dom .tooltip-small {
	margin-bottom: 5px;
}

.trupeer-ai-shadow-dom .TooltipContent[data-state='delayed-open'][data-side='top'] {
	animation-name: slideDownAndFade;
}
.trupeer-ai-shadow-dom .TooltipContent[data-state='delayed-open'][data-side='right'] {
  animation-name: slideLeftAndFade;
}
.trupeer-ai-shadow-dom.TooltipContent[data-state='delayed-open'][data-side='bottom'] {
  animation-name: slideUpAndFade;
}
.trupeer-ai-shadow-dom.TooltipContent[data-state='delayed-open'][data-side='left'] {
  animation-name: slideRightAndFade;
}

@keyframes slideUpAndFade {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideRightAndFade {
  from {
    opacity: 0;
    transform: translateX(-2px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideDownAndFade {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideLeftAndFade {
  from {
    opacity: 0;
    transform: translateX(2px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

#trupeer-ai-ui [data-radix-popper-content-wrapper] { z-index: 999999999999!important; } 

.trupeer-ai-shadow-dom .CanvasContainer {
	position: fixed;
	pointer-events: all!important;
	top: 0px!important;
	left: 0px!important;
	z-index: 99999999999!important;
}
.trupeer-ai-shadow-dom .canvas {
	position: fixed;
	top: 0px!important;
	left: 0px!important;
	z-index: 99999999999!important;
	background: transparent!important;
}
.trupeer-ai-shadow-dom .canvas-container {
	top: 0px!important;
	left: 0px!important;
	z-index: 99999999999;
	position: fixed!important;
	background: transparent!important;
}

.TrupeerAIDropdownMenuContent {
	z-index: 99999999999!important;
  min-width: 200px;
  background-color: white;
  margin-top: 4px;
  margin-right: 8px;
  padding-top: 12px;
  padding-bottom: 12px;
  border-radius: 15px;
  z-index: 99999;
  font-family: 'Satoshi-Medium', sans-serif;
  color: #29292F;
  box-shadow: 0px 10px 38px -10px rgba(22, 23, 24, 0.35),
    0px 10px 20px -15px rgba(22, 23, 24, 0.2);
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}
.TrupeerAIDropdownMenuContent[data-side="top"] {
  animation-name: slideDownAndFade;
}
.TrupeerAIDropdownMenuContent[data-side="right"] {
  animation-name: slideLeftAndFade;
}
.TrupeerAIDropdownMenuContent[data-side="bottom"] {
  animation-name: slideUpAndFade;
}
.TrupeerAIDropdownMenuContent[data-side="left"] {
  animation-name: slideRightAndFade;
}
.TrupeerAIItemIndicator {
  position: absolute;
  right: 12px; 
  width: 18px;
  height: 18px;
  background: #6f66c5;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.TrupeerAIDropdownMenuItem,
.TrupeerAIDropdownMenuRadioItem {
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 5px;
  position: relative;
  padding-left: 22px;
  padding-right: 22px;
  user-select: none;
  outline: none;
}
.TrupeerAIDropdownMenuItem:hover {
    background-color: #F6F7FB !important;
    cursor: pointer;
}
.TrupeerAIDropdownMenuItem[data-disabled] {
  color: #6E7684; !important;
  cursor: not-allowed;
  background-color: #F6F7FB !important;
}



@keyframes slideUpAndFade {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideRightAndFade {
  from {
    opacity: 0;
    transform: translateX(-2px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideDownAndFade {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideLeftAndFade {
  from {
    opacity: 0;
    transform: translateX(2px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

`}</style>
    </div>
  );
};

export default Content;
