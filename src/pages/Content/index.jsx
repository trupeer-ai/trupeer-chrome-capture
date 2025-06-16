import React from "react";
import { render } from "react-dom";
import Content from "./Content";

// Check if trupeer-ai-ui already exists, if so, remove it
const existingRoot = document.getElementById("trupeer-ai-ui");
if (existingRoot) {
  document.body.removeChild(existingRoot);
}

const root = document.createElement("div");
root.id = "trupeer-ai-ui";
document.body.appendChild(root);
render(<Content />, root);
