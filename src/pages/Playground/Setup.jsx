import React, { useEffect, useState } from "react";

const Setup = () => {
	const tabUrl = window.location.href;
	const showMicrophoneWarning = !(tabUrl.includes("playground.html") && tabUrl.includes("chrome-extension://")); // Don't show in unsupported tabs


	useEffect(() => {
		// Inject content script
		const script = document.createElement("script");
		script.src = chrome.runtime.getURL("contentScript.bundle.js");
		script.async = true;
		document.body.appendChild(script);

		// Also inject CSS
		const style = document.createElement("link");
		style.rel = "stylesheet";
		style.type = "text/css";
		style.href = chrome.runtime.getURL("assets/fonts/fonts.css");
		document.body.appendChild(style);

		// Return
		return () => {
			document.body.removeChild(script);
			document.body.removeChild(style);
		};
	}, []);

	return (
		<div className="setupBackground">
			<div className="setupBackgroundSVG"></div>
			{showMicrophoneWarning && (
				<div className="setupContainer center">
					<div className="setupText center">
						<div className="setupEmoji">🎤</div>
						<div className="setupTitle">Microphone Access Required</div>
						<div className="setupDescription">
							<p>To use this extension, microphone access is required. Please enable microphone permissions in your browser settings, refresh the tab and try recording again. If you continue experiencing issues, please contact our support team at <a href="mailto:hello@trupeer.ai">hello@trupeer.ai</a></p>
						</div>
					</div>
				</div>
			)}
			<style>
				{`
				body {
					overflow: hidden;
					margin: 0px;
				}

				.setupInfo {
					margin-top: 20px;
				}
				a {
					text-decoration: none!important;
					color: #4C7DE2;
				}
				.setupBackgroundSVG {
					position: absolute;
					top: 0px;
					left: 0px;

					width: 100%;
					height: 100%;
					background: url('` +
					chrome.runtime.getURL("assets/helper/pattern-svg.svg") +
					`') repeat;
					background-size: 62px 23.5px;
					animation: moveBackground 138s linear infinite;
				}

				@keyframes moveBackground {
					0% {
						background-position: 0 0;
					}
					100% {
						background-position: 100% 0;
					}
				}


				.setupBackground {
					background-color: #f5f5f5;
					height: 100vh;
					width: 100vw;
					display: flex;
					justify-content: center;
					align-items: center;
				}

				.setupContainer {
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					z-index: 999;
					display: flex;
					justify-content: center;
					align-items: center;
					width: 60%;
					height: fit-content;
					background-color: #fff;
					border-radius: 30px;
					padding: 50px 50px;
					gap: 80px;
					font-family: 'Satoshi-Medium', sans-serif;
				}

				.setupImage {
					width: 70%;
					display: flex;
					justify-content: center;
					align-items: center;
				}

				.setupImage img {
					width: 100%;
					border-radius: 30px;
				}

				.setupText {
					width: 50%;
					display: flex;
					flex-direction: column;
					justify-content: left;
					align-items: left;
					text-align: left;
				}

				.setupEmoji {
					font-size: 20px;
					margin-bottom: 10px;
				}

				.setupTitle {
					font-size: 20px;
					font-weight: bold;
					margin-bottom: 10px;
					color: #29292F;
				}

				.setupDescription {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: left;
					margin-top: 10px;
					color: #6E7684;
					font-size: 14px;
				}

				.setupStep {
					margin-bottom: 10px;
					vertical-align: middle;
				}

				.setupStep span {

					align-items: center;
					justify-content: center;
					text-align: center;
					width: 20px;
					height: 20px;
					padding: 2px;
					border-radius: 30px;
					display: inline-flex;
					vertical-align: middle;
					margin-left: 3px;
					margin-right: 3px;
					background-color: #F4F2F2;
				}

				.setupStep img {
					width: 100%;
					text-align: center;
					display: block;
				}

				.center {
					text-align: center!important;
				}
				.setupText.center {
					width: auto!important;
				}
				.setupContainer.center {
					width: 40%!important;
				}



				`}
			</style>
		</div>
	);
};

export default Setup;
