"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRequirementVersion = exports.resolveVersionByPattern = exports.walkPath = exports.findDownloadIdByFile = exports.findModByFile = exports.download = exports.axios = void 0;
const axios_1 = __importDefault(require("axios"));
exports.axios = axios_1.default;
const downloader_1 = require("./downloader");
Object.defineProperty(exports, "download", { enumerable: true, get: function () { return downloader_1.download; } });
const tests_1 = require("./tests");
Object.defineProperty(exports, "testRequirementVersion", { enumerable: true, get: function () { return tests_1.testRequirementVersion; } });
const util_1 = require("./util");
Object.defineProperty(exports, "findModByFile", { enumerable: true, get: function () { return util_1.findModByFile; } });
Object.defineProperty(exports, "findDownloadIdByFile", { enumerable: true, get: function () { return util_1.findDownloadIdByFile; } });
Object.defineProperty(exports, "walkPath", { enumerable: true, get: function () { return util_1.walkPath; } });
Object.defineProperty(exports, "resolveVersionByPattern", { enumerable: true, get: function () { return util_1.resolveVersionByPattern; } });
function init(context) {
    return;
}
exports.default = init;
