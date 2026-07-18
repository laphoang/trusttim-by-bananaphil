import { randomUUID } from "crypto";

export interface EmergencyCase {
  caseId: string;
  message: string;
  matchedSignals: string[];
  createdAt: string;
}

/**
 * Raises a mocked emergency support case on a `serious` verdict (Architecture guide §6.1): logs
 * the message + signals + timestamp and simulates notifying the hospital's emergency/CSKH channel.
 * Clearly simulated — no real paging integration exists.
 */
export function raiseEmergencyCase(message: string, matchedSignals: string[]): EmergencyCase {
  const emergencyCase: EmergencyCase = {
    caseId: randomUUID(),
    message,
    matchedSignals,
    createdAt: new Date().toISOString(),
  };
  console.warn("[MOCK EMERGENCY CASE] notifying hospital emergency/CSKH channel:", emergencyCase);
  return emergencyCase;
}
