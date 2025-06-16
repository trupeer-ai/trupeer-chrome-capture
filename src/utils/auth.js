import { jwtDecode } from "jwt-decode";
import { getBackendBaseEndpoint } from "./constants";

export const DecodeToken = (token) => {
  return jwtDecode(token);
};

export const CheckTokenExpiry = (token) => {
  const currentTime = Date.now() / 1000;

  try {
    const jwtDecoded = jwtDecode(token);
    const expiryTime = jwtDecoded.exp;
    if (currentTime > expiryTime) {
      console.log("Previous access token expired");
      return true;
    }
    return false;
  } catch {
    return true;
  }
};

export async function CheckUserCredits(token) {
  const apiURL = `${getBackendBaseEndpoint()}/users/credits`;

  try {
    const response = await fetch(apiURL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseJson = await response.json();
    return responseJson.data.credits.workflowDraftCredits;
  } catch {
    console.log("Error fetching user credits");
    return 0;
  }
}
