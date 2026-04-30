import { env } from "../../utils/env.js";
import { BitqueryPumpProvider } from "./BitqueryPumpProvider.js";
import { MoralisPumpProvider } from "./MoralisPumpProvider.js";
import { PumpFunProvider } from "./ProviderInterface.js";
import { PumpFunFrontendProvider } from "./PumpFunFrontendProvider.js";
import { PumpPortalProvider } from "./PumpPortalProvider.js";

export function createPumpProvider(): PumpFunProvider {
  switch (env.PUMP_PROVIDER) {
    case "pumpfun":
      return new PumpFunFrontendProvider();
    case "moralis":
      return new MoralisPumpProvider();
    case "bitquery":
      return new BitqueryPumpProvider();
    case "pumpportal":
    default:
      return new PumpPortalProvider();
  }
}
