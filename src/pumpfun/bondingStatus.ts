import { NormalizedPumpToken } from "./providers/ProviderInterface.js";

export function isStillBonding(token: NormalizedPumpToken): boolean {
  if (token.isGraduated === true) {
    return false;
  }

  if (typeof token.bondingCurveProgress === "number" && token.bondingCurveProgress >= 100) {
    return false;
  }

  return true;
}
