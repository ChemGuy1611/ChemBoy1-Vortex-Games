"use strict";

// Known oddities in individual templates, so the contract suite can stay strict for everything
// else. Shape: { "template-folder": { "check-name": "why this is accepted" } }.
//
// An entry is asserted to still be true: the check must keep failing for that template. When
// a template changes and the check starts passing, the suite goes red and the entry should be
// deleted. Entries record behavior that was reviewed and accepted.

// An installer that matches one exact marker file (an exe or dll name) has no FOMOD guard. A
// FOMOD package never contains that file, so the test is false for it anyway.
const MARKER_NO_FOMOD = "matches a single marker file, so a FOMOD package never triggers it";

module.exports = {
  "template-cobraengineACSE": {
    "installer-priority-unique": "save and fallback installers both register at 49",
    "installer-fomod": `ACSE, ACSE mod, localised and ovldata ${MARKER_NO_FOMOD}`,
  },
  "template-reloaded2": {
    "installer-fomod": `Reloaded manager ${MARKER_NO_FOMOD}`,
  },
  "template-shinryu": {
    "installer-priority-unique": "mod and root installers both register at 27",
  },
  "template-snowdropengine": {
    "installer-fomod": `mod loader and data subfolder ${MARKER_NO_FOMOD}`,
  },
  "template-unity-umm": {
    "modtype-priority": "UMM and Mods types sit at 8 and 10 to beat helper-extension mod types",
    "installer-priority-range": "root installer sits at 8 to run ahead of the UMM installers",
  },
};
