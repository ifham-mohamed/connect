import { checkContext } from "./context-check.mjs";
import { checkIndex } from "./update-index.mjs";
import { syncSkills } from "./sync-skills.mjs";
import { readCapabilities } from "./capabilities.mjs";

const errors = [...checkContext(), ...checkIndex(), ...syncSkills()];
try {
  readCapabilities();
} catch (error) {
  errors.push(`Invalid capability registry: ${error.message}`);
}
errors.forEach((error) => console.error(error));
if (!errors.length)
  console.log("Context, static indices and skill adapters are current.");
process.exitCode = errors.length ? 1 : 0;
