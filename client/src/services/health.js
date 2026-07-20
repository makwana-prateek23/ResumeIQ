import api from "./api";

export function getHealth() {
  return api.get("/health");
}
