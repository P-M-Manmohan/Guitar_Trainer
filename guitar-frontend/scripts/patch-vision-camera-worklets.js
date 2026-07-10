const fs = require("node:fs");
const path = require("node:path");

const headerPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-vision-camera-worklets",
  "cpp",
  "JSIConverter+AsyncQueue.hpp",
);

if (!fs.existsSync(headerPath)) {
  console.error("VisionCamera Worklets header was not found. Run npm install first.");
  process.exitCode = 1;
  return;
}

const currentHeader = fs.readFileSync(headerPath, "utf8");
const sdk54Fallback = [
  "#if __has_include(<worklets/Public/AsyncQueue.h>)",
  "#include <worklets/Public/AsyncQueue.h>",
  "#elif __has_include(<worklets/RunLoop/AsyncQueue.h>)",
].join("\n");

if (currentHeader.includes(sdk54Fallback)) {
  console.log("VisionCamera Worklets SDK 54 compatibility patch is already applied.");
  return;
}

const upstreamStart = "#if __has_include(<worklets/RunLoop/AsyncQueue.h>)";
if (!currentHeader.includes(upstreamStart)) {
  console.error(
    "VisionCamera Worklets changed its AsyncQueue header layout; review the SDK 54 compatibility patch.",
  );
  process.exitCode = 1;
  return;
}

const patchedHeader = currentHeader.replace(upstreamStart, sdk54Fallback);
fs.writeFileSync(headerPath, patchedHeader);
console.log("Applied VisionCamera Worklets compatibility patch for Expo SDK 54.");
