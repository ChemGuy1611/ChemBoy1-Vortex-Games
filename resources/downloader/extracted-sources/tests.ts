"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRequirementVersion = void 0;
const semver_1 = __importDefault(require("semver"));
const downloader_1 = require("./downloader");
async function testRequirementVersion(api, requirement) {
    const t = api.translate;
    if (!(requirement === null || requirement === void 0 ? void 0 : requirement.resolveVersion)) {
        return;
    }
    const currentVersion = await requirement.resolveVersion(api);
    const latest = await (0, downloader_1.getLatestGithubReleaseAsset)(api, requirement);
    if (!latest) {
        return;
    }
    const coercedVersion = semver_1.default.coerce(latest.release.tag_name);
    if (!semver_1.default.gt(coercedVersion.version, currentVersion)) {
        return;
    }
    const more = (dismiss) => {
        api.showDialog('question', 'Update Requirement', {
            bbcode: t('A new "{{reqName}}" update has been released "v{{latestVersion}}" - your modding environment is currently set to "v{{currentVersion}}".[br][/br][br][/br]'
                + 'Would you like to update? (if your modding environment is functioning correctly, there may be no reason to update.)', { replace: { reqName: requirement.userFacingName, currentVersion, latestVersion: coercedVersion.version } }),
        }, [
            {
                label: 'Download', default: true, action: () => {
                    (0, downloader_1.download)(api, [requirement]);
                    dismiss();
                }
            },
            { label: 'Close', action: () => dismiss() }
        ]);
    };
    const notificationId = `${requirement.archiveFileName}-update`;
    api.sendNotification({
        message: `${requirement.userFacingName} update available`,
        type: 'warning',
        allowSuppress: true,
        id: notificationId,
        actions: [
            { title: 'More', action: more },
            {
                title: 'Download', action: (dismiss) => {
                    (0, downloader_1.download)(api, [requirement]);
                    dismiss();
                }
            }
        ]
    });
}
exports.testRequirementVersion = testRequirementVersion;
