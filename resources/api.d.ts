import { FSWatcher, Stats, WriteStream, constants } from "fs";
import { ClientRequest, IncomingMessage } from "http";
import { Readable } from "stream";

import {
  EndorsedStatus,
  ICollection,
  ICollectionManifest,
  ICollectionSearchOptions,
  ICollectionSearchResult,
  IDownloadURL,
  IFeedbackResponse,
  IFileInfo,
  IIssue,
  IModFileContentPage,
  IModFileContentPageQuery,
  IModFileContentSearchFilter,
  IModInfo,
  IModRequirements,
  IPreference,
  IPreferenceQuery,
  IRevision,
  RatingOptions,
} from "@nexusmods/nexus-api";
import * as Promise$1 from "bluebird";
import PromiseBB, { default as PromiseBB$1 } from "bluebird";
import { BrowserWindow } from "electron";
import * as fs from "fs-extra";
import I18next, { TFunction, TOptions, i18n } from "i18next";
import {
  IHashResult,
  ILookupResult,
  IModInfo as IModInfo$1,
  IQuery,
  IReference,
  IReference as IReference$1,
  IReference as IReference$2,
  IRule,
  IRule as IRule$1,
  IServer,
} from "modmeta-db";
import SevenZip from "node-7z";
import {
  accessSync,
  appendFileSync,
  closeSync,
  createReadStream,
  createWriteStream,
  linkSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  watch,
  writeFileSync,
  writeSync,
} from "original-fs";
import * as React$2 from "react";
import React$1, { CSSProperties, FC, MouseEventHandler, ReactNode } from "react";
import {
  Button,
  Dropdown,
  DropdownButton,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  NavItem,
  Overlay,
  OverlayTrigger,
  SelectCallback,
} from "react-bootstrap";
import { WithTranslation } from "react-i18next";
import { ReactSelectProps } from "react-select";
import * as Redux from "redux";
import { Action, AnyAction } from "redux";
import * as reduxAct from "redux-act";
import { ComplexActionCreator } from "redux-act";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { OutputSelector } from "reselect";
import * as semver from "semver";
//#endregion
//#region lib/extensions/download_management/types/IDownload.d.ts
type RedownloadMode = "always" | "never" | "ask" | "replace";
type DownloadState =
  | "init"
  | "started"
  | "paused"
  | "finalizing"
  | "finished"
  | "failed"
  | "redirect";
interface IDownloadFailCause {
  htmlFile?: string;
  message?: string;
}
/**
 * Metadata for Nexus Mods downloads
 */
interface INexusModMeta {
  archived?: boolean;
  details?: {
    author?: string;
    category?: string;
    description?: string;
    fileId?: string;
    homepage?: string;
    modId?: string;
  };
  domainName?: string;
  expires?: number;
  fileMD5?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileVersion?: string;
  gameId?: string;
  logicalFileName?: string;
  source?: string;
  sourceURI?: string;
  status?: string;
}
/**
 * Extended mod info structure with common properties
 */
interface IModInfo$2 {
  collectionSlug?: string;
  game?: string;
  meta?: INexusModMeta;
  name?: string;
  nexus?: {
    ids?: {
      collectionSlug?: string;
      collectionId?: number;
      fileId?: number;
      gameId?: string;
      modId?: number;
      revisionId?: number;
      revisionNumber?: number;
    };
    /**
     * Id of the collection that triggered this download as a dependency, when the
     * download is a mod installed as part of a collection. Kept distinct from
     * `ids.collectionId` (which marks the download as being the collection archive
     * itself) so it doesn't propagate into the installed mod's attributes via the
     * install attribute extractor. Consumed by Mixpanel mod download analytics.
     */
    parentCollectionId?: string;
    /** Revision of the collection in `parentCollectionId`. Set together with it; analytics only. */
    parentRevisionId?: string;
    fileInfo?: IFileInfo;
    [key: string]: any;
  };
  referenceTag?: string;
  referenceTags?: string[];
  revisionNumber?: number;
  source?: string;
  [key: string]: any;
}
/**
 * download information
 *
 * @export
 * @interface IDownload
 */
interface IDownload {
  id: string;
  /**
   * current state of the download
   *
   * @memberOf IDownload
   */
  state: DownloadState;
  /**
   * if the download failed, this will contain a more detailed description
   * of the error
   *
   * @type {IDownloadFailCause}
   * @memberOf IDownload
   */
  failCause?: IDownloadFailCause;
  /**
   * list of urls we know serve this file. Should be sorted by preference.
   * If download from the first url isn't possible, the others may be used
   *
   * @type {string}
   * @memberOf IDownload
   */
  urls: string[];
  /**
   * path of the file being downloaded to. This is relative to the base download
   * directory for the game and since we use a flat directory structure, this is
   * in practice just the file name
   *
   * @type {string}
   * @memberOf IDownload
   */
  localPath?: string;
  /**
   * id of the game(s) to which this archive is compatible.
   *
   * @type {string}
   * @memberOf IDownload
   */
  game: string[];
  /**
   * info about the mod being downloaded. This will
   * be associated with the mod entry after its installation
   *
   * @type {IModInfo}
   * @memberOf IDownload
   */
  modInfo: IModInfo$2;
  /**
   * id of the (last) mod installed from this archive. Will be undefined
   * while the archive is not installed. This will not be unset if the
   * mod is uninstalled, so to determine if the archive is actually installed
   * one has to look at the dictionary of installed mods
   */
  installed?: {
    gameId: string;
    modId: string;
  };
  /**
   * hash of the file data
   *
   * @type {string}
   * @memberOf IDownload
   */
  fileMD5?: string;
  /**
   * MS timestamp the download was started
   */
  startTime: number;
  /**
   * MS timestamp the file finished downloading
   */
  fileTime: number;
  /**
   * size in bytes
   *
   * @type {number}
   * @memberOf IDownload
   */
  size: number;
  /**
   * number of bytes received so far
   *
   * @type {number}
   * @memberOf IDownload
   */
  received: number;
  /**
   * number of bytes hashed during finalizing
   */
  verified: number;
  /**
   * whether the download server supports resuming downloads
   */
  pausable?: boolean;
  /**
   * number of times this download has been resumed after a pause/interruption.
   * Persisted, so it accumulates across app restarts (free users pause/resume the
   * same download over multiple days). Surfaced on download analytics as pause_count.
   */
  pauseCount?: number;
}
//#endregion
//#region lib/extensions/download_management/types/IDownloadRemoveOptions.d.ts
interface IDownloadRemoveOptions {
  silent?: boolean;
  /** If true, skip the confirmation dialog (caller already confirmed with user) */
  confirmed?: boolean;
}
//#endregion
//#region lib/extensions/download_management/types/IChunk.d.ts
interface IChunk {
  url: () => PromiseBB$1<string>;
  received: number;
  offset: number;
  size: number;
}
//#endregion
//#region lib/extensions/download_management/types/IDownloadResult.d.ts
interface IDownloadResult {
  filePath: string;
  headers: any;
  unfinishedChunks: IChunk[];
  hadErrors: boolean;
  size: number;
  metaInfo: any;
}
//#endregion
//#region lib/extensions/download_management/types/IStartDownloadOptions.d.ts
interface IStartDownloadOptions {
  allowInstall?: boolean | "force";
  allowOpenHTML?: boolean;
}
//#endregion
//#region lib/extensions/download_management/types/IDownloadsAPIExtension.d.ts
interface IDownloadsAPIExtension {
  removeDownload?: (downloadId: string, options?: IDownloadRemoveOptions) => Promise<void>;
  pauseDownload?: (downloadId: string) => Promise<void>;
  resumeDownload?: (downloadId: string, options?: IStartDownloadOptions) => Promise<void>;
  startDownload?: (
    urls: string[],
    modInfo: any,
    fileName: string,
    redownload?: RedownloadMode,
    options?: IStartDownloadOptions,
  ) => Promise<IDownloadResult>;
}
//#endregion
//#region lib/extensions/file_based_loadorder/types/types.d.ts
type LockedState = true | false | "true" | "false" | "always" | "never";
type LoadOrder = ILoadOrderEntry$1[];
interface IItemRendererProps {
  loEntry: ILoadOrderEntry$1;
  displayCheckboxes: boolean;
  invalidEntries?: IInvalidResult[];
  position?: number;
  lockedEntriesCount?: number;
  setRef?: (ref: any) => void;
}
interface ILoadOrderEntry$1<T = any> {
  id: string;
  enabled: boolean;
  name: string;
  locked?: LockedState;
  modId?: string;
  data?: T;
}
interface IInvalidResult {
  id: string;
  reason: string;
}
interface IValidationResult {
  invalid: IInvalidResult[];
}
interface ILoadOrderGameInfo {
  gameId: string;
  /**
   * Defaults to true unless specified otherwise.
   * Will add a checkbox for each load order entry.
   * The checkboxes will control the LO entry's "enabled" property.
   */
  toggleableEntries?: boolean;
  /**
   * Defaults to true unless specified otherwise.
   *  The load order will get cleared upon purge by default.
   * Set this to false if you want to preserve the load order.
   */
  clearStateOnPurge?: boolean;
  /**
   * Extension developers are able to provide usage instructions to be displayed
   *  in the load order page alongside the load order panel.
   *  Default instructions will be provided if custom instructions aren't provided.
   */
  usageInstructions?: string | React.ComponentType<React.PropsWithChildren<{}>>;
  /**
   * Extension developers are able to provide a custom item renderer for the
   *  load order page. This will get rendered instead of the default one.
   */
  customItemRenderer?: React.ComponentType<
    React.PropsWithChildren<{
      className?: string;
      item: IItemRendererProps;
      forwardedRef?: (ref: any) => void;
    }>
  >;
  /**
   * Set to true if a custom item renderer produces rows of a single, uniform
   *  height. The load order page virtualizes long lists (rendering only the
   *  rows on screen), which requires uniform row heights; the default renderer
   *  guarantees this, so custom renderers must opt in.
   */
  uniformRowHeight?: boolean;
  /**
   * By default the FBLO extension will attempt to automatically generate the data
   *  required when publishing/exporting a collection; the noCollectionGeneration
   *  property allows game extensions to opt out of this functionality, which is useful
   *  if/when the default generation logic is insufficient for a particular game.
   */
  noCollectionGeneration?: boolean;
  /**
   * The load order page will call this functor whenever it is necessary
   *  to write a change to disk. It is up to the game extension developer to decide
   *  where/how to store this information,. Obviously - the data should be
   *  formatted in a way where it is easily deserializeable by the
   *  deserializeLoadOrder functor)
   *
   *  This functor will always be called AFTER the validate functor had
   *   a chance to ensure that any changes made to the LO are not invalid.
   *   (will not be called at all if change is not valid)
   *
   *  Expect the functor to be called whenever a load order change is
   *   applied (drag-drop, props update, etc.)
   *
   *  @param loadOrder An array consisting of load order objects which we want stored on disk.
   *    Please note that the load order array sent to the game extension's
   *    serialize functor will be sorted in the expected load order
   *
   *  @param prev the load order array state before serialization.
   */
  serializeLoadOrder: (loadOrder: LoadOrder, prev: LoadOrder) => Promise<void>;
  /**
   * Game extension should parse the Load Order file stored on disk using the
   *  same format used when serializing it in serializeLoadOrder and provide
   *  a populated load order array in the correct order.
   *
   * Please note that the validate functor will be called to verify the deserialized
   *  load order object immediately after the deserialization functor completes its
   *  operation to ensure that any newly inserted element (through manual intervention or
   *  through the game's interface) is valid.
   *
   * If for any reason the change is _not_ valid or the deserialization operation had failed,
   *  the load order will be reverted and locked until the the error is handled by
   *  the user. An error notification _will_ be raised notifying the user of any errors.
   *
   * Deserialization will be called:
   *  - As soon as the Load Order page is mounted/loaded.
   *
   *  - After the user exits a configured tool or the game to regenerate the LO
   *    in case the user had changed it while using said tool/game
   *
   *  - If the user changes profiles.
   *
   *  - On deploy/purge to ensure the user hadn't modified the mod list manually
   *    or through an external tool.
   *  @returns An object containing a deserialized array of LO entries.
   */
  deserializeLoadOrder: () => Promise<LoadOrder>;
  /**
   * Called to validate a load order object - it is the game extension's
   *  responsibility to ensure that the object is formatted correctly and that
   *  it does not breach any set rules (e.g. a locked entry had been moved to an invalid
   *  position)
   *
   * Functor is called:
   *
   * - Before serialization occurs to ensure we don't serialize and write invalid LO
   *
   * - After deserialization to ensure any invalid user tampering or changes made through the
   *   game UI is validated and removed if necessary.
   *
   * @param prev the load order array state before the serialization/deserialization
   *             functionality has been executed.
   *
   * @param current the load order array state we either want to serialize, or have
   *                deserialized and want to ensure its valid.
   *
   * @returns a validation result specifying any invalid entries - these will be displayed
   *          to the user in the load order page (accompanied by an error notification)
   *          validation passes if the validate function call returns undefined, signifying
   *          that no invalid entries have been found.
   *
   */
  validate: (prev: LoadOrder, current: LoadOrder) => Promise<IValidationResult>;
  /**
   * Predicate to allow the game extension to decide wheter the load order page should be visible
   *  (In case the game extension wants to hide or switch between different LO management logic)
   * @returns true if the load order page should be visible, false otherwise.
   */
  condition?: () => boolean;
}
//#endregion
//#region lib/extensions/gamemode_management/types/IModType.d.ts
interface IModType {
  typeId: string;
  priority: number;
  isSupported: (gameId: string) => boolean;
  getPath: (game: IGame) => string;
  test: (installInstructions: IInstruction[]) => PromiseBB$1<boolean>;
  options: IModTypeOptions;
}
//#endregion
//#region lib/types/IExecInfo.d.ts
interface IExecInfo {
  execPath: string;
  arguments: string[];
}
//#endregion
//#region lib/types/IGameStoreEntry.d.ts
interface IGameStoreEntry {
  appid: string;
  name: string;
  gamePath: string;
  gameStoreId: string | undefined;
  priority?: number;
  lastUpdated?: Date;
  lastUser?: string;
}
//#endregion
//#region lib/types/IGameStore.d.ts
type GameLaunchType = "gamestore" | "commandline";
declare class GameStoreNotFound extends Error {
  private mName;
  constructor(name: any);
  get storeName(): string;
}
declare class GameEntryNotFound extends Error {
  private mName;
  private mStore;
  private mExistingNames;
  constructor(name: string, store: string, existing?: string[]);
  get gameName(): string;
  get storeName(): string;
  get existingGames(): string[];
}
interface ICustomExecutionInfo {
  appId: string;
  parameters: string[];
  launchType?: GameLaunchType;
}
/**
 * interface for game store extensions
 *
 * @interface IGameStore
 */
interface IGameStore {
  /**
   * This store's id.
   */
  id: string;
  /**
   * This store's name. If unset, will use the id instead of the name when
   * displaying to users
   */
  name?: string;
  /**
   * If a game is found on multiple stores, this controls which store is preferred (by default)
   * (lower means preferred)
   * This should be solely based on which store tends to be less problematic for modding
   * (stuff like DRM and such), not a subjective preference of the store.
   *
   * Values <= 30 are for stores that have features benefiting modding (no DRM GOG)
   * Values >= 70 are for stores that have features hindering modding (extra DRM Xbox)
   * Values between should all be ok, we only assign different values so the order is deterministic
   * and because some stores provide better meta information than others or have more robust
   * information
   */
  priority?: number;
  /**
   * Returns all recognized/installed games which are currently
   *  installed with this game store/launcher. Please note that
   *  the game entries should be cached to avoid running a potentially
   *  resource intensive operation for each game the user attempts to
   *  manage.
   */
  allGames: () => PromiseBB$1<IGameStoreEntry[]>;
  /**
   * Attempt to find a game entry using its game store Id/Ids.
   *
   * @param appId of the game entry. This is obviously game store specific.
   */
  findByAppId: (appId: string | string[]) => PromiseBB$1<IGameStoreEntry>;
  /**
   * Attempt to find a game store entry using the game's name.
   *
   * @param appName the game name which the game store uses to identify this game.
   */
  findByName: (appName: string) => PromiseBB$1<IGameStoreEntry>;
  /**
   * Returns the full path to the launcher's executable.
   *  As of 1.4, this function is no longer optional - gamestores
   *  such as the Xbox app which do not have a stat-able store path
   *  should return Promise.resolve(undefined) and define the
   *  "isGameStoreInstalled" function so that the game store helper
   *  is able to confirm that the gamestore is installed on the user's PC
   */
  getGameStorePath: () => PromiseBB$1<string | undefined>;
  /**
   * Launches the game using this game launcher.
   * @param appId whatever the game store uses to identify a game.
   * @param api gives access to API functions if needed.
   */
  launchGame: (appId: any, api?: IExtensionApi) => PromiseBB$1<void>;
  /**
   * Determine whether the game has been installed by this game store launcher.
   *  returns true if the game store installed this game, false otherwise.
   *
   * @param name of the game we're looking for.
   */
  isGameInstalled?: (name: string) => PromiseBB$1<boolean>;
  /**
   * In most cases the game store helper is fully capable of determining
   *  whether a gamestore is installed by stat-ing the store's executable.
   *
   * However, gamestores such as the Xbox store which do not have a stat-able
   *  executable path MUST provide this function so that the game store helper
   *  can confirm that the store is installed correctly!
   */
  isGameStoreInstalled?: () => PromiseBB$1<boolean>;
  /**
   * Some launchers may support Posix paths when attempting to launch a
   *  game, if set, the launcher will be expected to generate a valid
   *  posix path which Vortex can use to start the game.
   *
   * Please note that Vortex will not be able to tell if the game
   *  actually launched successfully when using Posix Paths; reason
   *  why this should only be used as a last resort.
   *
   * @param name of the game we want the posix path for.
   */
  getPosixPath?: (name: string) => PromiseBB$1<string>;
  /**
   * Game store may support command line arguments when launching the game.
   *  Function will return the path to the game store's executable and any required
   *  arguments to launch the game.
   *
   * @param appId - Whatever the game store uses to identify a game.
   */
  getExecInfo?: (appId: any) => PromiseBB$1<IExecInfo>;
  /**
   * Generally the game store helper should be able to launch games directly.
   *  This functor allows game stores to define their own custom start up logic
   *  if needed. e.g. gamestore-xbox
   */
  launchGameStore?: (api: IExtensionApi, parameters?: string[]) => PromiseBB$1<void>;
  /**
   * Allows game stores to provide functionality to reload/refresh their
   *  game entries. This is potentially a resource intensive operation and
   *  should not be called unless it is vital to do so.
   *
   * The game store helper is configured to call this function for all known
   *  game stores when a discovery scan is initiated.
   */
  reloadGames?: () => PromiseBB$1<void>;
  /**
   * determine if the specified game is managed by/installed through this store.
   * Stores don't have to implement this, as a fallback Vortex will go through
   * allGames from this store and see if one matches the path.
   * This function should only be implemented if there is a more reliable way to
   * connect this store to the game, like every gog game contains a gog.ico file
   * in the game root directory.
   * The fallback function can be used to invoke the "default" behavior on top.
   */
  identifyGame?: (
    gamePath: string,
    fallback: (gamePath: string) => PromiseLike<boolean>,
  ) => PromiseBB$1<boolean>;
}
//#endregion
//#region lib/util/GameStoreHelper.d.ts
interface IStoreQuery {
  id?: string;
  name?: string;
  prefer?: number;
}
/** Normalized form of one store's IGame.queryArgs entry. */
type IQueryArgEntry = string | IStoreQuery | IStoreQuery[];
/**
 * Normalize the polymorphic form `IGame.queryArgs` accepts (string app ID,
 * single query, or array) into a single array of IStoreQuery. Callers that
 * iterate per-store entries should funnel through this so the three forms
 * are handled in one place.
 */
declare function normalizeStoreQuery(raw: IQueryArgEntry | undefined): IStoreQuery[];
declare class GameStoreHelper {
  private mApi;
  private mStores;
  private mStoresDict;
  getGameStore(storeId: string): IGameStore | undefined;
  isGameInstalled(id: string, storeId?: string): PromiseBB$1<string | undefined>;
  isGameStoreInstalled(storeId: string): PromiseBB$1<boolean>;
  registryLookup(lookup: string): PromiseBB$1<IGameStoreEntry>;
  find: (query: { [storeId: string]: IQueryArgEntry }) => PromiseBB$1<IGameStoreEntry[]>;
  findByName(name: string | string[], storeId?: string): PromiseBB$1<IGameStoreEntry>;
  findByAppId(appId: string | string[], storeId?: string): PromiseBB$1<IGameStoreEntry>;
  launchGameStore(
    api: IExtensionApi,
    gameStoreId: string,
    parameters?: string[],
    askConsent?: boolean,
  ): PromiseBB$1<void>;
  identifyStore: (gamePath: string) => PromiseBB$1<string>;
  reloadGames(api?: IExtensionApi): PromiseBB$1<void>;
  /**
   * @returns list of stores, sorted by priority
   */
  storeIds(): IGameStore[];
  private isStoreRunning;
  private validInput;
  private getStores;
  /**
   * Returns a store entry for a specified pattern.
   * @param searchType dictates which functor we execute.
   * @param pattern the pattern we're looking for.
   * @param storeId optional parameter used when trying to query a specific store.
   */
  private findGameEntry;
}
declare const instance$2: GameStoreHelper;
//#endregion
//#region ../shared/dist/cli.d.ts
//#region src/types/cli.d.ts
interface IParameters {
  download?: string;
  install?: string;
  installArchive?: string;
  installExtension?: string;
  report?: string;
  restore?: string;
  startMinimized?: boolean;
  game?: string;
  profile?: string;
  get?: string[];
  set?: ISetItem[];
  del?: string[];
  merge?: string;
  run?: string;
  shared?: boolean;
  maxMemory?: string;
  disableGPU?: boolean;
  userData?: string;
  inspector?: boolean;
  storeVersion?: string;
}
interface ISetItem {
  key: string;
  value: string;
}
//#endregion
//#region ../shared/dist/errors-Cr1FSCUo.d.ts
//#region src/errors/base.d.ts
/**
 * Catalog of every error kind Vortex knows how to produce and classify.
 *
 * This map only contains kinds that clear one bar: something in the codebase
 * actually branches on that specific kind to do something categorically
 * different (a different UI flow, a different retry decision, a different
 * message). A raw OS/POSIX code that only ever varies a message string or
 * gets lumped into a generic "is this retryable" bucket does not get its own
 * kind, it becomes payload data (`originalCode`, `diagnosis`) on whichever
 * coarser kind actually matches. See `fs:*`/`os:generic`/`http:generic` below
 * for what that collapse looks like in practice.
 *
 * The kinds declared here fall into two categories:
 *
 * - **Mechanical** (`fs:*`, `http:*`, `os:*`): filesystem, network, and OS
 *   failures.
 * - **Domain-generic**: Vortex business concepts that apply
 *   uniformly no matter which subsystem is running (`user-canceled`,
 *   `data-invalid`, etc). These are also the kinds backing the 10
 *   `vortex-api` compatibility classes third-party extensions already use,
 *   so they live here for API stability as well as universality.
 *
 * Everything else, errors specific to one subsystem does not belong in this
 * file. It gets added via TypeScript declaration merging, right next to
 * wherever it's thrown:
 *
 * ```typescript
 * declare module "@vortex/shared/errors" {
 *   interface VortexErrorKindMap {
 *     "load-order:validation-failed": { loadOrderEntryNames: string };
 *   }
 * }
 * ```
 *
 * @public
 */
interface VortexErrorKindMap {
  /** An argument was invalid. */
  "argument-invalid": {
    argument: string;
  };
  /** Input data failed validation. */
  "data-invalid": {
    field?: string;
  };
  /** A required external interpreter/tool isn't installed. */
  "missing-interpreter": {
    url?: string;
  };
  /** The requested feature isn't available. */
  "not-supported": {
    feature?: string;
  };
  /** Code (not the user) canceled an operation. */
  "process-canceled": {
    extraInfo?: unknown;
  };
  /** The user explicitly canceled an operation. */
  "user-canceled": {
    skipped: boolean;
  };
  /** Initialization/configuration of a component failed. */
  "setup-error": {
    component?: string;
  };
  /**
   * Generic "resource doesn't exist" at the application level.
   * Use `fs:not-found` instead for an OS-level missing file/directory.
   */
  "not-found": {
    resourceType?: string;
  };
  /** A specific game could not be found/matched. */
  "game-not-found": {
    gameId: string;
  };
  /** Dependency rules produced a circular reference. Each inner array is one cycle's chain of names. */
  "cycle-error": {
    cycles: string[][];
  };
  "fs:already-exists": FileSystemErrorData;
  "fs:directory-not-empty": FileSystemErrorData;
  "fs:no-permissions": FileSystemErrorData;
  "fs:no-space": FileSystemErrorData;
  "fs:not-a-directory": FileSystemErrorData;
  "fs:not-a-file": FileSystemErrorData;
  "fs:not-found": FileSystemErrorData;
  "http:bad-status": {
    url: string;
    statusCode: number;
  };
  "http:precondition-failed": {
    url: string;
  };
  "http:protocol-violation": {
    url: string;
  };
  "http:timeout": {
    url: string;
  };
  /** Catch-all for a failed request that isn't one of the above. */
  "http:generic": {
    url: string;
  } & Partial<OsErrorData>;
  /** The downloaded content is an HTML page. */
  "download:is-html": {
    url: string;
  };
  /** Resolving a download URL failed. */
  "download:resolver-error": {};
  /** The requested operation isn't available on this operating system. */
  "os:unsupported": {};
  /**
   * Catch-all for a recognized-but-otherwise-uncategorized OS-level failure
   * (hardware defects, filesystem corruption, quota limits, transient
   * resource exhaustion like EMFILE/EBUSY, generic network/TLS codes with no
   * request context). `originalCode` carries the raw code for logging and
   * message lookup; it is not meant to be branched on.
   */
  "os:generic": OsErrorData;
  /**
   * Nothing above matched. The parser/classifier that produced this
   * genuinely doesn't know what happened. Deliberately the only kind allowed
   * to be a true junk-drawer, everything else in this map earns its place by
   * being something code actually branches on.
   */
  unknown: Record<string, unknown>;
}
/**
 * Payload shared by mechanical OS-level errors.
 * @public
 * */
type OsErrorData = {
  originalCode: string;
  errno: number;
  syscall: string;
};
/**
 * Payload for filesystem errors.
 * @public
 * */
type FileSystemErrorData = Partial<OsErrorData> & {
  path: string;
};
/**
 * Union of every kind name currently known, derived from `VortexErrorKindMap`.
 * Grows automatically when any module augments the map via `declare module`,
 * no separate registration step needed.
 *
 * @public
 */
type VortexErrorKind = keyof VortexErrorKindMap;
/**
 * Union of every possible `{ kind, ...payload }` shape, one member per entry
 * in `VortexErrorKindMap`. This is what `VortexError.data` actually holds:
 * a discriminated union keyed on `kind`, so narrowing on `data.kind` gives
 * you the correctly-typed payload for that specific kind.
 *
 * @public
 */
type VortexErrorData = {
  [K in VortexErrorKind]: {
    kind: K;
  } & VortexErrorKindMap[K];
}[VortexErrorKind];
/**
 * The one error class Vortex constructs. Identity lives in `data.kind`,
 * not in the class prototype, because prototype identity doesn't survive
 * every boundary Vortex has.
 *
 * `instanceof VortexError` still works for the narrow set of cases that need
 * it, but internal code should prefer checking `.data.kind`.
 *
 * @public
 */
declare class VortexError<out K extends VortexErrorKind = VortexErrorKind> extends Error {
  /** Error data keyed on the error kind. */
  readonly data: {
    [P in K]: {
      kind: P;
    } & VortexErrorKindMap[P];
  }[K];
  /**
   * Whether the root cause is transient (retrying may succeed without any
   * other change), e.g. too many open files, a resource temporarily busy.
   *
   * Only describes the root cause, not whether the specific operation that
   * failed is safe to retry, that's a decision for the caller.
   */
  readonly isTransient: boolean;
  /**
   * @param message Human-readable, display-ready message. No deferred
   *   template placeholders, resolve any context (paths, URLs) before
   *   constructing the error.
   * @param data The `{ kind, ...payload }` for this error. `kind` decides
   *   which payload shape TypeScript requires here.
   * @param meta.isTransient Whether the root cause is transient. Defaults to
   *   `false`; only set `true` when the classifier constructing this error
   *   actually knows the underlying cause is temporary.
   * @param meta.cause The underlying error/value this one wraps, if any.
   */
  constructor(
    message: string,
    data: {
      [P in K]: {
        kind: P;
      } & VortexErrorKindMap[P];
    }[K],
    meta?: {
      isTransient?: boolean;
      cause?: unknown;
    },
  );
}
interface ReportableError {
  message: string;
  title?: string;
  subtitle?: string;
  code?: string;
  details?: string;
  stack?: string;
  extension?: string;
  path?: string;
  allowReport?: boolean;
  attachLog?: boolean;
  process?: "main" | "renderer";
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class UserCanceled extends VortexError<"user-canceled"> {
  skipped: boolean;
  constructor(skipped?: boolean);
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class DataInvalid extends VortexError<"data-invalid"> {
  constructor(message: string);
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class NotSupportedError extends VortexError<"not-supported"> {
  constructor();
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class ProcessCanceled extends VortexError<"process-canceled"> {
  constructor(message: string, extraInfo?: unknown);
  get extraInfo(): unknown;
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class ArgumentInvalid extends VortexError<"argument-invalid"> {
  constructor(argument: string);
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class SetupError extends VortexError<"setup-error"> {
  constructor(message: string, component?: string);
  get component(): string | undefined;
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class MissingInterpreter extends VortexError<"missing-interpreter"> {
  constructor(message: string, url?: string);
  get url(): string | undefined;
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class NotFound extends VortexError<"not-found"> {
  constructor(what: string);
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class CycleError extends VortexError<"cycle-error"> {
  constructor(cycles: string[][]);
  get cycles(): string[][];
}
/**
 * @public
 * @deprecated Use `VortexError` directly
 */
declare class GameNotFound extends VortexError<"game-not-found"> {
  constructor(search: string);
  get search(): string;
}
//#endregion
//#region ../shared/dist/download-BEmOtO02.d.ts
//#region src/types/download.d.ts
/**
 * A range starting at 0 with a length of 500 bytes is represented as start=0, end=499
 */
type ByteRange = {
  start: number;
  end: number;
};
type DownloadCheckpoint<T = unknown> = {
  downloadId: string;
  resource: T;
  dest: string;
  completedRanges: ByteRange[];
  etag: string | undefined;
};
//#endregion
//#region lib/extensions/category_management/types/ICategoryDictionary.d.ts
interface ICategory {
  name: string;
  parentCategory: string;
  order: number;
}
interface ICategoryDictionary {
  [id: string]: ICategory;
}
//#endregion
//#region lib/types/ITool.d.ts
/**
 * static information about a tool associated with a game.
 * This info is used to discover such tools and to store that
 * data after discovery
 * It is also the base class for the IGame structure, representing
 * the games themselves
 *
 * @export
 * @interface ITool
 */
interface ITool {
  /**
   * internal name of the tool
   *
   * @type {string}
   */
  id: string;
  /**
   * human readable name used in presentation to the user
   *
   * @type {string}
   */
  name: string;
  /**
   * short/abbreviated variant of the name, still intended for presentation to the user
   * this is used when available space is limited. Try to keep it below 8 characters
   * (there is no fixed limit but layout may break if this is too long)
   * If none is set, falls back to name
   */
  shortName?: string;
  /**
   * path to the image that is to be used as the logo for this tool.
   * Please note: The logo should be easily recognizable and distinguishable from
   * other tools.
   * For game logos consider this:
   *  - it is especially important to consider distinguishability between different
   *    games of the same series.
   *  - Preferably the logo should *not* contain the game name because Vortex will display
   *    the name as text near the logo. This way the name can be localised.
   *  - Background should be transparent. The logo will be resized preserving aspect
   *    ratio, the canvas has a 2:3 (portrait) ratio (400x600). This image also serves
   *    as the offline fallback for the game tile on the Games page (which otherwise
   *    uses the Nexus tile.jpg), so authoring it at 2:3 avoids an awkward crop.
   *
   * @type {string}
   */
  logo?: string;
  /**
   * determine installation path of this tool/game
   * This function should return quickly and, if it returns a value,
   * it should definitively be the valid tool/game path. Usually this function
   * will query the path from the registry or from steam.
   * This function may return a promise and it should do that if it's doing I/O
   *
   * This may be left undefined but then the location for the tool/game can only be set
   * manually
   */
  queryPath?: () => string | PromiseBB$1<string | IGameStoreEntry>;
  /**
   * return the path of the tool executable relative to the tool base path,
   * i.e. binaries/UT3.exe or TESV.exe
   * This is a function so that you can return different things based on
   * the operating system for example but be aware that it will be evaluated at
   * application start and only once, so the return value can not depend on things
   * that change at runtime.
   *
   * Optional: Game extensions are free to ignore the parameter and they have
   *   to work if the parameter is undefined.
   *   executable will be called with the parameter set at the time the game is discovered.
   *   If there are multiple versions of the game with different executables, it can return
   *   the correct executable based on the variant installed.
   *   This is a synchronous function so game extensions will probably want to use something
   *   like fs.statSync to text for file existance
   */
  executable: (discoveredPath?: string) => string;
  /**
   * list of files that have to exist in the directory of this tool.
   * This is used by the discovery to identify the tool/game. Vortex will only accept
   * a directory as the tool directory if all these files exist.
   * Please make sure the files listed here uniquely identify the tool, something
   * like 'rpg_rt.exe' would not suffice (rpg_rt.exe is the binary name of a game
   * engine and appears in many games).
   *
   * Please specify as few files as possible, the more files specified here the slower
   * the discovery will be.
   *
   * Each file can be specified as a relative path (i.e. binaries/UT3.exe), the path
   * is then assumed to be relative to the base directory of the application. It's important
   * this is the case so that Vortex can correctly identify the base directory.
   *
   * You can actually use a directory name for this as well.
   *
   * Prefer to NOT use executables because those will differ between operating systems
   * so if the tool/game is multi-platform better use a data file.
   *
   * @type {string[]}
   */
  requiredFiles: string[];
  /**
   * list of parameters to pass to the tool
   *
   * @type {string[]}
   * @memberOf ITool
   */
  parameters?: string[];
  /**
   * variables to add to the environment when starting this exe. These are in addition to
   * (and replacing) existing variables that would be passed automatically.
   */
  environment?: {
    [key: string]: string;
  };
  /**
   * if true, the tool is expected to be installed relative to the game directory. Otherwise
   * the tool will be detected anywhere on the disk.
   */
  relative?: boolean;
  /**
   * if true, the tool will be run inside a shell
   */
  shell?: boolean;
  /**
   * if true, running this tool will block any other applications be run from vortex until it's
   * done. Defaults to false
   */
  exclusive?: boolean;
  /**
   * if set to true the process tool will be launched detached, that is: not part of Vortex's
   * process hierarchy
   */
  detach?: boolean;
  /**
   * if this tool is installed, use it as the primary tool (unless the user has manually set a
   * primary of course)
   * If multiple tools with this flag are installed it's effectively random which one gets picked,
   * we make no promises on any kind of consistency
   */
  defaultPrimary?: boolean;
  /**
   * what to do with Vortex when starting the tool. Default is to do nothing. 'hide' will minimize
   * Vortex and 'close' will make Vortex quit as soon as the tool is started.
   */
  onStart?: "hide" | "hide_recover" | "close";
}
//#endregion
//#region lib/types/IDiscoveredTool.d.ts
interface IDiscoveredTool extends ITool {
  path: string;
  hidden: boolean;
  custom: boolean;
  workingDirectory?: string;
  timestamp?: number;
}
//#endregion
//#region lib/extensions/gamemode_management/types/IDiscoveryResult.d.ts
/**
 * describes parameters for the game set by the user
 * or discovered automatically.
 * There are essentially two blocks of fields here:
 * one is to identify the local installation of the game
 * the other to override defaults as provided by the
 * game extension. This is particularly relevant for
 * games added by the user.
 *
 * @export
 * @interface IDiscoveryResult
 */
interface IDiscoveryResult {
  path?: string;
  pathSetManually?: boolean;
  store?: string;
  tools?: {
    [id: string]: IDiscoveredTool;
  };
  environment?: {
    [key: string]: string;
  };
  hidden?: boolean;
  id?: string;
  name?: string;
  shortName?: string;
  executable?: string;
  parameters?: string[];
  logo?: string;
  extensionPath?: string;
  mergeMods?: boolean;
  shell?: boolean;
}
//#endregion
//#region lib/extensions/gamemode_management/types/IToolStored.d.ts
interface IToolStored {
  id: string;
  name: string;
  shortName?: string;
  logo: string;
  executable: string;
  parameters: string[];
  environment: {
    [key: string]: string;
  };
  shell?: boolean;
  detach?: boolean;
  onStart?: "hide" | "hide_recover" | "close";
  exclusive?: boolean;
  defaultPrimary?: boolean;
}
//#endregion
//#region lib/extensions/gamemode_management/types/IGameStored.d.ts
/**
 * cached information about games.
 * Don't trunst this, avoid using it as dynamic information
 *   (e.g. the executable) that might be affected by which variant of the
 *   game is discovered will not be correct
 */
interface IGameStored {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  extensionPath?: string;
  imageURL?: string;
  requiredFiles: string[];
  executable: string;
  parameters?: string[];
  supportedTools?: IToolStored[];
  environment?: {
    [key: string]: string;
  };
  details?: {
    [key: string]: any;
  };
  shell?: boolean;
  contributed?: string;
  final?: boolean;
}
//#endregion
//#region lib/extensions/health_check/reducers/persistent.d.ts
interface IHealthCheckPersistentState {
  /**
   * Mod-level hide store: requiring mod nexusModId -> hidden requirement ids.
   * Persisted key kept as `hiddenRequirements` for backwards compat (selector is
   * `hiddenModRequirements`).
   */
  hiddenRequirements: {
    [modId: number]: string[];
  };
  /** File-level hide store: source file UID -> hidden requirement definition ids. */
  hiddenFileRequirements: {
    [sourceFileUID: string]: string[];
  };
  /**
   * Map of mod nexusModId to array of requirement IDs that have received feedback
   * Prevents users from submitting feedback multiple times for the same requirement
   */
  feedbackGiven: {
    [modId: number]: string[];
  };
  /** Whether mod requirements health check suggestions are enabled */
  modRequirementsEnabled: boolean;
  /** Whether file-level requirements health check suggestions are enabled */
  fileRequirementsEnabled: boolean;
}
//#endregion
//#region lib/types/IHealthCheck.d.ts
declare enum HealthCheckCategory {
  System = "system",
  Game = "game",
  Mods = "mods",
  Requirements = "requirements",
  Tools = "tools",
  Performance = "performance",
  Legacy = "legacy",
}
declare enum HealthCheckSeverity {
  Info = "info",
  Warning = "warning",
  Error = "error",
  Critical = "critical",
}
declare enum HealthCheckTrigger {
  Manual = "manual",
  Startup = "startup",
  GameChanged = "game-changed",
  ProfileChanged = "profile-changed",
  ModsChanged = "mods-changed",
  LoginChanged = "login-changed",
  SettingsChanged = "settings-changed",
  PluginsChanged = "plugins-changed",
  LootUpdated = "loot-updated",
  Scheduled = "scheduled",
}
interface IHealthCheckResult<TMetadata = unknown> {
  checkId: string;
  status: "passed" | "failed" | "warning" | "error";
  severity: HealthCheckSeverity;
  message: string;
  details?: string;
  metadata?: TMetadata;
  executionTime: number;
  timestamp: Date;
  fixAvailable?: boolean;
  isLegacyTest?: boolean;
}
/**
 * `signal` aborts once `timeout` elapses. A check that loops over mods, files or network calls
 * must poll it and return early: the registry cannot stop a body that ignores it, and holds the
 * check's slot until the body returns.
 */
type HealthCheckFunction = (
  api: IExtensionApi,
  signal?: AbortSignal,
) => Promise<IHealthCheckResult>;
type HealthCheckFixFunction = (api: IExtensionApi) => Promise<void>;
interface IHealthCheck {
  id: string;
  name: string;
  description: string;
  category: HealthCheckCategory;
  severity: HealthCheckSeverity;
  triggers: HealthCheckTrigger[];
  /** The game this check applies to; skipped while another is active. Omit to run for all. */
  gameId?: string;
  dependencies?: string[];
  timeout?: number;
  cacheDuration?: number;
  check: HealthCheckFunction;
  fix?: HealthCheckFixFunction;
  extensionName?: string;
}
interface ILegacyTestAdapter extends IHealthCheck {
  eventType: string;
  originalCheck: CheckFunction;
  fix?: HealthCheckFixFunction;
  isLegacyTest: true;
}
interface IHealthCheckEntry {
  healthCheck: IHealthCheck | IModHealthCheck | ILegacyTestAdapter;
  lastResult?: IHealthCheckResult;
  lastExecuted?: Date;
  enabled: boolean;
  cachedUntil?: Date;
}
/**
 * Context passed to a per-mod healthcheck for a single installed mod.
 *
 * - `files` lists paths relative to the mod's staging root.
 * - `readFile(p)` resolves a path under the mod root and returns its bytes.
 * - `attributes` reflects the attribute instructions emitted at install time
 *   (e.g. customFileName, author, version).
 */
interface IModCheckContext {
  modId: string;
  files: string[];
  readFile: (path: string) => Promise<Buffer>;
  attributes: Record<string, unknown>;
}
type PerModCheckFunction = (
  api: IExtensionApi,
  mod: IModCheckContext,
  signal?: AbortSignal,
) => Promise<IHealthCheckResult>;
/**
 * Per-mod variant of IHealthCheck. The registry iterates installed mods for the
 * active game, calls `checkMod` per mod, and aggregates the results.
 * Identical metadata fields to IHealthCheck, with `checkMod` in place of `check`.
 *
 * `fix` is also omitted from the inherited fields: `HealthCheckFixFunction`
 * takes only `(api)` and can't meaningfully fix a per-mod problem. A per-mod
 * fix shape can be added in the future if needed.
 */
interface IModHealthCheck extends Omit<IHealthCheck, "check" | "fix"> {
  checkMod: PerModCheckFunction;
}
/**
 * Type guard distinguishing the per-mod variant from a normal IHealthCheck.
 */
declare function isModHealthCheck(
  hc: IHealthCheck | IModHealthCheck | ILegacyTestAdapter,
): hc is IModHealthCheck;
//#endregion
//#region lib/extensions/health_check/reducers/session.d.ts
interface IHealthCheckSessionState {
  /** Results keyed by check ID */
  results: {
    [checkId: string]: IHealthCheckResult;
  };
  /** Check IDs that are currently running */
  runningChecks: string[];
  /** Timestamp of the last full health check run */
  lastFullRun?: number;
}
//#endregion
//#region lib/extensions/history_management/types.d.ts
interface IHistoryEvent {
  type: string;
  data: any;
  gameId: string;
  reverted?: boolean;
  id?: string;
  timestamp?: number;
}
/**
 * whether an event can be reverted.
 * yes means yes.
 * 'never' means that this type of event can never be reverted
 * 'invalid' means that this type of event can generally be reverted but this
 *   particular one can't - usually because some other event on the same data
 *   makes that impossible
 */
type Revertability = "yes" | "never" | "invalid";
interface IHistoryStack {
  /**
   * number of items to remember on the stack
   */
  size: number;
  /**
   * generate a (translated!) description for the entry
   */
  describe: (event: IHistoryEvent) => string;
  /**
   * generate a (translated!) description for the revert action.
   * Please be specific and concise on what exactly this does
   */
  describeRevert: (event: IHistoryEvent) => string;
  /**
   * determine if the event can be reverted
   */
  canRevert: (event: IHistoryEvent) => Revertability;
  /**
   * do revert the specified event
   */
  revert: (event: IHistoryEvent) => Promise<void>;
}
//#endregion
//#region lib/extensions/history_management/reducers.d.ts
interface IHistoryPersistent {
  historyStacks: {
    [key: string]: IHistoryEvent[];
  };
}
interface IHistoryState {
  stackToShow: string;
}
//#endregion
//#region lib/extensions/installer_fomod_shared/types/interface.d.ts
interface IHeaderImage {
  path: string;
  showFade: boolean;
  height: number;
}
type OrderType = "AlphaAsc" | "AlphaDesc" | "Explicit";
type GroupType =
  | "SelectAtLeastOne"
  | "SelectAtMostOne"
  | "SelectExactlyOne"
  | "SelectAll"
  | "SelectAny";
type PluginType = "Required" | "Optional" | "Recommended" | "NotUsable" | "CouldBeUsable";
interface IPlugin {
  id: number;
  selected: boolean;
  preset: boolean;
  name: string;
  description: string;
  image: string;
  type: PluginType;
  conditionMsg?: string;
}
interface IGroup {
  id: number;
  name: string;
  type: GroupType;
  options: IPlugin[];
}
interface IGroupList {
  group: IGroup[];
  order: OrderType;
}
interface IInstallStep {
  id: number;
  name: string;
  visible: boolean;
  optionalFileGroups?: IGroupList;
}
interface IInstallerInfoState {
  moduleName: string;
  image: IHeaderImage;
  dataPath: string;
}
interface IInstallerState {
  installSteps: IInstallStep[];
  currentStep: number;
}
type IChoices =
  | {
      name: string;
      groups: {
        name: string;
        choices: {
          name: string;
          idx: number;
        }[];
      }[];
    }[]
  | undefined;
type IChoiceType = {
  type: string;
  options: IChoices;
};
//#endregion
//#region lib/extensions/mod_management/types/IMod.d.ts
type ModState = "downloading" | "downloaded" | "installing" | "installed";
/**
 * Binary patches applied to a mod's files when it is installed as a dependency,
 * keyed by file path. The value is the hash of the baseline file the patch is
 * applied against.
 */
interface IModPatches {
  [filePath: string]: string;
}
/**
 * Attributes specific to Nexus Mods Collections (when IMod.type === "collection")
 */
interface ICollectionAttributes {
  collectionId: number;
  collectionSlug: string;
  revisionId: number;
  revisionNumber: number;
  downloadGame: string;
  customFileName?: string;
  shortDescription?: string;
  pictureUrl?: string;
  uploader?: string;
  uploaderId?: number;
  uploaderAvatar?: string;
  uploadedTimestamp?: number;
  updatedTimestamp?: number;
  rating?: {
    average: number;
    total: number;
  };
  recommendNewProfile?: boolean;
  installInstructions?: string;
  bugMessage?: string;
  modSize?: number;
}
/**
 * Common attributes shared by all mods
 */
interface ICommonModAttributes {
  author?: string;
  version?: string;
  modName?: string;
  modVersion?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  source?: string;
  fileName?: string;
  fileSize?: number;
  fileMD5?: string;
  logicalFileName?: string;
  additionalLogicalFileNames?: string[];
  customFileName?: string;
  downloadGame?: string;
  game?: string[];
  fileType?: string;
  modId?: number;
  fileId?: number;
  category?: string | number;
  homepage?: string;
  pictureUrl?: string;
  uploader?: string;
  uploaderUrl?: string;
  uploaderId?: number;
  uploadedTimestamp?: number;
  updatedTimestamp?: number;
  installTime?: string | Date;
  installedAsDependency?: boolean;
  referenceTag?: string;
  referenceTags?: string[];
  installerChoices?: IChoiceType;
  patches?: IModPatches;
  fileList?: IFileListItem[];
  newestVersion?: string;
  newestFileId?: number;
  allowRating?: boolean;
  endorsement?: string;
  endorsed?: string;
  scriptExtender?: boolean;
  is4GBPatcher?: boolean;
  isPrimary?: number | boolean;
  modSize?: number;
  bugMessage?: string;
}
/**
 * Comprehensive type for mod attributes that can be either common mod attributes,
 * collection-specific attributes, or any custom attributes
 */
type IModAttributes = Partial<ICommonModAttributes & ICollectionAttributes> & {
  [key: string]: any;
};
/**
 * represents a mod in all states (being downloaded, downloaded, installed)
 *
 * @interface IMod
 */
interface IMod {
  id: string;
  state: ModState;
  /**
   * mod type (empty string is the default)
   * this type is primarily used to determine how and where to deploy the mod, it
   * could be "enb" for example to tell vortex the mod needs to be installed to the game
   * directory. Different games will have different types.
   *
   * Special types:
   * - "" (empty string): Default mod type
   * - "collection": Nexus Mods collection
   * - "dinput": Direct input mod (e.g., 4GB patch)
   * - "enb": ENB graphics mod
   * - game-specific types defined by game extensions
   */
  type: string;
  archiveId?: string;
  installationPath: string;
  /**
   * dictionary of extended information fields
   *
   * Type-safe access to common attributes and collection attributes:
   * - Use ICommonModAttributes for standard mod properties (author, version, etc.)
   * - Use ICollectionAttributes when type === "collection"
   * - Index signature allows any custom attributes for game-specific extensions
   */
  attributes?: IModAttributes;
  rules?: IModRule[];
  enabledINITweaks?: string[];
  fileOverrides?: string[];
}
interface IModRepoId {
  gameId?: string;
  modId?: string;
  fileId: string;
}
interface IModReference extends IReference$2 {
  id?: string;
  idHint?: string;
  md5Hint?: string;
  tag?: string;
  archiveId?: string;
  repo?: {
    repository: string;
    campaign?: string;
  } & IModRepoId;
  description?: string;
  instructions?: string;
}
/**
 * a mod (requires/recommends) rule can provide a list of files to control how the referenced
 * mod is to be installed if it gets installed as a dependency.
 *
 * At this time Vortex does not verify whether an already-installed mod contains these files,
 * meaning the requires rule will not show red if these files get removed after installation
 * of the dependency.
 */
interface IFileListItem {
  path: string;
  md5?: string;
  xxh64?: string;
}
interface IDownloadHint {
  mode: "direct" | "browse" | "manual";
  url?: string;
  instructions?: string;
}
/**
 * A mod's "install spec": not which mod it is, but how it was installed - the
 * installer choices, file list, and binary patches. This is the data that
 * distinguishes the user-facing "variants" of a mod; it is NOT the named variant
 * itself (that is the `mod.attributes.variant` string). Declared here so IModRule,
 * IDependency and the install-spec matchers all draw the same three fields from a
 * single source rather than re-declaring them and risking drift.
 */
interface IModInstallSpec {
  installerChoices?: IChoiceType;
  fileList?: IFileListItem[];
  patches?: IModPatches;
}
/**
 * Free-form metadata bag carried on any mod rule (and copied onto the IDependency built
 * from it). The bag is general, not collection-specific: keys arrive from mod-metadata /
 * nexus dependency rules too (e.g. `rules` for nested dependencies, `onlyIfFulfillable`).
 * The named fields below are the common ones (most populated by the collection converter);
 * the index signature is kept deliberately so the bag stays open. Legacy `patches` /
 * `phase` may also live here on older rules; read those through ruleInstallSpec() /
 * rulePhase() rather than off `extra` directly.
 */
interface IModRuleExtra {
  author?: string;
  type?: string;
  category?: string;
  version?: string;
  url?: string;
  name?: string;
  instructions?: string;
  fileOverrides?: string[];
  localPath?: string;
  [key: string]: any;
}
interface IModRule extends IRule$1, IModInstallSpec {
  reference: IModReference;
  downloadHint?: IDownloadHint;
  phase?: number;
  extra?: IModRuleExtra;
  ignored?: boolean;
}
//#endregion
//#region lib/extensions/profile_management/types/IProfile.d.ts
interface IProfileMod {
  enabled: boolean;
  enabledTime: number;
  disabledTime?: number;
}
interface IProfile {
  id: string;
  gameId: string;
  name: string;
  modState: {
    [id: string]: IProfileMod;
  };
  lastActivated: number;
  pendingRemove?: boolean;
  features?: {
    [featureId: string]: any;
  };
}
//#endregion
//#region lib/types/collections/ICollectionInstallSession.d.ts
/**
 * Status of an individual mod within a collection installation.
 *
 * The live states are picked explicitly from a mod's ModState (the `keyof Pick<...>`):
 * picking a value that isn't a ModState is a compile error so the two can't drift, while
 * a newly added ModState is NOT silently absorbed. The rest are collection-only lifecycle
 * states with no IMod equivalent.
 */
type CollectionModStatus =
  | keyof Pick<Record<ModState, true>, "downloading" | "downloaded" | "installing" | "installed">
  | "pending"
  | "failed"
  | "ignored"
  | "optional";
/**
 * Information about a mod's installation within a collection
 */
interface ICollectionModInstallInfo {
  /** The mod rule that defines this dependency */
  rule: IModRule;
  /** Current status of this mod */
  status: CollectionModStatus;
  /** The installed mod reference (if installed) */
  modId?: string;
  /** Whether this is a required or optional mod */
  type: "requires" | "recommends";
  /** Installation phase for ordering */
  phase?: number;
}
/**
 * Overall collection installation session information
 */
interface ICollectionInstallSession {
  /** Unique session ID */
  sessionId: string;
  /** The collection mod being installed */
  collectionId: string;
  /** Profile ID where collection is being installed */
  profileId: string;
  /** Game ID */
  gameId: string;
  /** Map of mod rule IDs to their installation info */
  mods: {
    [ruleId: string]: ICollectionModInstallInfo;
  };
  /** Total number of required mods */
  totalRequired: number;
  /** Total number of optional mods */
  totalOptional: number;
  /** Number of mods successfully downloaded */
  downloadedCount: number;
  /** Number of mods successfully installed */
  installedCount: number;
  /** Number of mods that failed to install */
  failedCount: number;
  /** Number of optional mods skipped */
  ignoredCount: number;
  /**
   * Set when the stall watchdog force-resolved this session: remaining members were settled as
   * failed by the watchdog rather than by their own install attempts, so the install did not
   * genuinely finish. Drives the "installation incomplete" presentation and the failed outcome;
   * cleared when a new install round starts on the session.
   */
  stalled?: boolean;
}
interface ICollectionInstallState {
  /** Current active installation session (if any) */
  activeSession?: ICollectionInstallSession;
  /** ID of the last completed installation session */
  lastActiveSessionId?: string;
  /** History of completed/failed installation sessions */
  sessionHistory: {
    [sessionId: string]: ICollectionInstallSession;
  };
}
//#endregion
//#region lib/types/SortDirection.d.ts
type SortDirection = "none" | "asc" | "desc";
//#endregion
//#region lib/types/IAttributeState.d.ts
/**
 * user-configuration for mod attributes
 *
 * @export
 * @interface IAttributeState
 */
interface IAttributeState {
  enabled: boolean;
  sortDirection: SortDirection;
}
//#endregion
//#region lib/controls/bbcode/index.d.ts
/**
 * options that can be passed into the bbcode parser to configure how bbcode
 * tags are being translated.
 */
interface IBBCodeContext {
  /**
   * callbacks that can be triggered through the [link] or [url] tags
   * callback functions registered here can be triggered with
   * [url=cb://<callback name>/<arg1>/<arg2>/...] (arguments are optional of course)
   */
  callbacks?: {
    [name: string]: (...args: unknown[]) => void;
  };
  /**
   * if enabled, [link] or [url] tags may link to local files, which then get opened
   * with opn.
   * This should only be set for bbcode hard coded into Vortex, not bbcode taken from a
   * website or anything for security reasons
   */
  allowLocal?: boolean;
}
declare function preProcess(input: string): string;
declare function renderBBCode(input: string, context?: unknown): React$2.ReactChild[];
declare function bbcodeToHTML(input: string): string;
//#endregion
//#region lib/types/IDialog.d.ts
type DialogType = "success" | "info" | "error" | "question";
interface IDialogAction {
  label: string;
  default?: boolean;
  action?: () => void;
}
interface IConditionResult {
  actions: string[];
  errorText: string;
  id: string;
}
type ConditionResults = IConditionResult[];
type DialogActions = IDialogAction[];
type Condition = (content: IDialogContent) => ConditionResults;
interface IDialog {
  id: string;
  type: DialogType;
  title: string;
  content: IDialogContent;
  defaultAction: string;
  actions: string[];
}
interface IControlBase {
  id: string;
}
interface ICheckbox extends IControlBase {
  text?: string;
  bbcode?: string;
  value: boolean;
  disabled?: boolean;
  subText?: string;
}
interface IInput extends IControlBase {
  type?: "text" | "password" | "number" | "date" | "time" | "email" | "url" | "multiline";
  value?: string;
  label?: string;
  placeholder?: string;
}
interface ILink {
  label: string;
  id?: string;
  action?: (dismiss: () => void, id: string) => void;
}
type DialogContentItem =
  | "htmlFile"
  | "htmlText"
  | "text"
  | "message"
  | "bbcode"
  | "md"
  | "checkboxes"
  | "choices"
  | "input"
  | "links";
interface IDialogContent {
  htmlFile?: string;
  /**
   * displays a message as html.
   * NOTE: this will be inserted directy
   * into the dom so it must never be html from
   * an external source!
   *
   * @type {string}
   * @memberOf IDialogContent
   */
  htmlText?: string;
  /**
   * regular text. This will be wrapped, not selectable for the user,
   * not scrollable and not maintain any kind of predefined linebreaks.
   */
  text?: string;
  /**
   * regular text. This will be put into a scrollable, selectable textbox.
   * Whether the text wraps or not is determined by options.wrap
   */
  message?: string;
  bbcode?: string;
  md?: string;
  checkboxes?: ICheckbox[];
  choices?: ICheckbox[];
  input?: IInput[];
  /**
   * list of clickable entries that don't (necessarily) cause the dialog to close
   */
  links?: ILink[];
  parameters?: Record<string, string | number> & {
    count?: number;
  };
  options?: {
    translated?: boolean;
    wrap?: boolean;
    hideMessage?: boolean;
    bbcodeContext?: IBBCodeContext;
    linksAsButtons?: boolean;
    order?: DialogContentItem[];
  };
  condition?: Condition;
}
interface IDialogResult {
  action: string;
  input: any;
}
//#endregion
//#region lib/types/INotification.d.ts
type NotificationDismiss = () => void;
interface INotificationAction {
  icon?: string;
  title?: string;
  action: (dismiss: NotificationDismiss) => void;
}
type NotificationType = "activity" | "global" | "success" | "info" | "warning" | "error" | "silent";
/**
 * a notification message
 *
 * @export
 * @interface INotification
 */
interface INotification {
  /**
   * unique id of the notification. can be left out as
   * the notification system generates its own.
   * Manually set an id if you intend to programatically stop
   * the notification
   *
   * @type {NotificationType}
   * @memberOf INotification
   */
  id?: string;
  /**
   * the kind of notification to display. This mostly determines
   * its look but also features to a degree.
   * Possible values:
   *   - 'activity': a notification that represents an activity. will have a
   *                 spinner icon. Otherwise it looks like an info notification
   *   - 'global': This notification will always be visible, so if the window
   *               doesn't have the focus, this will be displayed as a native
   *               system notification. These notifications can not be
   *               programatically dismissed and actions are not supported
   *   - 'success': notification about a successful operation (ideally the
   *                user should be aware of the operation)
   *   - 'info': neutral information notification
   *   - 'error': Error notification (something went wrong)
   *
   * @type {NotificationType}
   * @memberOf INotification
   */
  type: NotificationType;
  /**
   * progress in percent (0-100). If set, the notification is a progress indicator
   */
  progress?: number;
  /**
   * path to an icon/image to display in the notification.
   * 'global' notifications displayed outside the window will always display an
   * icon so the user can tell which application it is from.
   * If no icon is specified this will fall back to the application icon.
   *
   * @type {string}
   * @memberOf INotification
   */
  icon?: string;
  /**
   * optional title. Should only be one or two words
   *
   * @type {string}
   * @memberOf INotification
   */
  title?: string;
  /**
   * the message to display. This shouldn't be long
   *
   * @type {string}
   * @memberOf INotification
   */
  message: string;
  /**
   * time the notification was created
   */
  createdTime?: number;
  /**
   * time the notification was last updated
   */
  updatedTime?: number;
  /**
   * replacement parameters for the localisation of title and message (the same
   * replacement dictionary will be used for both)
   */
  replace?: {
    [key: string]: any;
  };
  /**
   * control which part of the notification gets localized. default is true for both
   */
  localize?: {
    title?: boolean;
    message?: boolean;
  };
  /**
   * the duration to display the message. If this is undefined, the
   * message has to be dismissed by the user.
   * Giving a duration may be convenient for the user but it is impossible to
   * correctly estimate the time it takes a user to read a message. Please
   * take into consideration that a user may be forced to read the message in
   * a language not native to him and in general some people simply read slower
   * than others.
   * Also you can't assume the user starts reading the message immediately when
   * it gets displayed, he may be presented with multiple messages at once.
   * The ui may not even be visible at the time the message gets shown.
   *
   * Therefore: Absolutely never display an important message with a timer!
   *
   * As of Vortex 1.16.x, any notification with a timer will be raised
   *  as a toast notification (unless noToast is set)
   *
   * @type {number}
   * @memberOf INotification
   */
  displayMS?: number;
  /**
   * if set, notifications with the same group will be grouped together and shown as
   * one entry that can be expanded.
   */
  group?: string;
  /**
   * if set, no Dismiss button is provided automatically
   */
  noDismiss?: boolean;
  /**
   * if set, the notification will not be shown as a toast even if it has a displayMS
   */
  noToast?: boolean;
  /**
   * if set, the user may suppress the notification in the future
   */
  allowSuppress?: boolean;
  /**
   * actions to offer with the notification. These will be presented as buttons.
   * Due to limited space you should not have more than one or two actions and
   * usually combining actions with displayMS is probably a bad idea as it would
   * require the user to act in a limited time.
   *
   * @type {INotificationAction[]}
   * @memberOf INotification
   */
  actions?: INotificationAction[];
  /**
   * id of the process that triggered this action
   */
  process?: string;
  /**
   * callback invoked when the notification is dismissed (via the dismiss button
   * or programmatically). Useful when the caller needs to perform cleanup or
   * resolve a promise on dismiss.
   */
  onDismiss?: () => void;
}
//#endregion
//#region lib/types/VortexInstallType.d.ts
type VortexInstallType = "regular" | "managed";
//#endregion
//#region ../shared/dist/ipc-CLpNwcuz.d.ts
//#endregion
//#region src/types/logging.d.ts
type Level = "debug" | "info" | "warn" | "error";
type PersistorKey = string[];
/**
 * a persistor is used to hook a data file into the store.
 * This way any data file can be made available through the store and
 * updated through actions, as long as it can be represented in json
 */
interface IPersistor {
  setResetCallback(cb: () => PromiseLike<void>): void;
  getItem(key: PersistorKey): PromiseLike<string>;
  setItem(key: PersistorKey, value: string): PromiseLike<void>;
  removeItem(key: PersistorKey): PromiseLike<void>;
  getAllKeys(): PromiseLike<PersistorKey[]>;
  getAllKVs?(prefix?: string): PromiseLike<
    Array<{
      key: PersistorKey;
      value: string;
    }>
  >;
  bulkSetItem?(
    items: ReadonlyArray<{
      key: PersistorKey;
      value: string;
    }>,
  ): PromiseLike<void>;
  bulkRemoveItem?(keys: ReadonlyArray<PersistorKey>): PromiseLike<void>;
}
interface IPosition {
  x: number;
  y: number;
}
interface IDimensions {
  height: number;
  width: number;
}
interface IWindow {
  maximized: boolean;
  position?: IPosition;
  size: IDimensions;
  tabsMinimized: boolean;
  customTitlebar: boolean;
  minimizeToTray: boolean;
  useModernLayout: boolean;
}
/** Vortex application paths */
type VortexPaths = {
  base: string;
  base_unpacked: string;
  assets: string;
  assets_unpacked: string;
  modules: string;
  modules_unpacked: string;
  bundledPlugins: string;
  locales: string;
  package: string;
  package_unpacked: string;
  application: string;
  userData: string;
  appData: string;
  localAppData: string;
  temp: string;
  home: string;
  documents: string;
  exe: string;
  desktop: string;
};
//#endregion
//#region lib/types/IState.d.ts
/**
 * state regarding all manner of user interaction
 *
 * @export
 * @interface INotificationState
 */
interface INotificationState {
  notifications: INotification[];
  global_notifications: INotification[];
  dialogs: IDialog[];
}
type ExtensionLoadFailureException = {
  id: "exception";
  args: {
    message: string;
  };
};
type ExtensionLoadFailureDependency = {
  id: "dependency";
  args: {
    dependencyId: string;
    version?: string;
  };
};
type IExtensionLoadFailure =
  | {
      id: "unsupported-api" | "unsupported-version";
    }
  | ExtensionLoadFailureException
  | ExtensionLoadFailureDependency;
interface IExtensionOptional {
  id: string;
  extensionPath: string;
  args: {
    [key: string]: any;
  };
}
interface IProgress {
  text: string;
  percent: number;
}
interface IRunningTool {
  started: number;
  exclusive: boolean;
  pid: number;
}
interface IUIBlocker {
  icon: string;
  description: string;
  mayCancel: boolean;
}
interface IProgressWithProfile {
  profile?: IProgressProfile;
}
interface IProgressProfile {
  deploying?: IProgressProfileDeploying;
}
interface IProgressProfileDeploying {
  percent: number;
  text: string;
}
/**
 * "ephemeral" session state.
 * This state is generated at startup and forgotten at application exit
 *
 * @export
 * @interface ISession
 */
interface ISession {
  displayGroups: {
    [id: string]: string;
  };
  overlayOpen: boolean;
  visibleDialog: string;
  mainPage: string;
  secondaryPage: string;
  activity: {
    [id: string]: string[];
  };
  progress: {
    [group: string]: {
      [id: string]: IProgress;
    };
  } & IProgressWithProfile;
  settingsPage: string;
  extLoadFailures: {
    [extId: string]: IExtensionLoadFailure[];
  };
  toolsRunning: {
    [exeId: string]: IRunningTool;
  };
  uiBlockers: {
    [id: string]: IUIBlocker;
  };
  networkConnected: boolean;
  commandLine: IParameters;
  downloadGameFilter: string | null;
}
interface IRowState {
  selected: boolean;
  highlighted: boolean;
}
interface ITableState {
  attributes: {
    [id: string]: IAttributeState;
  };
  rows: {
    [id: string]: IRowState;
  };
  groupBy?: string;
  filter?: {
    [id: string]: any;
  };
}
interface IExtensionState {
  enabled: boolean | "failed";
  version: string;
  remove: boolean;
  endorsed: string;
  /** Display name of the extension. */
  name: string;
  /** Extension author display name. */
  author: string;
  /** Human-readable description of the extension. */
  description: string;
  /** Path to the extension folder on disk. */
  path: string;
  /** Nexus Mods mod ID for this extension. Identity key for mapping to available/manifest entries. */
  modId?: number;
  /** Nexus Mods file ID for this specific version of the extension. */
  fileId?: number;
  /** Extension type. */
  type?: ExtensionType;
  /** True for extensions shipped with Vortex (bundled plugins dir). Always false or absent for state entries. */
  bundled?: boolean;
}
/**
 * settings relating to the vortex application itself
 */
interface IApp {
  instanceId: string;
  version: string;
  appVersion: string;
  extensions: {
    [id: string]: IExtensionState;
  };
  warnedAdmin: number;
  installType: VortexInstallType;
  migrations: string[];
}
/**
 * settings relating to the user (os account) personally
 * even in a multi-user environment
 *
 * @export
 * @interface IUser
 */
interface IUser {
  multiUser: boolean;
}
interface ITableStates {
  [id: string]: ITableState;
}
interface IStateDownloads {
  speed: number;
  speedHistory: number[];
  files: {
    [id: string]: IDownload;
  };
  checkpoints: {
    [id: string]: DownloadCheckpoint<string>;
  };
}
interface IDashletSettings {
  enabled: boolean;
  width: number;
  height: number;
}
interface ISettingsInterface {
  language: string;
  advanced: boolean;
  profilesVisible: boolean;
  desktopNotifications: boolean;
  hideTopLevelCategory: boolean;
  relativeTimes: boolean;
  dashboardLayout: string[];
  foregroundDL: boolean;
  dashletSettings: {
    [dashletId: string]: IDashletSettings;
  };
  usage: {
    [usageId: string]: boolean;
  };
  tools?: {
    addToolsToTitleBar: boolean;
    order?: {
      [gameId: string]: string[];
    };
    pinned?: {
      [gameId: string]: {
        [toolId: string]: boolean;
      };
    };
  };
  primaryTool?: {
    [gameId: string]: string;
  };
}
interface ISettingsAutomation {
  deploy: boolean;
  install: boolean;
  enable: boolean;
  start: boolean;
  minimized: boolean;
}
interface ISettingsProfiles {
  activeProfileId: string;
  nextProfileId: string;
  lastActiveProfile: {
    [gameId: string]: string;
  };
}
interface ISettingsGameMode {
  discovered: {
    [id: string]: IDiscoveryResult;
  };
  searchPaths: string[];
  pickerLayout: "list" | "small" | "large";
  sortManaged: string;
  sortUnmanaged: string;
}
interface ISettingsDownloads {
  minChunkSize: number;
  maxChunks: number;
  maxParallelDownloads: number;
  maxBandwidth: number;
  path: string;
  showDropzone: boolean;
  showGraph: boolean;
  copyOnIFF: boolean;
  collectionsInstallWhileDownloading: boolean;
}
interface IStatePaths {
  base: string;
  download: string;
  install: string;
}
type InstallPathMode = "userData" | "suggested";
interface ISettingsMods {
  installPath: {
    [gameId: string]: string;
  };
  modlistState: {
    [id: string]: IAttributeState;
  };
  activator: {
    [gameId: string]: string;
  };
  installPathMode: InstallPathMode;
  suggestInstallPathDirectory: string;
  showDropzone: boolean;
  confirmPurge: boolean;
  cleanupOnDeploy: boolean;
  installerSandbox: boolean;
}
interface ISettingsNotification {
  suppress: {
    [notificationId: string]: boolean;
  };
}
declare const UPDATE_CHANNELS: readonly ["stable", "beta", "next", "none"];
type ValuesOf<T extends readonly any[]> = T[number];
type UpdateChannel = ValuesOf<typeof UPDATE_CHANNELS>;
interface ISettingsUpdate {
  channel: UpdateChannel;
}
interface ISettingsWorkarounds {
  userSymlinks: boolean;
}
interface ISettings {
  interface: ISettingsInterface;
  automation: ISettingsAutomation;
  gameMode: ISettingsGameMode;
  profiles: ISettingsProfiles;
  window: IWindow;
  downloads: ISettingsDownloads;
  mods: ISettingsMods;
  notifications: ISettingsNotification;
  tables: ITableStates;
  update: ISettingsUpdate;
  workarounds: ISettingsWorkarounds;
}
interface IStateTransactions {
  transfer: {};
  pendingPluginSort: Record<string, Record<string, number>>;
}
interface ISessionGameMode {
  known: IGameStored[];
  addDialogVisible: boolean;
  disabled: {
    [gameId: string]: string;
  };
}
interface IGameInfoEntry {
  key: string;
  provider: string;
  priority: number;
  expires: number;
  title: string;
  value: any;
  type?: string;
}
interface IStateGameMode {
  gameInfo: {
    [gameId: string]: {
      [key: string]: IGameInfoEntry;
    };
  };
}
interface IBrowserState {
  url: string;
  instructions: string;
  subscriber: string;
  skippable: boolean;
}
interface IModTable {
  [gameId: string]: {
    [modId: string]: IMod;
  };
}
interface IOverlay {
  title: string;
  content?: string;
  componentId?: string;
  position: IPosition;
  options?: IOverlayOptions;
}
interface IOverlayOptions {
  containerTitle?: string;
  showIcon?: boolean;
  className?: string;
  disableCollapse?: boolean;
  id?: string;
  props?: any;
}
interface IOverlaysState {
  overlays: {
    [key: string]: IOverlay;
  };
}
/**
 * interface for the top-level state object
 * this should precisely mirror the reducer structure
 *
 * @export
 * @interface IState
 */
interface ICollectionsPersistentState {
  collections: Record<
    string,
    {
      timestamp: number;
      info: ICollection;
    }
  >;
  revisions: Record<
    string,
    {
      timestamp: number;
      info: IRevision;
    }
  >;
  pendingVotes: Record<
    string,
    {
      collectionSlug: string;
      revisionNumber: number;
      time: number;
    }
  >;
}
interface IState {
  app: IApp;
  user: IUser;
  confidential: {
    account: {};
  };
  session: {
    base: ISession;
    collections: ICollectionInstallState;
    gameMode: ISessionGameMode;
    discovery: IDiscoveryState;
    notifications: INotificationState;
    browser: IBrowserState;
    history: IHistoryState;
    overlays: IOverlaysState;
    healthCheck: IHealthCheckSessionState;
    extensions: {
      available: IAvailableExtension[];
      optional: {
        [extId: string]: IExtensionOptional[];
      };
      updateTime: number;
    };
  };
  settings: ISettings;
  persistent: {
    profiles: {
      [profileId: string]: IProfile;
    };
    mods: IModTable;
    downloads: IStateDownloads;
    collections: ICollectionsPersistentState;
    categories: {
      [gameId: string]: ICategoryDictionary;
    };
    gameMode: IStateGameMode;
    deployment: {
      needToDeploy: {
        [gameId: string]: boolean;
      };
      deploymentCounter: {
        [gameId: string]: number;
      };
    };
    transactions: IStateTransactions;
    history: IHistoryPersistent;
    healthCheck: IHealthCheckPersistentState;
  };
}
interface IDiscoveryPhase {
  progress: number;
  directory: string;
}
/**
 * state of the (lengthy) gamemode discovery
 *
 * @export
 * @interface IDiscoveryState
 */
interface IDiscoveryState {
  running: boolean;
  phases: {
    [id: number]: IDiscoveryPhase;
  };
}
/**
 * gamemode-related application settings
 *
 * @export
 * @interface ISettings
 */
interface IGameModeSettings {}
//#endregion
//#region lib/types/IGame.d.ts
type DirectoryCleaningMode = "tag" | "all";
/**
 * interface for game extensions
 *
 * @interface IGame
 */
interface IGame extends ITool {
  /**
   * determine the default directory where mods for this game
   * should be stored.
   *
   * If this returns a relative path then the path is treated as relative
   * to the game installation directory. Simply return a dot ( () => '.' )
   * if mods are installed directly into the game directory
   *
   * @param gamePath path where the game is installed
   *
   * @memberOf IGame
   */
  queryModPath: (gamePath: string) => string;
  /**
   * use instead of queryPath for simpler specification of search arguments.
   *
   * Each store key accepts:
   * - a string (treated as an app ID): `{ steam: "2870" }`
   * - a single query object: `{ steam: { id: "2870" } }`
   * - an array of query objects: `{ steam: [{ id: "2870" }] }`
   *
   * Consumers should pass the per-store value through
   * `normalizeStoreQuery` rather than branching on the three forms by hand.
   */
  queryArgs?: {
    [storeId: string]: IQueryArgEntry;
  };
  /**
   * returns all directories where mods for this game
   * may be stored as a dictionary of type to (absolute) path.
   *
   * Do not implement this in your game extension, the function
   * is added by vortex itself
   *
   * @param gamePath path where the game is installed
   *
   * @memberOf IGame
   */
  getModPaths?: (gamePath: string) => {
    [typeId: string]: string;
  };
  /**
   * intended to be used by game extensions to provide custom functionality
   *  to resolve a game's version when the game executable's version attribute
   *  is incorrect, which is often the case with games that are still in early
   *  access - an example of this is Blade and Sorcery which uses a different
   *  versioning system internally.
   *
   * @param gamePath path where the game is installed
   * @param exePath relative (to gamePath) path to the discovered exe
   *
   * @returns the game's version
   *
   * @memberof IGame
   */
  getGameVersion?: (gamePath: string, exePath: string) => PromiseLike<string>;
  /**
   * use this to determine the version of this game installed on the system
   *
   * Do not implement this in your game extension, the function is added by vortex itself
   */
  getInstalledVersion?: (discovery: IDiscoveryResult) => PromiseBB$1<string>;
  /**
   * Determine whether the game needs to be executed via a launcher, like Steam or EpicGamesLauncher
   *
   * If this returns a value, Vortex will use appropriate code for that launcher
   * "launcher" in the returned object is the id of the store to use to launch the game, whether
   * addInfo is required and what it needs to contain depends on the store.
   * For steam you can leave addInfo undefined, for the epic game store it has to be a string with
   * the application id (same id used to discover the game)
   *
   * For the windows store it has to be an object with this structure:
   * {
   *   appId: <application id>,
   *   parameters: [
   *     { appExecName: <starter id> },
   *   ],
   * }
   * The starter id can be found by looking at the appxmanifest.xml file found in
   * the game directory. Look for the Id attribute in the <Application> tag.
   * If there are multiple <Application> tags, pick the one you actually want Vortex to start.
   *
   * @param gamePath path where the game is installed.
   * @param store id of the store the game was detected through
   *
   */
  requiresLauncher?: (
    gamePath: string,
    store?: string,
  ) => PromiseBB$1<{
    launcher: string;
    addInfo?: any;
  }>;
  /**
   * returns the mod type extensions applicable to this game (all
   * mod types except the default
   *
   * Do not implement this in your game extension, this is added
   * by vortex
   *
   * @type {IModTypeExtension[]}
   * @memberof IGame
   */
  modTypes?: IModType[];
  /**
   * list of tools that support this game
   *
   * @memberOf IGame
   */
  supportedTools?: ITool[];
  /**
   * path to the game extension and assets included with it. This is automatically
   * set on loading the extension and and pre-set value is ignored
   *
   * @type {string}
   * @memberOf IGame
   */
  extensionPath?: string;
  /**
   * whether to merge mods in the destination directory or put each mod into a separate
   * dir.
   * Example: say queryModPath returns 'c:/awesomegame/mods' and you install a mod named
   *          'crazymod' that contains one file named 'crazytexture.dds'. If mergeMods is
   *          true then the file will be placed as c:/awesomegame/mods/crazytexture.dds.
   *          If mergeMods is false then it will be c:/awesomegame/mods/crazymod/crazytexture.dds.
   *
   * Note: For many games the mods are already packaged in such a way that the mod has an
   *       additional subdirectory. In games where this is the standard, mergeMods should be true,
   *       otherwise Vortex would be introducing one more directory level.
   * Note: This should be considered together with "stop folder" handling: If the installer has
   *       stop folders set up for a game it will attempt to eliminate "unnecessary" sub
   *       directories from the mod package.
   * TODO The name "mergeMods" is horrible since we also talk about "merging" in the context of
   *      combining individual files (archives) during mod deployment which is independent of this
   */
  mergeMods?: boolean | ((mod: IMod) => string);
  /**
   * determines if a file is to be merged with others with the same path, instead of the
   * highest-priority one being used. This only works if support for repackaging the file type
   * is available
   */
  mergeArchive?: (filePath: string) => boolean;
  /**
   * Optional setup function. If this game requires some form of setup before it can be modded
   * (like creating a directory, changing a registry key, ...) do it here. It will be called
   * every time before the game mode is activated.
   */
  setup?: (discovery: IDiscoveryResult) => PromiseBB$1<void>;
  /**
   * additional details about the game that may be used by extensions. Some extensions may work
   * better/offer more features if certain details are provided but they are all optional.
   * Extensions should do their best to work without these details, even if it takes more work
   * (during development and potentially at runtime)
   */
  details?: {
    [key: string]: any;
  };
  /**
   * declares this game compatible or incompatible with a certain feature. If not specified, a
   * sensible default will be assumed for each game.
   * So for example if you know the game won't support symbolic links but Vortex offers it by
   * default, you can set "{ compatible: { symlinks: false } }" so Vortex won't offer the feature.
   * You will have to investigate or ask for the possible ids though. Since we will be introducing
   * new "gates" over time and so may extensions, it's not practical (at least at this time) to
   * maintain a list.
   */
  compatible?: {
    [key: string]: boolean;
  };
  /**
   * set to name of the contributor that added support for this game. For officialy supported
   * games this is undefined
   */
  contributed?: string;
  /**
   * set to true if support for this game has been fully tested
   */
  final?: boolean;
  /**
   * contains the version of the game extension
   */
  version?: string;
  /**
   * if true, empty directories are cleaned up during deployment.
   * Right now this defaults to false if mergeMods is true, this defaults to true if mergeMods
   * is false or a function.
   * The reason being that otherwise we would be leaving empty directories every time a mod gets
   * disabled or the deployment name changes.
   * Users can also manually force the cleanup for all games.
   */
  requiresCleanup?: boolean;
  /**
   * decides how Vortex decides which empty directories to clean.
   * With 'tag' (default) we put a dummy file into each directory created by Vortex and only
   *   those get removed during purge (or after deployment if requiresCleanup is enabled)
   * With 'all' Vortex will simply clean up all empty directories, whether Vortex created them
   *   or not. In some (unusual) cases this may break mods
   */
  directoryCleaning?: DirectoryCleaningMode;
  /**
   * list of game ids. If one of the games listed here is discovered in the same location as this
   * extension they get disabled.
   * This allows third-party extensions or total conversions to take precedence over the original
   * they're replacing
   */
  overrides?: string[];
  /**
   * if set this function is always called before automatic deployment and it will be delayed
   * until the promise resolves.
   * This can be used if the deployment process is very slow and/or involves user interaction
   * (e.g. through will-deploy/did-deploy event handlers) to prevent managament becoming impractical
   * due to automated deployment constantly requiring attention.
   *
   * Once the promise resolves the mods as enabled at that time will be deployed, so for example
   * if the user enabled a mod while this promise is pending, that mod will be deployed.
   */
  deploymentGate?: () => PromiseBB$1<void>;
}
//#endregion
//#region lib/extensions/gameversion_management/types/IGameVersionProvider.d.ts
type GameVersionProviderFunc = (game: IGame, discovery: IDiscoveryResult) => PromiseLike<string>;
type GameVersionProviderTest = (game: IGame, discovery: IDiscoveryResult) => PromiseLike<boolean>;
interface IGameVersionProviderOptions {}
//#endregion
//#region lib/types/IActionDefinition.d.ts
interface IActionOptions {
  noCollapse?: boolean;
  namespace?: string;
  hollowIcon?: boolean;
  isClassicOnly?: boolean;
  isModernOnly?: boolean;
}
type ActionFunc = (instanceId: string | string[]) => IActionDefinition[];
/**
 * interface of an action within one of the icon bars
 *
 * @export
 * @interface IActionDefinition
 */
interface IActionDefinition {
  icon?: string;
  title?: string;
  data?: any;
  component?: React$2.ComponentType<React$2.PropsWithChildren<any>>;
  props?: () => any;
  action?: (instanceId: string | string[], data?: any) => void;
  subMenus?: IActionDefinition[] | ActionFunc;
  condition?: (instanceId: string | string[], data?: any) => boolean | string;
  position?: number;
  group?: string;
  options?: IActionOptions;
  default?: boolean;
}
//#endregion
//#region lib/controls/ActionControl.d.ts
interface IActionControlProps {
  instanceId?: string | string[];
  filter?: (action: IActionDefinition) => boolean;
  showAll?: boolean;
  children?: React$2.ReactNode;
}
interface IActionDefinitionEx extends IActionDefinition {
  show: boolean | string;
  subMenus?: IActionDefinitionEx[] | (() => IActionDefinitionEx[]);
}
//#endregion
//#region lib/extensions/mod_load_order/types/types.d.ts
type SortType = "ascending" | "descending";
type UpdateType = "drag-n-drop" | "props-update" | "refresh";
interface IInfoPanelProps {
  refresh: () => void;
}
interface ILoadOrderEntry<T = any> {
  pos: number;
  enabled: boolean;
  prefix?: string;
  data?: T;
  locked?: boolean;
  external?: boolean;
}
interface ILoadOrder {
  [modId: string]: ILoadOrderEntry;
}
interface IDnDConditionResult {
  success: boolean;
  errMessage?: string;
}
/**
 * describes an item in the load order control.
 * This isn't just used for "display", the id is what gets stored to internally
 * save the load order
 */
interface ILoadOrderDisplayItem {
  id: string;
  name: string;
  imgUrl: string;
  prefix?: string;
  data?: string;
  locked?: boolean;
  external?: boolean;
  official?: boolean;
  message?: string;
  contextMenuActions?: IActionDefinitionEx[];
  condition?: (
    lhs: ILoadOrderDisplayItem,
    rhs: ILoadOrderDisplayItem,
    predictedResult: ILoadOrderDisplayItem[],
  ) => IDnDConditionResult;
}
interface IGameLoadOrderEntry {
  gameId: string;
  gameArtURL: string;
  displayCheckboxes?: boolean;
  noCollectionGeneration?: boolean;
  createInfoPanel: (
    props: IInfoPanelProps,
  ) => string | React.ComponentType<React.PropsWithChildren<unknown>>;
  preSort?: (
    items: ILoadOrderDisplayItem[],
    sortDir: SortType,
    updateType?: UpdateType,
  ) => Promise$1<ILoadOrderDisplayItem[]>;
  filter?: (mods: IMod[]) => IMod[];
  callback?: (loadOrder: ILoadOrder, updateType?: UpdateType) => void;
  itemRenderer?: React.ComponentType<
    React.PropsWithChildren<{
      className?: string;
      item: ILoadOrderDisplayItem;
      onRef: (ref: any) => any;
    }>
  >;
}
//#endregion
//#region lib/util/getNormalizeFunc.d.ts
type Normalize = (input: string) => string;
interface INormalizeParameters {
  separators?: boolean;
  unicode?: boolean;
  relative?: boolean;
}
/**
 * determine a function to normalize file names for the
 * file system in the specified path.
 * The second parameter can be used to specify how strict the normalization is.
 * Ideally you want everything but that makes the function slower and this function may
 * be called a lot. Oftentimes the source of the input path already guarantees some
 * normalization anyway.
 *
 * @param {string} path
 * @returns {PromiseBB<Normalize>}
 */
declare function getNormalizeFunc(
  testPath: string,
  parameters?: INormalizeParameters,
): PromiseBB$1<Normalize>;
/**
 * creates a proxy for a dictionary that makes all key access normalized with the specified
 * normalization function
 */
declare function makeNormalizingDict<T extends object>(input: T, normalize: Normalize): T;
//#endregion
//#region lib/util/i18n.d.ts
/** @public */
type TFunction$1 = typeof I18next.t;
declare function getCurrentLanguage(): string;
interface ITString {
  key: string;
  options?: TOptions;
  toString(): string;
}
//#endregion
//#region lib/extensions/mod_management/types/IDeploymentMethod.d.ts
/**
 * details about a file change
 */
interface IFileChange {
  /**
   * relative path to the changed file
   */
  filePath: string;
  /**
   * the source mod
   */
  source: string;
  /**
   * type of change.
   * refchange means that the installed file
   *   now references a different object. This could happen if a
   *   file was installed/overwritten by a different application
   *   or the file was changed by an application that didn't edit
   *   in-place (most applications will write to a temporary file
   *   and, on success, move the temp file over the original, thus
   *   creating a new file entry)
   * valchange means that the content of the file was changed
   *   in-place (as in: file was opened and then written to)
   * deleted means that the file was deleted in the destination directory
   * srcdeleted means that the file was deleted in the source directory
   */
  changeType: "refchange" | "valchange" | "deleted" | "srcdeleted";
  /**
   * time the deployed file was last changed
   */
  destTime?: Date;
  /**
   * time the staging file was last changed
   */
  sourceTime?: Date;
}
interface IDeployedFile {
  /**
   * the relative path to the file
   */
  relPath: string;
  /**
   * the source of the file, which should be the name of the mod
   */
  source: string;
  /**
   * if this file was created by merging, this lists all mods which were the basis of
   * the merge
   * deployment methods don't have to set this, it will be filled in by the the core
   * functionality
   */
  merged?: string[];
  /**
   * the output directory for the file. This will be empty for games that put all mods
   * in the same directory (mergeMods is true).
   */
  target?: string;
  /**
   * the last-modified time of the file. This can be used to determine if the file
   * was changed after deployment
   */
  time: number;
}
/**
 * Indicates why a deployment method is unavailable an if it can be made to work
 */
interface IUnavailableReason {
  /**
   * description (english) why the deployment method is unavailable
   */
  description: (t: TFunction$1) => string;
  /**
   * describes the solution to make this
   */
  solution?: (t: TFunction$1) => string;
  /**
   * if the problem can be fixed automatically, this can be set to a function that takes care
   * of it
   */
  fixCallback?: (api: IExtensionApi) => PromiseLike<void>;
  /**
   * When no method is supported, Vortex will offer possible solutions in this order.
   * It should indicate both how much effort the solution is and also a general preference for
   * this deployment methods so that the preferred method has a lower order number than others.
   */
  order?: number;
}
interface IDeploymentMethod {
  /**
   * id of the activator for lookup in code
   *
   * @type {string}
   * @memberOf IDeploymentMethod
   */
  readonly id: string;
  /**
   * if set, lists ids of other deployment methods that this is compatible to.
   * Compatible means we can switch between methods without requiring a purge or
   * a need to warn the user.
   */
  readonly compatible?: string[];
  /**
   * name of this activator as presented to the user
   *
   * @type {string}
   * @memberOf IDeploymentMethod
   */
  readonly name: string;
  /**
   * Short description of the activator and it's pros/cons
   *
   * @type {string}
   * @memberOf IDeploymentMethod
   */
  readonly description: string;
  /**
   * true if it's "safe" to purge files from this method from another instance,
   * that is: without knowing where the "original" files are.
   *
   * @type {boolean}
   * @memberOf IDeploymentMethod
   */
  readonly isFallbackPurgeSafe: boolean;
  /**
   * low value means: prefer this method over those with higher value
   */
  readonly priority: number;
  /**
   * if true, no redundancy check is made for this deployment.
   * For cases where the redundancy check wouldn't work correctly
   */
  readonly noRedundancy?: boolean;
  /**
   * returns more extensive description/explanation of the activator.
   *
   * @type {string}
   * @memberOf IDeploymentMethod
   */
  detailedDescription: (t: TFunction$1) => string;
  /**
   * determine if this activator is supported in the current environment
   * If the activator is supported, returns undefined. Otherwise a string
   * that explains why the activator isn't available.
   *
   * synchronous 'cause lazy.
   *
   * @memberOf IDeploymentMethod
   */
  isSupported: (state: any, gameId: string, modTypeId: string) => IUnavailableReason;
  /**
   * if mod deployment in some way requires user interaction we should give the user control
   * over the process, even if he has auto-deploy active
   *
   * @memberof IDeploymentMethod
   */
  userGate: () => PromiseLike<void>;
  /**
   * called before the deployment method is selected. Primary use is to show usage instructions
   * the user needs to know before using it
   */
  onSelected?: (api: IExtensionApi) => PromiseLike<void>;
  /**
   * called before any calls to activate/deactivate, in case the
   * activator needs to do pre-processing
   * @param {string} dataPath the path where files will be deployed to
   * @param {boolean} clean whether the activate commands should be treated
   *                        as deltas (false) to the existing activation or whether
   *                        we're deploying from scratch (true)
   * @param {IDeployedFile[]} lastActivation previous deployment state to be used as
   *                                         the reference for newly deployed files
   * @param {Normalize} normalize a path normalization function. This needs to be used
   *                              when comparing strings against the blacklist or when storing
   *                              relative path into the deployment manifest
   *
   * @memberOf IDeploymentMethod
   */
  prepare: (
    dataPath: string,
    clean: boolean,
    lastActivation: IDeployedFile[],
    normalize: Normalize,
  ) => PromiseLike<void>;
  /**
   * called after an activate call was made for all active mods,
   * in case this activator needs to do postprocessing
   *
   * @return {} a promise of activation results. These results will be used for a "purge"
   *            in case the activator isn't available for the regular purge op.
   *            If a purge isn't necessary, i.e. because the links are transient anyway, please
   *            just return an empty list.
   *            Please note that this purge will happen with a regular file deletion call,
   *            if this could lead to data loss do NOT return anything here. In that case you
   *            should provide another way for the user to clean up the game directory even when
   *            your activator is not available for some reason.
   *
   * @memberOf IDeploymentMethod
   */
  finalize: (
    gameId: string,
    dataPath: string,
    installationPath: string,
    progressCB?: (files: number, total: number) => void,
  ) => PromiseLike<IDeployedFile[]>;
  /**
   * if defined, this gets called instead of finalize if an error occurred since prepare was called.
   * This allows the deployment method to reset all state without actually doing anything in case
   * things went wrong.
   * If this is not defined, nothing gets called. In this case the deployment method can't have any
   * state set up in prepare that would cause issues if finalize doesn't get called.
   */
  cancel?: (gameId: string, dataPath: string, installationPath: string) => PromiseLike<void>;
  /**
   * activate the specified mod in the specified location
   * @param {string} sourcePath source where the mod is installed
   * @param {string} sourceName name to be stored as the source of files. usually the path of the
   *                            mod subdirectory
   * @param {string} deployPath relative path within the data path where mods are installed to
   * @param {Set<string>} blacklist list of files to skip
   *
   * @memberOf IDeploymentMethod
   */
  activate: (
    sourcePath: string,
    sourceName: string,
    deployPath: string,
    blackList: Set<string>,
  ) => PromiseLike<void>;
  /**
   * deactivate the specified mod, removing all files it has deployed to the destination
   * @param {string} sourcePath source where the mod is installed
   * @param {string} dataPath relative path within the data path where mods are installed to
   * @param {string} sourceName name of the source mod
   *
   * @todo sorry about the stupid parameter order, sourceName was added after release so to
   *   remain backwards compatible we have to append it
   */
  deactivate: (sourcePath: string, dataPath: string, sourceName: string) => PromiseLike<void>;
  /**
   * called before mods are being purged. If multiple mod types are going to be purged,
   * this is only called once.
   * This is primarily useful for optimization, to avoid work being done redundantly
   * for every modtype-purge
   */
  prePurge: (installPath: string) => PromiseLike<void>;
  /**
   * deactivate all mods at the destination location
   * @param {string} installPath Vortex path where mods are installed from (source)
   * @param {string} dataPath game paths where mods are installed to (destination)
   * @param {string} gameId id for the game to purge
   * @param {string} onProgress progress callback. Doesn't have to be used, won't always be
   *                            supplied
   * Vortex itself does not keep track which files were installed by the
   * activator so if the activator can not discover those automatically it
   * it has to do its own bookkeeping.
   * The LinkingActivator base-class does implement such bookkeeping however.
   *
   * @memberOf IDeploymentMethod
   */
  purge: (
    installPath: string,
    dataPath: string,
    gameId?: string,
    onProgress?: (num: number, total: number) => void,
  ) => PromiseLike<void>;
  /**
   * called after mods were purged. If multiple mod types wer purged, this is only called
   * after they are all done.
   * Like prePurge, this is intended for optimizations
   */
  postPurge: () => PromiseLike<void>;
  /**
   * retrieve list of external changes, that is: files that were installed by this
   * activator but have been changed since then by an external application.
   * @param {string} installPath Vortex path where mods are installed from (source)
   * @param {string} dataPath game path where mods are installed to (destination)
   *
   * @memberOf IDeploymentMethod
   */
  externalChanges: (
    gameId: string,
    installPath: string,
    dataPath: string,
    activation: IDeployedFile[],
  ) => PromiseLike<IFileChange[]>;
  /**
   * given a file path (relative to a staging path), return the name under which the
   * file would be deployed.
   * This is used in cases where the deployment method may rename files during
   * deployment for whatever reason.
   * An example would be move deployment where the file that remains in the staging
   * folder is just a (differently named) placeholder.
   */
  getDeployedPath: (input: string) => string;
  /**
   * test if the specified file is deployed through this methed
   * @param {string} installPath Vortex path where mods are installed from (source)
   * @param {string} dataPath game path where mods are installed to (destination)
   */
  isDeployed: (installPath: string, dataPath: string, file: IDeployedFile) => PromiseLike<boolean>;
}
//#endregion
//#region lib/extensions/mod_management/types/IInstallResult.d.ts
type InstructionType =
  | "copy"
  | "mkdir"
  | "submodule"
  | "generatefile"
  | "iniedit"
  | "unsupported"
  | "attribute"
  | "setmodtype"
  | "error"
  | "rule";
interface IInstruction {
  type: InstructionType;
  path?: string;
  source?: string;
  destination?: string;
  section?: string;
  key?: string;
  value?: any;
  submoduleType?: string;
  data?: string | Buffer;
  rule?: IRule$1;
}
interface IInstallResult {
  instructions: IInstruction[];
}
//#endregion
//#region lib/extensions/mod_management/types/IDeployOptions.d.ts
interface IDeployOptions {
  manual?: boolean;
  profileId?: string;
  isCollectionPostprocessCall?: boolean;
}
//#endregion
//#region lib/extensions/mod_management/types/IModsAPIExtension.d.ts
interface IModsAPIExtension {
  awaitNextPhaseDeployment?: () => Promise<void>;
  awaitModsDeployment?: (
    profileId?: string,
    progressCB?: (text: string, percent: number) => void,
    deployOptions?: IDeployOptions,
  ) => Promise<void>;
}
//#endregion
//#region lib/extensions/mod_management/types/InstallFunc.d.ts
type ProgressDelegate = (perc: number) => void;
interface IInstallationDetails {
  hasInstructionsOverrideFile?: boolean;
  modReference?: IModReference;
  hasXmlConfigXML?: boolean;
  hasCSScripts?: boolean;
  isTrusted?: boolean;
}
type InstallFunc = (
  files: string[],
  destinationPath: string,
  gameId: string,
  progressDelegate: ProgressDelegate,
  choices?: IChoiceType,
  unattended?: boolean,
  archivePath?: string,
  options?: IInstallationDetails,
) => PromiseLike<IInstallResult>;
//#endregion
//#region lib/extensions/mod_management/types/TestSupported.d.ts
interface ISupportedResult {
  supported: boolean;
  requiredFiles: string[];
}
interface ITestSupportedDetails {
  hasXmlConfigXML?: boolean;
  hasCSScripts?: boolean;
}
type TestSupported = (
  files: string[],
  gameId: string,
  archivePath?: string,
  details?: ITestSupportedDetails,
) => PromiseLike<ISupportedResult>;
//#endregion
//#region lib/extensions/nexus_integration/types/IValidateKeyData.d.ts
/**
 * Membership-related fields of a user, derived from the role strings in the API
 * user payload / JWT. Single source of truth for these flags so they can be
 * derived, spread and compared as a unit instead of field-by-field.
 */
interface IMembership {
  isPremium: boolean;
  isSupporter: boolean;
  isLifetime: boolean;
}
/**
 * Data retrieved with a correct API Key (legacy /users/validate shape).
 *
 * @export
 * @interface IValidateKeyData
 */
interface IValidateKeyData extends Pick<IMembership, "isPremium" | "isSupporter"> {
  email: string;
  name: string;
  profileUrl: string;
  userId: number;
}
interface IValidateKeyDataV2 extends IValidateKeyData, IMembership, Partial<IPreference> {}
//#endregion
//#region lib/extensions/nexus_integration/types/INexusAPIExtension.d.ts
interface INexusAPIExtension {
  nexusCheckModsVersion?: (
    gameId: string,
    mods: {
      [modId: string]: IMod;
    },
    forceFull: boolean | "silent",
  ) => void;
  nexusDownload?: (
    gameId: string,
    modId: number,
    fileId: number,
    fileName?: string,
    allowInstall?: boolean,
  ) => PromiseLike<string>;
  nexusGetCollection?: (slug: string) => PromiseLike<ICollection>;
  nexusGetCollections?: (gameId: string) => PromiseLike<Partial<ICollection>[] | undefined>;
  nexusSearchCollections?: (
    options: ICollectionSearchOptions,
  ) => PromiseLike<ICollectionSearchResult>;
  nexusGetMyCollections?: (
    gameId: string,
    count?: number,
    offset?: number,
  ) => PromiseLike<IRevision[]>;
  nexusResolveCollectionUrl?: (apiLink: string) => PromiseLike<IDownloadURL[]>;
  nexusGetCollectionRevision?: (
    collectionSlug: string,
    revisionNumber: number,
  ) => PromiseLike<IRevision>;
  nexusRateCollectionRevision?: (revisionId: number, rating: RatingOptions) => PromiseLike<any>;
  nexusGetLatestMods?: (gameId: string) => PromiseLike<any>;
  nexusGetTrendingMods?: (gameId: string) => PromiseLike<any>;
  nexusEndorseDirect?: (
    gameId: string,
    nexusId: number,
    version: string,
    endorsedStatus: EndorsedStatus,
  ) => PromiseLike<EndorsedStatus>;
  nexusEndorseMod?: (gameId: string, modId: string, endorsedStatus: EndorsedStatus) => void;
  nexusSubmitFeedback?: (
    title: string,
    message: string,
    hash: string,
    feedbackFiles: string[],
    anonymous: boolean,
    callback: (err: Error, response?: IFeedbackResponse) => void,
  ) => void;
  nexusSubmitCollection?: (
    collectionInfo: ICollectionManifest,
    assetFilePath: string,
    collectionId: number,
    callback: (err: Error, response?: any) => void,
  ) => void;
  nexusModUpdate?: (gameId: string, modId: number, fileId: number, source: string) => void;
  nexusOpenCollectionPage?: (
    gameId: string,
    collectionSlug: string,
    revisionNumber: number,
    source: string,
  ) => void;
  nexusOpenModPage?: (gameId: string, modId: string, source: string) => void;
  nexusRequestNexusLogin?: (callback: any) => void;
  nexusRequestOwnIssues?: (cb: (err: Error, issues?: IIssue[]) => void) => void;
  nexusRetrieveCategoryList?: (isUpdate: boolean) => void;
  nexusGetModFiles?: (gameId: string, modId: number) => PromiseLike<IFileInfo[]>;
  nexusDownloadUpdate?: (
    source: string,
    gameId: string,
    modId: string,
    fileId: string,
    versionPattern: string,
    campaign: string,
    referenceTag?: string,
  ) => PromiseLike<{
    error: Error;
    dlId?: string;
  }>;
  nexusModFileContents?: (
    query: IModFileContentPageQuery,
    filter?: IModFileContentSearchFilter,
    offset?: number,
    count?: number,
  ) => PromiseLike<Partial<IModFileContentPage>>;
  nexusGetPreferences?: (query: IPreferenceQuery) => PromiseLike<Partial<IPreference>>;
  nexusGetModInfo?: (gameId: string, modId: number) => PromiseLike<Partial<IModInfo>>;
  nexusGetModRequirements?: (uids: string[]) => PromiseLike<{
    [uid: string]: Partial<IModRequirements>;
  }>;
  nexusGetUserKeyData?: () => PromiseLike<IValidateKeyDataV2>;
}
//#endregion
//#region lib/ReduxProp.d.ts
/**
 * Interface for objects that can be updated when Redux state changes.
 * Works with both class components (which have forceUpdate) and
 * functional component wrappers.
 */
interface IUpdateable {
  forceUpdate: () => void;
}
declare class ReduxProp<T> {
  private mInputs;
  private mFunc;
  private mApi;
  private mSubscribers;
  private mUnsubscribe;
  constructor(api: IExtensionApi, inputs: string[][], func: (...args: unknown[]) => T);
  attach(component: IUpdateable): void;
  detach(component: IUpdateable): void;
  calculate(): T | undefined;
  private subscribe;
  private unsubscribe;
}
//#endregion
//#region lib/store/reduxSanity.d.ts
type SanityCheck = (state: any, action: Redux.Action) => string | false;
//#endregion
//#region lib/util/archives.d.ts
/**
 * wrapper around an format-specific archive handler
 *
 * @export
 * @class Archive
 */
declare class Archive {
  private mHandler;
  constructor(handler: IArchiveHandler);
  /**
   * list files at the specified path
   */
  get readDir(): ((archivePath: string) => PromiseBB$1<string[]>) | undefined;
  /**
   * read a file at the specified path via a stream
   */
  get readFile(): ((filePath: string) => NodeJS.ReadableStream) | undefined;
  /**
   * extract a single file
   */
  get extractFile(): ((filePath: string, outputPath: string) => PromiseBB$1<void>) | undefined;
  /**
   * extract the entire archive
   */
  get extractAll(): ((outputPath: string) => PromiseBB$1<void>) | undefined;
  /**
   * create this archive from the files in sourcePath
   */
  get create(): ((sourcePath: string) => PromiseBB$1<void>) | undefined;
  /**
   * add a single file to the archive
   */
  get addFile(): ((filePath: string, sourcePath: string) => PromiseBB$1<void>) | undefined;
  get write(): (() => PromiseBB$1<void>) | undefined;
}
//#endregion
//#region lib/types/IModifiers.d.ts
interface IModifiers {
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
}
//#endregion
//#region lib/types/IComponentContext.d.ts
/**
 * the context object passed along with all components
 *
 * @export
 * @interface IContext
 */
interface IComponentContext {
  api: IExtensionApi;
  menuLayer: HTMLDivElement;
  getModifiers: () => IModifiers;
}
//#endregion
//#region lib/extensions/mod_management/types/IInstallerSpec.d.ts
/**
 * `extensions`/`regex`/`filename` matches support two evaluation modes:
 *   - `any`: at least one file matches → installer accepts.
 *   - `all`: every (non-directory) file matches → installer accepts. Empty
 *     archives are rejected.
 */
type InstallerMatchMode = "any" | "all";
/**
 * Discriminated union describing how an installer decides whether it supports
 * an archive. Directory entries (paths ending in path-sep) are filtered out
 * before evaluation in all modes.
 */
type IInstallerMatch =
  | {
      kind: "extensions";
      list: readonly string[];
      mode: InstallerMatchMode;
    }
  | {
      kind: "regex";
      patterns: readonly RegExp[];
      mode: InstallerMatchMode;
    }
  | {
      kind: "filename";
      names: readonly string[];
      mode: InstallerMatchMode;
    }
  /** Any file matches any of `game.details.stopPatterns` for the active game. */
  | {
      kind: "stopPatterns";
    }
  /** Escape hatch: caller-supplied predicate over the (raw) file list. */
  | {
      kind: "custom";
      predicate: (files: string[]) => boolean;
    };
/**
 * How matched files are turned into install instructions. `declareInstallers`
 * always emits `copy` instructions for every non-directory entry; this struct
 * tweaks paths and tagging.
 */
interface IInstallerInstall {
  /**
   * If true and the archive wraps everything in a single top-level directory,
   * that directory is stripped from destination paths so the mod stages at
   * game root rather than inside the wrapper.
   */
  stripCommonRoot: boolean;
}
/**
 * One row in a game's installer config table.
 *
 * `id` doubles as the `registerInstaller` id (prefixed with `${gameId}-` if
 * `modType` is unset) and, when `modType` is set, gets emitted as a
 * `setmodtype` instruction at install time so deployment can be routed.
 */
interface IInstallerSpec {
  id: string;
  priority: number;
  modType?: string;
  match: IInstallerMatch;
  install: IInstallerInstall;
}
/** Public signature of the install function `declareInstallers` synthesises. */
type InstallerSpecInstallFunc = (
  files: string[],
  destinationPath: string,
) => Promise<IInstallResult>;
//#endregion
//#region lib/types/ITestResult.d.ts
type ProblemSeverity = "warning" | "error" | "fatal";
interface ITestResult {
  description: {
    short: string;
    long?: string;
    replace?: {
      [key: string]: any;
    };
    localize?: boolean;
    context?: any;
  };
  severity: ProblemSeverity;
  automaticFix?: () => PromiseLike<void>;
  onRecheck?: () => PromiseLike<void>;
}
//#endregion
//#region lib/types/ITableAttribute.d.ts
type AttributeRenderer = "progress";
type Placement = "table" | "detail" | "both" | "inline";
type ValidationState = "success" | "warning" | "error";
interface IEditChoice {
  key: string;
  text?: string;
  bool?: boolean;
  icon?: string;
  /**
   * select if this choice is visible (default) to the user.
   * invisible choices can only be set programmatically
   */
  visible?: boolean;
}
interface IFilterProps {
  filter: any;
  attributeId: string;
  t: TFunction$1;
  onSetFilter: (attributeId: string, value: any) => void;
  domRef: (ref: HTMLElement) => void;
  children?: React$2.ReactNode;
}
interface ITableFilter {
  /**
   * return true if value matches the filter
   * @param filter the filter pattern to filter by
   * @param value the row value for the specified column
   * @param state application state, usually an IState object but may contain additional fields
   *              from extensions
   * @note the raw parameter controls what value actually gets passed into matches. If raw is false,
   *       value will be the output of the calc function of the ITableAttribute.
   *       If raw is true, value will be the raw value of the table item where the name matches
   *       the table attribute. So if the table attribute has id "name" then value would be
   *       tableitem["name"]. If raw is a string, that is used instead of the table attribute id.
   *       If ITableAttribute.calc doesn't simply transform an attribute of the item but consults
   *       a separate data source, you have to set raw to false, there is no way to get correct
   *       results otherwise.
   *       If calc returns localized strings for example you will want to use raw, generally it
   *       is often simpler to deal with raw values (true instead of "Enabled")
   */
  matches: (filter: any, value: any, state: any) => boolean;
  /**
   * return true if the specified filter will not filter out any elements
   * if not specified the filter will be assumed to be "empty" if it's not truthy
   */
  isEmpty?: (filter: any) => boolean;
  /**
   * this controls what value gets passed into the matches function, see the documentation there
   * for possible values
   */
  raw: string | boolean;
  component: React$2.ComponentType<React$2.PropsWithChildren<IFilterProps>>;
  /**
   * specifies which property of the object to filter on, meaning that obj[dataId] will be passed
   * to the "matches" function as the value to filter by.
   * This can be $ (a single dollar sign) to get the object itself
   */
  dataId?: string;
}
interface ICustomProps {
  onHighlight: (highlight: boolean) => void;
}
/**
 * declaration of an attribute of a table
 *
 * @export
 * @interface IModAttribute
 */
interface ITableAttribute<T = any> {
  /**
   * internal id of the attribute
   */
  id: string;
  /**
   * user readable name for the attribute (appears in the header and potentially in tooltips)
   */
  name?: string | ITString;
  /**
   * lengthier description of what the attribute represents
   * (currently unused but please provide one anyway)
   */
  description?: string | ITString;
  /**
   * If set, determins the order in which attributes are displayed (the order of columns if
   * placement is 'table' or vertical order in details).
   * Lower number means further left/further up respectively.
   * In the futuer users may be able to customize the column order at which point this
   * should be considered a default.
   * All attributes where this isn't set will default to 100 and be ordered according to how
   * attributes appear in code
   */
  position?: number;
  /**
   * optional help text regarding this field. This will only show up in the details pane, if there
   * is no custom renderer and only if a name is set (as otherwise the space for the help icon
   * doesn't exist)
   */
  help?: string | ITString;
  /**
   * icon for the attribute. This is currently only used for the toggle button if the column is
   * toggleable
   */
  icon?: string;
  /**
   * if true the attribute can be disabled in the table
   */
  isToggleable?: boolean;
  /**
   * if true, the table can be sorted by this attribute
   */
  isSortable?: boolean;
  /**
   * if true (or a function), the table can be grouped by this attribute.
   * if this is a function it will be called with the object to determine the value to use for
   * grouping, otherwise the output of calc is used. This function must be fast, unlike calc
   * the result from this is not cached (at this time)
   */
  isGroupable?: boolean | ((object: T, t: TFunction$1) => string);
  /**
   * if set, the group name is going to be translated using this function before being displayed to
   * the user (this affects only the group headers, not filters)
   * You probably want to use this if you have a customRenderer on a column that is groupable
   */
  groupName?: (value: any) => string;
  /**
   * if set, the table can be filtered by this attribute using the specified control
   */
  filter?: ITableFilter;
  /**
   * if set, this attribute will be the one that gets focused when pressing ctrl+f
   * There can only be one of these and it should be a column that is visible by default.
   * And of course it has to be filterable
   * If more than one attribute has this flag the first one will be used.
   */
  isDefaultFilter?: boolean;
  /**
   * if true (default), the column is visible by default otherwise the user has to activate it
   * manually first
   */
  isDefaultVisible?: boolean;
  /**
   * if this is true and if the user hasn't changed column sorting yet, this column will be used
   * for sorting (ascending) as long as it's visible and no previous column had this flag set.
   */
  isDefaultSort?: boolean | "desc";
  /**
   * TODO: Obsolete
   * if true, the calc-function for this attribute is called whenever table data is refreshed,
   * even if the corresponding row data didn't change.
   * Otherwise (default) the values for this attribute are only updated when the input data to the
   * row changes. This means you need this flag, if the value of the attribute may change without
   * the row data changing.
   * This is the case for example when your extension generates data in a separate object and then
   * only uses the row id to look up data from that object.
   * If you fail to set this flag when the rendered data isn't part of the table data
   * your attribute won't show up at all
   * You should make extra sure the calc-function is quick though. If it takes computation, you
   * may want to use a custom renderer with some manner of caching and debouncing.
   */
  isVolatile?: boolean;
  /**
   * if true, the rendered control will be extensible with wrappers (see registerControlWrapper),
   * with a name that is generated from <tableid>-<columnid>
   */
  isExtensible?: boolean;
  /**
   * Never shrink the column while scrolling, it can still grow though
   */
  noShrink?: boolean;
  /**
   * when using external data (not part of the data passed to the table) in calc or customRenderer,
   * set this parameter.
   * This function gets called with a callback that then needs to be called whenever the external
   * data (any of it) changes to cause a rerender.
   */
  externalData?: (onChanged: () => void) => void;
  /**
   * specifies whether the attribute appears in the table, the details pane or both.
   * \note that "isToggleable" and "isSortable" have no effect on attributes that don't appear
   * in the table
   */
  placement: Placement;
  /**
   * if specified this function is used to render the value in the table instead of the usual cell
   * renderer. Please note that if you want caching or asynchronous calculation for this cell you'll
   * have to implement it yourself.
   * Also note that table cells using customRenderer will do more unnecessary rerenders than a
   * calc-based field so please use customRenderer only when necessary.
   */
  customRenderer?: (
    object: T | T[],
    detailCell: boolean,
    t: TFunction$1,
    props: ICustomProps,
  ) => JSX.Element;
  /**
   * determine the display value for this attribute. This is used for display if customRenderer is
   * not specified. It's also used for sorting the table so unless isSortable is false and a
   * customRenderer is used you have to provide a calc function.
   * Please return "appropriate" types, that is: standard types like string, boolean, number, Date
   * and from those the one that most closely models what the data contains (i.e. if the attribute
   * is a date return a Date object so that the Table can properly render and sort it according
   * to the locale)
   * \note: calc may return a Promise, the table will then update once the value is calculated
   * \note: The table will only automatically refresh and call "calc" if one of its props changes.
   *        This means that if you bind a variable to your calc function which is not part of
   *        the Table props the Table may appear glitchy as it won't update as necessary.
   */
  calc?: (object: T, t: TFunction$1) => any | Promise<any>;
  /**
   * allows the attribute to add a css class to the table row.
   */
  cssClass?: (object: T, enabled: boolean) => string;
  /**
   * custom function for sorting by this attribute. The parameters passed in (lhs and rhs) are
   * the output of calc (cached). Return <0 if lhs is smaller than rhs, >0 if it's bigger and
   * =0 if they are equal.
   */
  sortFunc?: (lhs: any, rhs: any, locale: string) => number;
  /**
   * custom function for sorting by this attribute. The parameters passed in (lhs and rhs) are
   * the objects to compare. Return <0 if lhs is smaller than rhs, >0 if it's bigger and
   * =0 if they are equal.
   */
  sortFuncRaw?: (lhs: T, rhs: T, locale: string) => number;
  /**
   * if specified, this is called to determine if the attribute is visible at all.
   * This can be used to hide attributes on game where they aren't supported.
   * This will only be evaluated when the table is created, when the user switches column visibility
   * manually or when the list of table columns programmatically changes but you can not use it
   * to dynamically hide columns _without_ changing any table props.
   */
  condition?: () => boolean;
  /**
   * does this attribute support displaying and editing multiple values? defaults to false.
   * If this is false the attribute is not displayed with multiple items selected. If this is true,
   * customRenderer receives an array of objects to display and onChangeValue receive an array of
   * rows to set the new value on
   *
   * @type {boolean}
   * @memberof ITableAttribute
   */
  supportsMultiple?: boolean;
  /**
   * describes how editing for this field should work. Only one out of "choices", "validate"
   * should be used
   *
   * Please note that this only works if no customRenderer is set. Otherwise that renderer
   * will have to implement its own editing functionality
   */
  edit: {
    /**
     * if set, this function determines if the attribute is editable. If "edit" is an empty
     * object, the attribute is readonly. If "edit" is non-empty and "readonly" is
     * undefined, the attribute is editable.
     *
     * @note: This currently only affects controls in the sidebar, not the ones in the table
     */
    readOnly?: (object: any) => boolean;
    /**
     * allow inline editing of this cell for attribute with "choices".
     *
     * @note This does not work as described if choices is undefined, boolean attributes for example
     *       become read-only if this attribute is set and strings and dates don't get rendered
     *       properly any more.
     */
    inline?: boolean;
    /**
     * Affects how choices are displayed if you have a choice attribute
     * if true (or undefined) then we display a drop-down box where each item immediately triggers
     * an action. If false, render a selection box
     */
    actions?: boolean;
    /**
     * minimum value, minus infinity by default
     */
    min?: number;
    /**
     * maximum value, infinity by default
     */
    max?: number;
    /**
     * if set, this is called to determine the placeholder to be displayed when the input box is
     * empty. Has no effect if this edit config doesn't generate an input box
     */
    placeholder?: () => string;
    /**
     * if set, this field is a drop-down selection with the choices returned by this function.
     * Please note: the value returned by calc has to appear in the text-field of one of these
     *   choices
     */
    choices?: (object: T) => IEditChoice[];
    /**
     * if set, this field is a text field that validates its input
     */
    validate?: (input: string) => ValidationState;
    /**
     * called when this attribute was changed for an object. The way editing is presented to the
     * user (if you didn't specify a customRenderer) depends on the value type.
     * Potentially "newValue" can be undefined which signals a "toggle" or "cycle to the next
     * value"
     *
     * If this attribute is undefined, the field is readonly
     */
    onChangeValue?: (objects: T | T[], newValue: any) => void;
  };
}
//#endregion
//#region lib/util/StarterInfo.d.ts
interface IStarterInfo {
  id: string;
  gameId: string;
  isGame: boolean;
  iconOutPath: string;
  name: string;
  exePath: string;
  commandLine: string[];
  workingDirectory: string;
  exclusive: boolean;
  detach: boolean;
  shell: boolean;
  store: string;
  onStart?: "hide" | "hide_recover" | "close";
  environment: {
    [key: string]: string;
  };
  defaultPrimary?: boolean;
  extensionPath: string;
  logoName: string;
}
type OnShowErrorFunc = (
  message: string,
  details?: string | Error | any,
  allowReport?: boolean,
) => void;
/**
 * wrapper for information about a game or tool, combining static and runtime/discovery information
 * for the purpose of actually starting them in a uniform way.
 * This implements things like running the game through a launcher (steam/epic/...) if necessary
 *
 * @class StarterInfo
 */
declare class StarterInfo implements IStarterInfo {
  static getGameIcon(game: IGameStored, gameDiscovery: IDiscoveryResult): string;
  static toolIconRW(gameId: string, toolId: string): string;
  static run(
    info: IStarterInfo,
    api: IExtensionApi,
    onShowError: OnShowErrorFunc,
  ): PromiseBB$1<any>;
  static getIconPath(info: IStarterInfo): string;
  private static runDirectly;
  private static runThroughLauncher;
  private static gameIcon;
  private static gameIconRW;
  private static toolIcon;
  id: string;
  gameId: string;
  isGame: boolean;
  iconOutPath: string;
  name: string;
  exePath: string;
  commandLine: string[];
  workingDirectory: string;
  environment: {
    [key: string]: string;
  };
  originalEnvironment: {
    [key: string]: string;
  };
  shell: boolean;
  details: {
    [key: string]: any;
  };
  exclusive: boolean;
  detach: boolean;
  onStart?: "hide" | "hide_recover" | "close";
  defaultPrimary: boolean;
  extensionPath: string;
  logoName: string;
  timestamp: number;
  store: string;
  constructor(
    game: IGameStored,
    gameDiscovery: IDiscoveryResult,
    tool?: IToolStored,
    toolDiscovery?: IDiscoveredTool,
  );
  private initFromGame;
  private initFromTool;
}
//#endregion
//#region lib/extensions/mod_management/types/IDeploymentManifest.d.ts
interface IDeploymentManifest {
  version: number;
  instance: string;
  deploymentMethod?: string;
  deploymentTime?: number;
  stagingPath?: string;
  gameId?: string;
  targetPath?: string;
  files: IDeployedFile[];
}
//#endregion
//#region lib/extensions/mod_management/util/testModReference.d.ts
interface IModLookupInfo {
  id?: string;
  fileMD5: string;
  fileSizeBytes: number;
  fileName: string;
  name?: string;
  logicalFileName?: string;
  additionalLogicalFileNames?: string[];
  customFileName?: string;
  version: string;
  game?: string[];
  fileId?: string;
  modId?: string;
  source?: string;
  referenceTag?: string;
  referenceTags?: string[];
  installerChoices?: IChoiceType;
  patches?: IModPatches;
  fileList?: IFileListItem[];
}
/**
 * The install spec (installer choices / file list / patches) a collection rule asks
 * for. This is the single place that reads a rule's install-spec fields, so the
 * legacy-location fallback for `patches` lives only here.
 */
declare function ruleInstallSpec(rule: IModRule): IModInstallSpec;
/**
 * The loose Nexus identifiers a reference can be matched against (a mod page + file ids/names),
 * plus an optional caller-supplied fallback predicate. Shared so callers do not re-declare the
 * shape inline.
 */
interface IReferenceIdentifiers {
  gameId: string;
  modId?: number;
  fileId?: number;
  fileNames?: string[];
  fileIds?: string[];
  condition?: () => boolean;
}
declare function testRefByIdentifiers(
  identifiers: IReferenceIdentifiers,
  ref: IModReference,
): boolean;
declare function testModReference(
  mod: IMod | IModLookupInfo,
  reference: IModReference,
  source?: {
    gameId: string;
    modId: string;
  },
  fuzzyVersion?: boolean,
): boolean;
/**
 * Find the rule whose reference matches a mod - the inverse of findModByRef (which finds a mod by a
 * reference). Answers "which of these rules applies to / pulled in this mod"; pass a mod's or a
 * collection's `rules`.
 *
 * The mod is converted to lookup info once, up front, rather than letting testModReference rebuild
 * it for every rule in the scan (the same "hoist the constant per-scan work" idea findModByRef uses
 * for its reference). The per-rule tag/md5/id fast-paths already live inside testRef, so there is
 * nothing to add here for those.
 */
declare function findRuleByRef(rules: IModRule[] | undefined, mod: IMod): IModRule | undefined;
//#endregion
//#region lib/extensions/analytics/mixpanel/MixpanelEvents.d.ts
/**
 * Interface for all Mixpanel events
 */
interface MixpanelEvent {
  readonly eventName: string;
  readonly properties: Record<string, any>;
}
/**
 * COLLECTION EVENTS
 */
/**
 * Event sent when a collection draft is created in Vortex.
 * @param collection_name Name of the collection
 * @param game_name Name of the game
 * @param creation_method How the collection was created
 */
declare class CollectionsDraftedEvent implements MixpanelEvent {
  readonly eventName = "collection_drafted";
  readonly properties: Record<string, any>;
  constructor(
    collection_name: string,
    game_name: string,
    creation_method: "from_profile" | "quick_collection" | "empty",
  );
}
/**
 * Event sent when a new draft collection is uploaded.
 * @param collection_name Name of the collection
 * @param game_name Name of the game
 */
declare class CollectionsDraftUploadedEvent implements MixpanelEvent {
  readonly eventName = "collection_draft_uploaded";
  readonly properties: Record<string, any>;
  constructor(collection_name: string, game_name: string);
}
/**
 * Event sent when a draft collection update is uploaded.
 * @param collection_name Name of the collection
 * @param game_name Name of the game
 */
declare class CollectionsDraftUpdateUploadedEvent implements MixpanelEvent {
  readonly eventName = "collection_draft_updated";
  readonly properties: Record<string, any>;
  constructor(collection_name: string, game_name: string);
}
/**
 * Event sent when a collection download is clicked/initiated by the user.
 * @param collection_slug Slug of the collection
 * @param game_id ID of the game
 */
declare class CollectionsDownloadClickedEvent implements MixpanelEvent {
  readonly eventName = "collections_download_clicked";
  readonly properties: Record<string, any>;
  constructor(collection_slug: string, game_id: number);
}
/**
 * Event sent when a collection download is completed.
 * @param collection_id ID of the collection
 * @param revision_id ID of the revision
 * @param game_id ID of the game
 * @param mod_count Number of mods in the collection
 * @param duration_ms Duration in milliseconds
 */
declare class CollectionsDownloadCompletedEvent implements MixpanelEvent {
  readonly eventName = "collections_download_completed";
  readonly properties: Record<string, any>;
  constructor(
    collection_id: string,
    revision_id: string,
    game_id: number,
    file_size: number,
    duration_ms: number,
  );
}
/**
 * Event sent when a collection download fails.
 * @param collection_id ID of the collection
 * @param revision_id ID of the revision
 * @param game_id ID of the game
 * @param error_code Error code
 * @param error_message Error message
 */
declare class CollectionsDownloadFailedEvent implements MixpanelEvent {
  readonly eventName = "collections_download_failed";
  readonly properties: Record<string, any>;
  constructor(
    collection_id: string,
    revision_id: string,
    game_id: number,
    error_code: string,
    error_message: string,
  );
}
/**
 * Event sent when a collection download is cancelled.
 * @param collection_id ID of the collection
 * @param revision_id ID of the revision
 * @param game_id ID of the game
 */
declare class CollectionsDownloadCancelledEvent implements MixpanelEvent {
  readonly eventName = "collections_download_cancelled";
  readonly properties: Record<string, any>;
  constructor(collection_id: string, revision_id: string, game_id: number);
}
/**
 * Event sent when a collection installation is started (genuine first start). Carries the full
 * count snapshot (required/installed/failed/ignored/optional) + durations, the same shape as the
 * terminal events, so start and end reconcile against the same fields. `mod_count` equals
 * `required_total`.
 */
declare class CollectionsInstallationStartedEvent implements MixpanelEvent {
  readonly eventName = "collections_installation_started";
  readonly properties: Record<string, any>;
  constructor(props: CollectionInstallOutcomeProps);
}
/**
 * Shared outcome + count properties for the three terminal collection-install
 * events (completed / failed / cancelled). Sourced from the install session SSOT
 * so the outcomes reconcile: started == completed + failed + cancelled.
 */
interface CollectionInstallOutcomeProps {
  collection_id: string;
  revision_id: string;
  game_id: number;
  /** Total required members in the collection. */
  required_total: number;
  /** Members (required + optional) that reached "installed". */
  installed: number;
  /** Members that ended in "failed". */
  failed: number;
  /** Members skipped/ignored (unselected optionals, user-ignored). */
  ignored: number;
  /** Total optional (recommended) members. */
  optional: number;
  /** Elapsed time for the current install segment (resets on resume) in milliseconds. */
  duration_ms: number;
  /** Elapsed time from the first start across all pause/resume segments, in milliseconds. */
  total_duration_ms: number;
  /** Times the install was paused, accumulated across restarts. */
  pause_count: number;
  /** Times the install was resumed, accumulated across restarts. */
  resume_count: number;
  /** Whether the install was resumed at least once. */
  was_resumed: boolean;
}
/**
 * Event sent when a collection installation completes with every required mod installed.
 */
declare class CollectionsInstallationCompletedEvent implements MixpanelEvent {
  readonly eventName = "collections_installation_completed";
  readonly properties: Record<string, any>;
  constructor(props: CollectionInstallOutcomeProps);
}
/**
 * Event sent when a collection installation finishes in a failed state.
 *
 * `failure_stage` distinguishes the two failure modes:
 *   - "member_install": one or more required members failed to install. There is no
 *     single error (failures happen per-member in InstallManager and can be many); the
 *     `failed` count reports how many, and the per-member causes are on the individual
 *     mods_installation_failed events (joinable via collection_id).
 *   - "postprocessing": applying the collection's mod rules threw a single error, which
 *     is classified into `error_code`.
 */
declare class CollectionsInstallationFailedEvent implements MixpanelEvent {
  readonly eventName = "collections_installation_failed";
  readonly properties: Record<string, any>;
  constructor(
    props: CollectionInstallOutcomeProps & {
      failure_stage: "member_install" | "postprocessing";
      error_code?: string;
    },
  );
}
/**
 * Event sent when a collection installation is cancelled (user abandon, removal, free-user cancel).
 */
declare class CollectionsInstallationCancelledEvent implements MixpanelEvent {
  readonly eventName = "collections_installation_cancelled";
  readonly properties: Record<string, any>;
  constructor(props: CollectionInstallOutcomeProps);
}
/**
 * Why a mod was enabled/disabled/removed, on the ModsStateChanged / ModsRemoved events.
 * A small, closed vocabulary so the data team can slice programmatic churn (collection
 * updates/uninstalls, variant/version/profile replacement, health-check remediation) from
 * user-driven changes. Install-completion enables are not represented here: they are covered
 * by the mods_installation_* events, so no enable is emitted for them.
 */
type ModChangeReason =
  | "user_manual"
  | "variant_replace"
  | "version_update"
  | "profile_replace"
  | "collection_update"
  | "collection_uninstall"
  | "stop_managing_game"
  | "health_check";
//#endregion
//#region lib/extensions/mod_management/types/IRemoveModOptions.d.ts
interface IRemoveModOptions {
  silent?: boolean;
  reason?: ModChangeReason;
  willBeReplaced?: boolean;
  incomplete?: boolean;
  ignoreInstalling?: boolean;
  modData?: IMod;
  progressCB?: (numRemoved: number, numTotal: number, name: string) => void;
}
//#endregion
//#region lib/extensions/profile_management/actions/profiles.d.ts
/**
 * add or edit a profile
 */
declare const setProfile: reduxAct.ComplexActionCreator1<IProfile, IProfile, {}>;
declare const removeProfile: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const willRemoveProfile: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
/**
 * enable or disable a mod in a profile
 */
declare const setModEnabled: reduxAct.ComplexActionCreator3<
  string,
  string,
  boolean,
  {
    profileId: string;
    modId: string;
    enable: boolean;
  },
  {}
>;
declare const forgetMod: reduxAct.ComplexActionCreator2<
  string,
  string,
  {
    profileId: string;
    modId: string;
  },
  {}
>;
declare const setFeature: reduxAct.ComplexActionCreator3<
  string,
  string,
  any,
  {
    profileId: string;
    featureId: string;
    value: any;
  },
  {}
>;
declare const setProfileActivated: reduxAct.ComplexActionCreator1<string, string, {}>;
interface IEnableOptions {
  installed?: boolean;
  allowAutoDeploy?: boolean;
  willBeReplaced?: boolean;
  reason?: ModChangeReason;
  skipStateChangeEvent?: boolean;
}
declare const setModsEnabled: (
  api: IExtensionApi,
  profileIdIn: string,
  modIdsIn: string[],
  enableIn: boolean,
  optionsIn?: IEnableOptions,
) => PromiseBB$1<void>;
declare namespace api_d_exports {
  export {
    ActionFunc,
    ApiEventArgs,
    ApiEventMap,
    ApiEventName,
    ApiEventResult,
    ApiEvents,
    ArchiveHandlerCreator,
    AttributeExtractor,
    AttributeRenderer,
    CheckFunction,
    CollectionModStatus,
    Condition,
    ConditionResults,
    DialogActions,
    DialogContentItem,
    DialogType,
    DirectoryCleaningMode,
    ExtensionInfo,
    ExtensionLoadFailureDependency,
    ExtensionLoadFailureException,
    LoadOrder as FBLOLoadOrder,
    LockedState as FBLOLockState,
    GameEntryNotFound,
    GameInfoQuery,
    GameLaunchType,
    GameStoreNotFound,
    HealthCheckCategory,
    HealthCheckFixFunction,
    HealthCheckFunction,
    HealthCheckSeverity,
    HealthCheckTrigger,
    IActionDefinition,
    IActionOptions,
    IApiFuncOptions,
    IApp,
    IArchiveHandler,
    IArchiveOptions,
    IAttachment,
    IAttributeState,
    IAvailableExtension,
    IBrowserState,
    ICheckbox,
    IChoiceType,
    ICollectionInstallSession,
    ICollectionInstallState,
    ICollectionModInstallInfo,
    ICollectionsPersistentState,
    IComponentContext,
    IConditionResult,
    IControlBase,
    ICustomExecutionInfo,
    ICustomProps,
    IDashletOptions,
    IDashletSettings,
    IDeployOptions,
    IDeployedFile,
    IDeploymentManifest,
    IDeploymentMethod,
    IDialog,
    IDialogAction,
    IDialogContent,
    IDialogResult,
    IDimensions,
    IDiscoveredTool,
    IDiscoveryPhase,
    IDiscoveryResult,
    IDiscoveryState,
    IDownload,
    IEditChoice,
    IEnableOptions,
    IErrorOptions,
    IExecInfo,
    IExtension,
    IExtensionApi,
    IExtensionApiExtension,
    IExtensionContext,
    IExtensionLoadFailure,
    IExtensionOptional,
    IExtensionState,
    ILoadOrderGameInfo as IFBLOGameInfo,
    IInvalidResult as IFBLOInvalidResult,
    IItemRendererProps as IFBLOItemRendererProps,
    ILoadOrderEntry$1 as IFBLOLoadOrderEntry,
    IValidationResult as IFBLOValidationResult,
    IFileChange,
    IFileFilter,
    IFileListItem,
    IFilterProps,
    IGame,
    IGameDetail,
    IGameInfoEntry,
    IGameModeSettings,
    IGameStore,
    IGameStoreEntry,
    IGameStored,
    IHealthCheck,
    IHealthCheckEntry,
    IHealthCheckResult,
    IHistoryEvent,
    IHistoryStack,
    IInput,
    IInstallResult,
    IInstallationDetails,
    IInstallerInstall,
    IInstallerMatch,
    IInstallerSpec,
    IInstruction,
    ILegacyTestAdapter,
    ILink,
    ILoadOrderDisplayItem,
    ILoadOrderEntry$1 as ILoadOrderEntry,
    ILoadOrderGameInfo,
    ILookupDetails,
    ILookupResult,
    IMainPageOptions,
    IMembership,
    IMergeFilter,
    IMod,
    IModCheckContext,
    IModHealthCheck,
    IModInfo$1 as IModInfo,
    IModInstallSpec,
    IModLookupInfo,
    IModPatches,
    IModReference,
    IModRepoId,
    IModRule,
    IModRuleExtra,
    IModSourceOptions,
    IModTable,
    IModType,
    IModTypeOptions,
    IModifiers,
    INotification,
    INotificationAction,
    INotificationState,
    IOpenOptions,
    IOverlay,
    IOverlayOptions,
    IOverlaysState,
    IPersistor,
    IPosition,
    IPreviewFile,
    IProfile,
    IProfileMod,
    IProgress,
    IProgressProfile,
    IProgressProfileDeploying,
    IProgressWithProfile,
    IQuery,
    IQueryArgEntry,
    IReducerSpec,
    IReference$1 as IReference,
    IReferenceIdentifiers,
    IRegisterProtocol,
    IRegisterRepositoryLookup,
    IRegisteredExtension,
    IRemoveModOptions,
    IRowState,
    IRunOptions,
    IRunParameters,
    IRunningTool,
    ISaveOptions,
    ISession,
    ISessionGameMode,
    ISettings,
    ISettingsAutomation,
    ISettingsDownloads,
    ISettingsGameMode,
    ISettingsInterface,
    ISettingsMods,
    ISettingsNotification,
    ISettingsProfiles,
    ISettingsUpdate,
    ISettingsWorkarounds,
    IStarterInfo,
    IState,
    IStateDownloads,
    IStateGameMode,
    IStatePaths,
    IStateTransactions,
    IStateVerifier,
    IStoreQuery,
    ISupportedResult,
    ITableAttribute,
    ITableFilter,
    ITableState,
    ITableStates,
    ITestResult,
    ITestSupportedDetails,
    IToDoButton,
    ITool,
    IToolStored,
    IUIBlocker,
    IUnavailableReason,
    IUser,
    IValidateKeyData,
    IValidationResult,
    IVerifierRepairContext,
    IWindow,
    InstallFunc,
    InstallPathMode,
    InstallerMatchMode,
    InstallerSpecInstallFunc,
    InstructionType,
    LoadOrder,
    MergeFunc,
    MergeTest,
    NotificationDismiss,
    NotificationType,
    PayloadT,
    PerModCheckFunction,
    PersistingType,
    PersistorKey,
    Placement,
    ProblemSeverity,
    ProgressDelegate,
    PropsCallback,
    PropsCallbackTyped,
    RegisterAction,
    RegisterBanner,
    RegisterControlWrapper,
    RegisterDashlet,
    RegisterDialog,
    RegisterFooter,
    RegisterMainPage,
    RegisterOverlay,
    RegisterSettings,
    RegisterToDo,
    Revertability,
    SortDirection,
    SortType,
    StateChangeCallback,
    TFunction$1 as TFunction,
    TestSupported,
    ThunkStore,
    ToDoType,
    ToolParameterCB,
    UPDATE_CHANNELS,
    UpdateChannel,
    UpdateType,
    ValidationState,
    VerifierDrop,
    VerifierDropParent,
    addReducer,
    isModHealthCheck,
  };
}
//#endregion
//#region lib/types/collections/IGameSpecificInterfaceProps.d.ts
interface IGameSpecificInterfaceProps {
  t: TFunction$1;
  collection: IMod;
  revisionInfo: IRevision;
}
//#endregion
//#region lib/types/collections/api.d.ts
interface ICollectionsGameSupportEntry {
  gameId: string;
  generator: (
    state: IState,
    gameId: string,
    stagingPath: string,
    modIds: string[],
    mods: {
      [modId: string]: IMod;
    },
  ) => Promise<any>;
  parser: (api: IExtensionApi, gameId: string, collection: any) => Promise<void>;
  interface: (props: IGameSpecificInterfaceProps) => JSX.Element;
}
//#endregion
//#region lib/types/IBannerOptions.d.ts
interface IBannerOptions {
  onClick?: () => void;
  condition?: (props: any) => boolean;
  props?: {
    [key: string]: (state: any) => any;
  };
}
//#endregion
//#region lib/types/IModLookupResult.d.ts
interface IModLookupData {
  fileName: string;
  fileSizeBytes: number;
  gameId: string;
  domainName?: string;
  logicalFileName?: string;
  fileVersion: string;
  fileMD5?: string;
  sourceURI: any;
  source?: string;
  rules?: IRule[];
  archived?: boolean;
  details?: {
    homepage?: string;
    category?: string;
    description?: string;
    author?: string;
    modId?: string;
    fileId?: string;
  };
}
interface IModLookupResult {
  key: string;
  value: IModLookupData;
}
interface ILookupOptions {
  requireURL?: boolean;
}
//#endregion
//#region lib/types/IExtensionContext.d.ts
/**
 * Open interface type registry for API events. Enhance using `declare module` syntax.
 * @public
 */
interface ApiEvents {
  "start-download": (
    rawUrls: string[],
    modInfo: {
      game?: string;
      name?: string;
    } & Record<string, unknown>,
    fileName?: string,
    callback?: (err: Error | null, id?: string) => void,
    redownload?: "never" | "ask" | "replace" | "always",
    options?: {
      allowInstall?: boolean | "force";
    },
  ) => string;
  "remove-download": (downloadId: string, callback?: (err: Error | null) => void) => void;
  "pause-download": (downloadId: string, callback?: (err: Error | null) => void) => void;
  "resume-download": (
    downloadId: string,
    callback?: (err: Error | null, id?: string) => void,
    options?: {
      allowInstall?: boolean | "force";
    },
  ) => void;
}
/** Represents all event names.
 * @public
 * */
type ApiEventName = keyof ApiEvents;
/** Represents all event args.
 * @public
 * */
type ApiEventArgs<TEvent extends ApiEventName> = Readonly<Parameters<ApiEvents[TEvent]>>;
/** Represents all event results.
 * @public
 * */
type ApiEventResult<TEvent extends ApiEventName> = ReturnType<ApiEvents[TEvent]>;
/** Compat for NodeJS Event Map */
type ApiEventMap = { [K in ApiEventName]: Parameters<ApiEvents[K]> };
interface ThunkStore<S> extends Redux.Store<S> {
  dispatch: ThunkDispatch<S, null, Redux.Action>;
}
type PropsCallback = () => {
  [key: string]: unknown;
};
type PropsCallbackTyped<T> = () => T;
/**
 * determines where persisted state is stored and when it gets loaded.
 * global: global Vortex state, loaded on startup
 * game: state regarding the managed game. Will be swapped out when the game mode changes
 * profile: state regarding the managed profile. Will be swapped out when the profile changes
 */
type PersistingType = "global" | "game" | "profile";
type CheckFunction = () => PromiseLike<ITestResult>;
type RegisterSettings = (
  title: string,
  element: React$2.ComponentClass<any> | React$2.FunctionComponent<React$2.PropsWithChildren<any>>,
  props?: PropsCallback,
  visible?: () => boolean,
  priority?: number,
) => void;
type RegisterAction = (
  group: string,
  position: number,
  iconOrComponent: string | React$2.ComponentType<React$2.PropsWithChildren<any>>,
  options: IActionOptions,
  titleOrProps?: string | PropsCallback,
  actionOrCondition?: (instanceIds?: string[]) => void | boolean,
  condition?: (instanceIds?: string[]) => boolean | string,
) => void;
type RegisterControlWrapper = (
  group: string,
  priority: number,
  wrapper: React$2.ComponentType<React$2.PropsWithChildren<any>>,
) => void;
type RegisterFooter = (
  id: string,
  element: React$2.ComponentClass<any>,
  props?: PropsCallback,
) => void;
type RegisterBanner = (
  group: string,
  component: React$2.ComponentType<React$2.PropsWithChildren<any>>,
  options: IBannerOptions,
) => void;
interface IModSourceOptions {
  /**
   * condition for this source to show up. Please make sure this returns quickly, cache if
   * necessary.
   */
  condition?: () => boolean;
  icon?: string;
  supportsModId?: boolean;
}
interface IMainPageOptions {
  /**
   * id for this page. If none is specified the page title is used. Use the id to avoid
   * name collisions if another extension is already using the same title.
   */
  id?: string;
  /**
   * A hotkey to be pressed together with Ctrl+Shift to open that page
   */
  hotkey?: string;
  /**
   * A hotkey to be pressed to open that page. In this case the caller has to specify any modifiers
   * in the format required by electron
   */
  hotkeyRaw?: string;
  visible?: () => boolean;
  group: "dashboard" | "global" | "per-game" | "support" | "hidden";
  isClassicOnly?: boolean;
  isModernOnly?: boolean;
  /**
   * Opt this page into the redesigned UI. When set, the page is rendered without
   * the legacy `.main-page` / header / body-container wrappers and is expected
   * to render its own Page as the flat subtree root.
   */
  newLayout?: boolean;
  priority?: number;
  props?: PropsCallback;
  badge?: ReduxProp<any>;
  activity?: ReduxProp<boolean>;
  onReset?: () => void;
  mdi?: string;
  /** Self-subscribing status badge shown on this page's left-menu item. */
  menuBadge?: React$2.ComponentType<React$2.PropsWithChildren<unknown>>;
}
type RegisterMainPage = (
  icon: string,
  title: string,
  element: React$2.ComponentType<React$2.PropsWithChildren<any>>,
  options: IMainPageOptions,
) => void;
interface IDashletOptions {
  fixed?: boolean;
  closable?: boolean;
}
/**
 * @param height Height of the dashlet in rows. Please note that 1 row is very slim, it's not
 *               commonly used in practice
 */
type RegisterDashlet = (
  title: string,
  width: 1 | 2 | 3,
  height: 1 | 2 | 3 | 4 | 5 | 6,
  position: number,
  component:
    | React$2.ComponentClass<any>
    | React$2.FunctionComponent<React$2.PropsWithChildren<any>>,
  isVisible: (state: any) => boolean,
  props: PropsCallback,
  options: IDashletOptions,
) => void;
type RegisterDialog = (
  id: string,
  element: React$2.ComponentType<React$2.PropsWithChildren<any>>,
  props?: PropsCallback,
) => void;
type RegisterOverlay = (
  id: string,
  element: React$2.ComponentType<React$2.PropsWithChildren<any>>,
  props?: PropsCallback,
) => void;
type ToDoType = "settings" | "search" | "workaround" | "more";
interface IToDoButton {
  text: string;
  icon: string;
  onClick: () => void;
}
type RegisterToDo = (
  id: string,
  type: ToDoType,
  props: (state: any) => any,
  icon: ((props: any) => JSX.Element) | string,
  text: ((t: TFunction$1, props: any) => JSX.Element) | string,
  action: (props: any) => void,
  condition: (props: any) => boolean,
  value: ((t: TFunction$1, props: any) => JSX.Element) | string,
  priority: number,
) => void;
interface IRegisterProtocol {
  (
    protocol: string,
    def: boolean,
    callback: (url: string, install: boolean) => void,
  ): Promise<boolean>;
}
interface IRegisterRepositoryLookup {
  (
    repositoryId: string,
    preferOverMD5: boolean,
    callback: (id: IModRepoId) => PromiseBB$1<IModLookupResult[]>,
  ): any;
}
interface IFileFilter {
  name: string;
  extensions: string[];
}
interface IOpenOptions {
  title?: string;
  defaultPath?: string;
  filters?: IFileFilter[];
  create?: boolean;
}
interface ISaveOptions {
  title?: string;
  buttonLabel?: string;
  defaultPath?: string;
  filters?: IFileFilter[];
}
type StateChangeCallback<T = any> = (previous: T, current: T) => void;
/**
 * additional detail to further narrow down which file is meant
 * in a lookup
 *
 * @export
 * @interface ILookupDetails
 */
interface ILookupDetails {
  filePath?: string;
  fileName?: string;
  fileMD5?: string;
  fileSize?: number;
  gameId?: string;
}
/**
 * options that can be passed to archive handler on opening
 */
interface IArchiveOptions {
  verify?: boolean;
  gameId?: string;
  version?: string;
  create?: boolean;
}
/**
 * interface for archive handlers, exposing files inside archives to to other extensions
 *
 * @export
 * @interface IArchiveHandler
 */
interface IArchiveHandler {
  readDir(archPath: string): PromiseBB$1<string[]>;
  readFile?(filePath: string): NodeJS.ReadableStream;
  extractFile?(filePath: string, outputPath: string): PromiseBB$1<void>;
  extractAll(outputPath: string): PromiseBB$1<void>;
  addFile?(filePath: string, sourcePath: string): PromiseBB$1<void>;
  create?(sourcePath: string): PromiseBB$1<void>;
  write?(): PromiseBB$1<void>;
}
type ArchiveHandlerCreator = (
  fileName: string,
  options: IArchiveOptions,
) => PromiseBB$1<IArchiveHandler>;
/**
 * callback used to extract download information into mod info.
 * This also gets called a lot when displaying uninstalled mods in the mod list
 * (the modPath is going to be undefined) so when that flag is set, the extractor should
 * not be accessing the disk or network or do any complex coomputation
 */
type AttributeExtractor = (
  modInfo: any,
  modPath: string,
) => PromiseLike<{
  [key: string]: any;
}>;
interface IGameDetail {
  title: string;
  value: any;
  type?: string;
}
interface IAttachment {
  type: "file" | "data";
  data: any;
  id: string;
  description: string;
}
interface IErrorOptions {
  id?: string;
  message?: string;
  isBBCode?: boolean;
  isHTML?: boolean;
  allowReport?: boolean;
  warning?: boolean;
  allowSuppress?: boolean;
  hideDetails?: boolean;
  replace?: {
    [key: string]: string;
  };
  attachments?: IAttachment[];
  extensionName?: string;
  extension?: IRegisteredExtension;
  extensionRemote?: IAvailableExtension;
  actions?: INotificationAction[];
}
/**
 * a query function that will be called to retrieve information about a game.
 * The game object passed in in a union of the IGameStored and IDiscoveryResult data
 * structures for the game but keep in mind that the game may not be discovered or
 * it may be a custom-added game so either structure may be empty. When accessing any
 * field that doesn't exist in both IGameStored and IDiscoveryResult, please assume
 * it may be undefined.
 */
type GameInfoQuery = (game: any) => PromiseLike<{
  [key: string]: IGameDetail;
}>;
interface IMergeFilter {
  baseFiles: (deployedFiles: IDeployedFile[]) => Array<{
    in: string;
    out: string;
  }>;
  filter: (fileName: string) => boolean;
}
/**
 * callback to determine if a merge function applies to a game. If so, return an
 * object that describes what files to merge, otherwise return undefined
 */
type MergeTest = (game: IGame, gameDiscovery: IDiscoveryResult) => IMergeFilter;
/**
 * callback to do the actual merging
 */
type MergeFunc = (filePath: string, mergePath: string) => PromiseLike<void>;
/**
 * options used when starting an external application through runExecutable
 */
interface IRunOptions {
  cwd?: string;
  env?: {
    [key: string]: string;
  };
  suggestDeploy?: boolean;
  shell?: boolean;
  detach?: boolean;
  expectSuccess?: boolean;
  onSpawned?: (pid?: number) => void;
  onExit?: (code: number | null) => void;
}
/**
 * all parameters passed to runExecutable. This is used to support interpreters
 * changing the parameters
 */
interface IRunParameters {
  executable: string;
  args: string[];
  options: IRunOptions;
}
/**
 * callback to be used to determine list of variables for the tool command line
 */
type ToolParameterCB = (options: IRunParameters) => {
  [key: string]: string;
};
interface IPreviewFile {
  /**
   * label to display to the user if applicable
   */
  label: string;
  /**
   * full path to the file to preview
   */
  filePath: string;
}
interface IApiFuncOptions {
  /**
   * minimum number of arguments the caller has to pass to a api extension function
   */
  minArguments?: number;
}
interface IExtensionApiExtension
  extends INexusAPIExtension, IModsAPIExtension, IDownloadsAPIExtension {
  ensureLoggedIn?: () => PromiseBB$1<void>;
  awaitProfileSwitch?: () => PromiseBB$1<string>;
  showOverlay?: (
    id: string,
    title: string,
    content: string | React$2.ComponentType<React$2.PropsWithChildren<any>>,
    pos?: IPosition,
    options?: IOverlayOptions,
  ) => void;
  showHistory?: (stack: string) => void;
  addToHistory?: (stack: string, entry: IHistoryEvent) => void;
  [key: string]: (...args: any[]) => any;
}
/**
 * interface for convenience functions made available to extensions
 *
 * @export
 * @interface IExtensionApi
 */
interface IExtensionApi {
  /**
   * name of the extension to use this api with
   */
  extension?: IRegisteredExtension;
  /**
   * show a notification to the user.
   * This is not available in the call to registerReducer
   *
   * @return the notification id
   *
   * @type {INotification}
   * @memberOf IExtensionApi
   */
  sendNotification?: (notification: INotification) => string;
  /**
   * show an error message to the user.
   * This is a convenience wrapper for sendNotification.
   * This is not available in the call to registerReducer
   *
   * @memberOf IExtensionApi
   */
  showErrorNotification?: (
    message: string,
    detail: string | Error | any,
    options?: IErrorOptions,
  ) => void;
  /**
   * show a dialog
   */
  showDialog?: (
    type: DialogType,
    title: string,
    content: IDialogContent,
    actions: DialogActions,
    id?: string,
  ) => PromiseBB$1<IDialogResult>;
  /**
   * close a dialog
   */
  closeDialog?: (id: string, actionKey?: string, input?: any) => void;
  /**
   * hides a notification by its id
   *
   * @memberOf IExtensionApi
   */
  dismissNotification?: (id: string) => void;
  dismissAllNotifications?: () => void;
  /**
   * hides a notification and don't show it again
   * if this is called with the second parameter set to false, it re-enables the notification
   * instead
   */
  suppressNotification?: (id: string, suppress?: boolean) => void;
  /**
   * show a system dialog to open a single file
   *
   * @memberOf IExtensionApi
   */
  selectFile: (options: IOpenOptions) => PromiseBB$1<string>;
  /**
   * show a system dialog to save a single file
   *
   * @memberOf IExtensionApi
   */
  saveFile: (options: ISaveOptions) => PromiseBB$1<string>;
  /**
   * show a system dialog to select an executable file
   *
   * @memberOf IExtensionApi
   */
  selectExecutable: (options: IOpenOptions) => PromiseBB$1<string>;
  /**
   * show a system dialog to open a single directory
   *
   * @memberOf IExtensionApi
   */
  selectDir: (options: IOpenOptions) => PromiseBB$1<string>;
  /**
   * the redux store containing all application state & data
   *
   * Please note: this store object will remain valid for the whole
   *   application runtime so you can store it, bind it to functions
   *   and so on. The state object (store.getState()) is immutable and
   *   will be a different object whenever the state is changed.
   *   Thus you should *not* store/bind the state directly unless you
   *   actually want a "snapshot" of the state.
   *
   * @type {Redux.Store<any>}
   * @memberOf IExtensionApi
   */
  store?: ThunkStore<any>;
  /**
   * event emitter
   *
   * @type {NodeJS.EventEmitter}
   * @memberOf IExtensionApi
   */
  events: NodeJS.EventEmitter<ApiEventMap & Record<string, any[]>>;
  /**
   * translation function
   */
  translate: TFunction$1;
  /**
   * prepare a string to be translated further down the line.
   */
  laterT: TFunction$1;
  /**
   * active locale
   */
  locale: () => string;
  /**
   * get direct access to the i18next object managing localisation.
   * This is only needed to influence how localisation works in general,
   * to just translate a text, use "translate"
   */
  getI18n: () => i18n;
  /**
   * retrieve path for a known directory location.
   *
   * Note: This uses electrons ids for known folder locations.
   * Please write your extensions to always use the appropriate
   * folder location returned from this function, especially
   * 'userData' should be used for all settings/state/temporary data
   * if you don't want to/can't use the store.
   * If Vortex introduces a way for users to customise storage locations
   * then getPath will return the customised path so you don't have to
   * adjust your extension.
   *
   * @type {Electron.AppPathName}
   * @memberOf IExtensionApi
   */
  getPath: (name: string) => string;
  /**
   * register a callback for changes to the state
   *
   * @param {string[]} path path in the state-tree to watch for changes,
   *                   i.e. ['settings', 'interface', 'language'] would call the callback
   *                   for all changes to the interface language
   *
   * @memberOf IExtensionApi
   */
  onStateChange?: <T = any>(path: string[], callback: StateChangeCallback<T>) => void;
  /**
   * registers an uri protocol to be handled by this application. If the "def"ault parameter
   * is set to true, this application will also be inserted as the system wide default handler
   * for the protocol. Use with caution, as this will overwrite the previous value, which
   * can't be undone automatically
   *
   * @type {IRegisterProtocol}
   * @memberOf IExtensionContext
   */
  registerProtocol: IRegisterProtocol;
  /**
   * registers a lookup mechanism that can be used to look up information about a mod based on ids.
   * This will either work as a fallback or as a replacement to the md5 based lookup for
   * applicable mods.
   * The "repositoryId" should be the same as the "source" used.
   * It's possible to return multiple results if the input data doesn't definitively identify a
   * single item but this might be a bit of a mess to figure out later.
   */
  registerRepositoryLookup: IRegisterRepositoryLookup;
  /**
   * deregister an uri protocol currently being handled by us
   *
   * @memberOf IExtensionApi
   */
  deregisterProtocol: (protocol: string) => void;
  /**
   * find meta information about a mod
   *
   * @memberOf IExtensionApi
   */
  lookupModReference: (
    ref: IModReference,
    options?: ILookupOptions,
  ) => PromiseBB$1<IModLookupResult[]>;
  /**
   * add a meta server
   * Please note that setting a server with the same id again will replace the existing one
   * with that id and setting it to undefined removes it
   */
  addMetaServer: (id: string, server: IServer) => void;
  /**
   * generate an md5 hash for the specified file
   * @param data Either a string containing the file path or a Buffer containing the data to hash
   * @param progressFunc optional function to report progress
   * @returns a promise resolving to the md5 hash result
   */
  genMd5Hash: (
    data: string | Buffer,
    progressFunc?: (progress: number, total: number) => void,
  ) => PromiseBB$1<IHashResult>;
  /**
   * find meta information about a mod
   * this will calculate a hash and the file size of the specified file
   * for the lookup unless those details are already provided.
   * Please note that it's still possible for the file to get multiple
   * matches, i.e. if it has been re-uploaded, potentially for a different
   * game.
   *
   * @memberOf IExtensionApi
   */
  lookupModMeta: (details: ILookupDetails, ignoreCache?: boolean) => PromiseBB$1<ILookupResult[]>;
  /**
   * save meta information about a mod
   *
   * @memberOf IExtensionApi
   */
  saveModMeta: (modInfo: IModInfo$1) => PromiseBB$1<void>;
  /**
   * opens an archive
   */
  openArchive: (
    archivePath: string,
    options?: IArchiveOptions,
    extension?: string,
  ) => PromiseBB$1<Archive>;
  /**
   * clear the stylesheet cache to ensure it gets rebuilt even if the list of files hasn't changed
   */
  clearStylesheet: () => void;
  /**
   * insert or replace a sass-stylesheet. It gets integrated into the existing sheets based
   * on the key:
   * By default, the sheets "variables", "details" and "style" are intended to customize the
   * look of the application.
   * - "variables" is a set of variables representing colors, sizes and
   *   margins that will be used throughout the application.
   * - "details" applies these variables to different generic controls (like tabs, lists, ...)
   * - "style" is where you should customize individual controls with css rules
   *
   * If your extension sets a sheet that didn't exist before then that sheet will be inserted
   * before the "style" sheet but after everything else. This allows themes to affect extension
   * styles.
   *
   * @note Important: As usual with css, rules you add affect the entire application, without
   *  severely restricting themes and extensions we can not automatically restrict your stylesheets
   *  to the controls added by your extension. This means it's your responsibility to make sure
   *  your stylesheet doesn't modify foreign controls.
   *
   * @param {string} key identify the key to set. If this is an existing sheet, that sheet will be
   *                     replaced
   * @param {string} filePath path of the corresponding stylesheet file
   *
   * @memberOf IExtensionContext
   */
  setStylesheet: (key: string, filePath: string) => void;
  /**
   * run an executable. This is comparable to node.js child_process.spawn but it allows us to add
   * extensions, like support interpreters and hooks.
   * It will also automatically ask the user to authorize elevation if the executable requires it
   * The returned promise is resolved when the started process has run to completion.
   * IRunOptions.onSpawned can be used to react to when the process has been started.
   */
  runExecutable: (executable: string, args: string[], options: IRunOptions) => PromiseBB$1<void>;
  /**
   * emit an event and allow every receiver to return a Promise. This call will only return
   * after all these Promises are resolved.
   * If the event handlers return a value, this returns an array of results
   */
  emitAndAwait: (<TEvent extends ApiEventName>(
    eventName: TEvent,
    ...args: ApiEventArgs<TEvent>
  ) => Promise<ApiEventResult<TEvent> extends void ? void : ApiEventResult<TEvent>[]>) &
    (<TResult = unknown, TArgs extends readonly unknown[] = unknown[]>(
      eventName: string,
      ...args: TArgs
    ) => Promise<TResult[]>);
  /**
   * handle an event emitted with emitAndAwait. The listener can return a promise and the emitter
   * will only return after all promises from handlers are returned.
   * Note that listeners should report all errors themselves, it is considered a bug if the listener
   * returns a rejected promise.
   * If errors do need to be reported they have to be part of the resolved valued
   */
  onAsync: (<TEvent extends ApiEventName>(
    eventName: TEvent,
    listener: (...args: ApiEventArgs<TEvent>) => PromiseLike<ApiEventResult<TEvent>>,
  ) => void) &
    (<TResult = unknown, TArgs extends readonly unknown[] = unknown[]>(
      eventName: string,
      listener: (...args: TArgs) => PromiseLike<TResult>,
    ) => void);
  /**
   * wraps a function such that it will emitAndAwait `will-${eventName}` and `did-${eventName}` events
   * before and after invoking the actual callback.
   * both these events receive the arguments passed to the callback, the did-event also receives
   * the result of the callback if any (the result is the first argument because the number
   * of arguments may be variable)
   */
  withPrePost: (<TEvent extends ApiEventName>(
    eventName: string,
    callback: (...args: ApiEventArgs<TEvent>) => PromiseLike<ApiEventResult<TEvent>>,
  ) => (...args: ApiEventArgs<TEvent>) => Promise<ApiEventResult<TEvent>>) &
    (<TResult, TArgs extends readonly unknown[] = unknown[]>(
      eventName: string,
      callback: (...args: TArgs) => PromiseLike<TResult>,
    ) => (...args: TArgs) => Promise<TResult>);
  /**
   * returns true if the running version of Vortex is considered outdated. This is mostly used
   * to determine if feedback should be sent to Nexus Mods.
   */
  isOutdated: () => boolean;
  /**
   * highlight a control for a short time to direct the users attention to it.
   * The control (or controls) is identified by a css selector.
   * A text can be added, but no promise that it actually looks good in practice
   *
   * Usually the css style used to draw the outline contains a bit of hackery to offset the
   * padding and border width it adds so that the contents doesn't get moved around.
   * If altStyle is set we use absolute positioning to get the same effect. This requires
   * us to make the target item "position: relative" though which is more intrusive and can
   * break the styling of the contents more severely.
   */
  highlightControl: (
    selector: string,
    durationMS: number,
    text?: string,
    altStyle?: boolean,
  ) => void;
  /**
   * returns a promise that resolves once the ui has been displayed.
   * This is useful if you have a callback that may be triggered before the ui is
   * displayed but may require the UI to be processed.
   * Specifically events can only be sent once this event has been triggered
   */
  awaitUI: () => PromiseBB$1<void>;
  /**
   * wrapper for api.store.getState() with the benefit that it automatically assigns a type
   */
  getState: <T extends IState = IState>() => T;
  /**
   * get a list of extensions currently loaded into Vortex
   */
  getLoadedExtensions: () => IRegisteredExtension[];
  /**
   * functions made available from extension to extension. Callers have to make
   * sure they handle gracefully the case where a function doesn't exist
   */
  ext: IExtensionApiExtension;
  NAMESPACE: string;
}
interface IVerifierRepairContext {
  parentKey?: string;
  parent?: unknown;
  key: string;
}
interface IStateVerifier {
  description: (input: any) => string;
  type?: "map" | "string" | "boolean" | "number" | "object" | "array";
  noUndefined?: boolean;
  noNull?: boolean;
  noEmpty?: boolean;
  elements?: {
    [key: string]: IStateVerifier;
  };
  required?: boolean;
  deleteBroken?: boolean | "parent";
  repair?: (input: any, def: any, context?: IVerifierRepairContext) => any;
}
/**
 * The repair function can't fix a value so delete it instead
 */
declare class VerifierDrop extends Error {
  constructor();
}
/**
 * The repair function can't fix a value so delete the parent object instead
 */
declare class VerifierDropParent extends Error {
  constructor();
}
type PayloadT<Type> = Type extends ComplexActionCreator<infer X> ? X : never;
declare function addReducer<ActionT, StateT>(
  action: ActionT,
  handler: (state: StateT, payload: PayloadT<ActionT>) => StateT,
): {
  [x: number]: (state: StateT, payload: PayloadT<ActionT>) => StateT;
};
/**
 * specification a reducer registration has to follow.
 * defaults must be an object with the same keys as
 * reducers
 *
 * @export
 * @interface IReducerSpec
 */
interface IReducerSpec<
  T = {
    [key: string]: any;
  },
> {
  reducers: {
    [key: string]: (state: T, payload: any) => T;
  };
  defaults: T;
  verifiers?: {
    [key: string]: IStateVerifier;
  };
}
interface IModTypeOptions {
  mergeMods?: boolean | ((mod: IMod) => string);
  name?: string;
  customDependencyManagement?: boolean;
  deploymentEssential?: boolean;
  noConflicts?: boolean;
}
/**
 * The extension context is an object passed into all extensions during initialisation.
 *
 * There are three main parts to this object:
 * a) api. This is an object that contains various functions and objects to interact with the
 *    main application. During runtime of the application (that is: after the startup phase)
 *    this will be the only part of the context object you need.
 *    Most importantly it gives you access to the application store (maintaining all state)
 *    and a bunch of "stateful" convenience functions (stuff like displaying notifications/
 *    dialogs in a way consistent with the remaining application).
 * b) register functions. These must be called immediately inside the init function and they
 *    "inject" your extension functionality into the main function. That is: you register ui
 *    controls, callbacks, ... and the main function will then use that as necessary.
 *    Please note that a call to a register function has no immediate effect, those calls are
 *    stored and evaluated once all extensions have been initialised.
 *    An extension can add new register functions by simply assigning to the context object.
 *    There is one limitation though: Due to the way those functions are called you can't have
 *    optional parameters in register functions, the caller always have to provide the exact number
 *    of arguments to get the function to be called correctly. Vortex will pass additional
 *    parameters to the function that help identify the extension that called the function.
 *    These functions are then available to all other extensions, the order in which extensions
 *    are loaded is irrelevant (and can't be controlled).
 *    If an extension uses a register function from another extension it becomes implicitly
 *    dependent on it. If the register function isn't available (because that other extension
 *    isn't installed) the dependent extension isn't loaded either.
 *    To avoid this, call context.optional.registerXYZ(). Such a call will be evaluated if possible
 *    but won't cause an error if it isn't.
 *    Please note that context is a "Proxy" object that will accept calls to any "registerXYZ"
 *    function no matter if it's available or not. You can't "introspect" this object reliably,
 *    it will not show the available register functions.
 * c) once-callback. This is a callback that will be run after all extensions have been initialized
 *    and all register functions have been evaluated. This is still *before* a gamemode has been
 *    activated so you can't access game-specific data immediately inside once.
 *    It will be called only once at application startup whereas init is called once per process
 *    (that is: twice in total). It should be used for all your extension setup except for the
 *    register calls (i.e. installing event handlers, doing startup calculations).
 *    This is because at the time once is called, the context.api
 *    object is fully initialised and once is only caused if your extension should really load
 *    (as in: it's compatible with the current api).
 */
interface IExtensionContext {
  /**
   * register a settings page
   *
   * @type {IRegisterSettings}
   * @memberOf IExtensionContext
   */
  registerSettings: RegisterSettings;
  /**
   * register a mod deployment method
   *
   * @memberof IExtensionContext
   */
  registerDeploymentMethod: (method: IDeploymentMethod) => void;
  /**
   * register an installer
   * @param {string} id id for the installer. currently only used for logging
   * @param {number} priority the priority of the installer. The supported installer with the
   *                          highest priority (smallest number) gets to handle the mod.
   *                          Note: scripted fomods are handled at prio 20 and there is a fallback
   *                          installer that will handle practically any archive at prio 100 so
   *                          you want to place your installer in the range 21-99.
   *                          If your installer has priority > 100 it will probably never be
   *                          considered, if it has priority < 20 it will disable fomod installers
   *                          which only makes sense if you implement a scripted installer system
   *                          as well that is superior to fomod.
   * @param {TestSupported} testSupported function called to determine if the handler can deal
   *                                      with a mod
   * @param {InstallFunc} install function called to actually install a mod
   */
  registerInstaller: (
    id: string,
    priority: number,
    testSupported: TestSupported,
    install: InstallFunc,
  ) => void;
  /**
   * register an action (can be a button or a menu item)
   *
   * @type {IRegisterIcon}
   * @memberOf IExtensionContext
   */
  registerAction: RegisterAction;
  /**
   * register a wrapper for an existing control. Only controls designed for extension can
   * be used.
   */
  registerControlWrapper: RegisterControlWrapper;
  /**
   * registers a page for the main content area
   *
   * @type {IRegisterMainPage}
   * @memberOf IExtensionContext
   */
  registerMainPage: RegisterMainPage;
  /**
   * register a dashlet to be displayed on the welcome screen
   */
  registerDashlet: RegisterDashlet;
  /**
   * register a dialog (or any control that is rendered independent of the main content area
   * really)
   * This dialog has to control its own visibility
   */
  registerDialog: RegisterDialog;
  /**
   * registers a component to be rendered very high in the DOM, overlaying the main window.
   * Similar to registerDialogs, except that Vortex won't control whether the overlay gets rendered.
   */
  registerOverlay: RegisterOverlay;
  /**
   * registers a element to be displayed in the footer
   *
   * @type {IRegisterFooter}
   * @memberOf IExtensionContext
   */
  registerFooter: RegisterFooter;
  /**
   * register an todo message that will be shown to new users until they
   * dismiss it. You can provide a condition under which it will appear.
   * Please don't overuse this as to not intimidate the user. Also keep in mind that the
   * user can dismiss any todo message without taking action and it will never appear
   * again.
   */
  registerToDo: RegisterToDo;
  /**
   * registers a banner, which is a control that will show in a fixed location with fixed
   * size (determined by the group). If there are multiple banners in the same spot,
   * they will cycle.
   */
  registerBanner: RegisterBanner;
  /**
   * register a source (usually a website) that the mod was retrieved from and that will
   * be used as the reference for features like checking for updates and such.
   * Please note that registering this source has no other effect than adding an option
   * to the selection of mod sources, the corresponding extension has to implement
   * actual features
   * The source can also be used to browse for further mods
   */
  registerModSource: (
    id: string,
    name: string,
    onBrowse?: () => void,
    options?: IModSourceOptions,
  ) => void;
  /**
   * register a reducer to introduce new set-operations on the application
   * state.
   * Note: For obvious reasons this is executed before the store is set up so
   * many api operations are not possible during this call
   *
   * The first part of the path decides how and if state persisted:
   *   * window, settings, persistent are always persisted and automatically restored
   *   * session and all other will not be persisted at all. Although session is not
   *     treated different than any other path, please use this path  for all
   *     ephemeral state
   *
   * Another word on the path: You can introduce additional reducers for any "leaf" of
   *   the settings tree and you can introduce new "subnodes" in the tree at any depth.
   *   For technical reasons it is however not possible to introduce subnodes to a leaf
   *   or vice-versa.
   *   I.e. settings.interface contains all settings regarding the ui. Your extension
   *   can register a reducer with path ['settings', 'interface'] and ['settings', 'whatever']
   *   but not ['settings'] and not ['settings', 'interface', 'somethingelse']
   *
   * And one more thing about the spec: All things you store inside the store need to be
   *   serializable. This means: strings, numbers, booleans, arrays, objects are fine but
   *   functions are not. If you absolutely need to store a callback or something then create
   *   a "registry" or factory and store just an id that allows you to retrieve or generate
   *   the function on demand.
   *
   * @param {string[]} path The path within the settings store
   * @param {IReducerSpec} spec a IReducerSpec object that contains reducer functions and defaults
   *        for the newly introduced settings
   *
   * @memberOf IExtensionContext
   * @note If you have registerReducer calls you should call them first thing in the init function.
   *       Usually if your init call fails your extension shouldn't load at all but in case that
   *       doesn't work, registering any functionality that depends on state that never got loaded
   *       would load to further bug reports that are a lot harder to investigate
   */
  registerReducer: (path: string[], spec: IReducerSpec) => void;
  /**
   * register a hive in the store to be persisted. A hive is a top-level branch in the state,
   * like "settings", "state", ...
   * You must not register a hive that is already being persisted or you get data inconsistency.
   * Do not use this on a hive that is registered with "registerPersistor". With this function,
   * Vortex takes care of storing/restoring the data, with registerPersistor you can customize the
   * file format.
   *
   * @param {PersistingType} type controls where the state is stored and when it is loaded
   * @param {string} hive the top-level key inside the state.
   *
   * @memberOf IExtensionContext
   */
  registerSettingsHive: (type: PersistingType, hive: string) => void;
  /**
   * registers a handler for a download URL scheme (e.g. "nxm"). The handler
   * resolves the scheme-specific URL to a plain http/https URL that can be
   * downloaded directly.
   */
  registerDownloadProtocol: (
    scheme: string,
    handler: (inputUrl: string) => PromiseLike<{
      urls: string[];
      updatedUrl?: string;
      meta: unknown;
    }>,
  ) => void;
  /**
   * register a new persistor that will hook a data file into the application store,
   * meaning any part of the application can access that data like any other data in the application
   * state and the UI will automatically refresh if it's tied to that data.
   * This way you can unify the access to foreign data files
   *
   * @param {string} hive the top-level key inside the state that this persistor will add
   *                      it's data to. We can't add persistors inside an existing node (
   *                      technical reasons) but you can implement an aggregator-persistor
   *                      that syncs sub-nodes with different files
   * @param {IPersistor} persistor the persistor. Adhere to the interface and it should be fine
   * @param {number} debounce this value (in milliseconds) determins how frequent the file will
   *                          be updated on disk. Higher values reduce load and disk activity
   *                          but more data could be lost in case of an application crash.
   *                          Defaults to 200 ms
   *
   * @memberOf IExtensionContext
   */
  registerPersistor: (hive: string, persistor: IPersistor, debounce?: number) => void;
  /**
   * add an attribute to a table. An attribute can appear as a column inside the table or as a
   * detail field in the side panel.
   * The tableId identifies, obviously, the table to which the attribute should be added. Please
   * find the right id in the documentation of the corresponding extension.
   * Please prefer specifying the attribute as a function returning the ITableAttribute instead of
   * the attribute directly
   */
  registerTableAttribute: (tableId: string, attribute: ITableAttribute) => void;
  /**
   * add a check that will automatically be run on the specified event.
   * Such checks can be used by extensions to check the integrity of their own data, of the
   * application setup or that of the game and present them to the user in a common way.
   *
   * @memberOf IExtensionContext
   */
  registerTest: (id: string, event: string, check: CheckFunction) => void;
  /**
   * register a health check. Pass an IHealthCheck for whole-game checks, or
   * an IModHealthCheck for per-mod checks (the registry iterates mods and
   * aggregates per-mod results).
   *
   * Prefer this over the legacy `registerTest` for new code.
   *
   * @memberOf IExtensionContext
   */
  registerHealthCheck: (healthCheck: IHealthCheck | IModHealthCheck) => void;
  /**
   * register a handler for archive types so the content of such archives is exposed to
   * the application (especially other extensions)
   *
   * @memberOf IExtensionContext
   */
  registerArchiveType: (extension: string, handler: ArchiveHandlerCreator) => void;
  /**
   * registers support for a game
   *
   * @param {IGame} game
   */
  registerGame: (game: IGame) => void;
  /**
   * register a game stub. This is to ease the transition for games that used to be bundled with
   * Vortex and might already be in use but are now maintained by a third party.
   */
  registerGameStub: (game: IGame, ext: IExtensionDownloadInfo) => void;
  /**
   * registers support for a game store.
   *
   * @param {IGameStore} gameStore
   */
  registerGameStore: (gameStore: IGameStore) => void;
  /**
   * registers a provider for general information about a game
   * @param {string} id unique id identifying the provider
   * @param {number} priority if two providers provide the same info (same key) the one with the
   *                          higher priority (smaller number) ends up providing that piece of info
   * @param {number} expireMS the time (in milliseconds) before the info "expires". After expiry it
   *                          will be re-requested. You usually want this to be several days, not
   *                          seconds or milliseconds
   * @param {string[]} keys the keys this provider will provide. If the query function doesn't
   *                        return a value for one of these keys, a null is stored. If the query
   *                        returns keys that aren't listed here they will still be stored, but
   *                        the query will only be run if a listed key is missing or the expiry time
   *                        runs out
   * @param {Function} query the query function
   */
  registerGameInfoProvider: (
    id: string,
    priority: number,
    expireMS: number,
    keys: string[],
    query: GameInfoQuery,
  ) => void;
  /**
   * register an extractor that can access all information known about a downloaded archive and
   * tranfer them into the modInfo data structure so it can be accessed when rendering/managing
   * the mod
   *
   * @param {number} priority determins the order in which the attributes are combined.
   *                          if two extractors produce the same attribute, the one with the higher
   *                          priority (smaller number) wins. The default attributes retrieved from
   *                          the meta database have priority 100.
   * @param {AttributeExtractor} extractor the function producing mod attributes
   */
  registerAttributeExtractor: (priority: number, extractor: AttributeExtractor) => void;
  /**
   * register a mod type
   * @param {string} id internal identifier for this mod type. can't be the empty string ''!
   * @param {number} priority if there is difficulty differentiating between two mod types, the
   *                          higher priority (smaller number) one wins.
   *                          Otherwise please use 100 so there is room for other extensions
   *                          with lower and higher priority
   * @param {(gameId) => boolean} isSupported return true if the mod type is supported for this
   *                                          game
   * @param {(game: IGame) => string} getPath given the specified game, return the absolute path to
   *                                          where games of this type should be installed.
   * @param {(instructions) => PromiseBB<boolean>} test given the list of install instructions,
   *                                                  determine if the installed mod is of this type
   * @param {IModTypeOptions} options options controlling the mod type
   */
  registerModType: (
    id: string,
    priority: number,
    isSupported: (gameId: string) => boolean,
    getPath: (game: IGame) => string,
    test: (installInstructions: IInstruction[]) => PromiseBB$1<boolean>,
    options?: IModTypeOptions,
  ) => void;
  /**
   * register an action sanity check
   * a sanity check like this is called before any redux-action of the specified type and gets
   * an opportunity to reject it with an error message.
   * This is more powerful than checking inside the reducer as you can access the entire state
   * for the check and it's more robust than checking before dispatching the action, because actions
   * may be dispatched from many places.
   * Please don't overdo this for high-frequency actions as that may affect performance. Also
   * be aware of side effects from stopping an action as all other code is still run.
   * I.e. if you'd reject the addition of a downloaded file, the file itself is still there.
   * In extreme cases you could instead throw an exception from the check (which would bubble up
   * through the dispatch call) which will likely crash Vortex.
   * That might be preferrable to corrupting state
   * @param {string} actionType type of the action (like STORE_WINDOW_SIZE)
   * @param {SanityCheck} check the check to run for the specified action
   */
  registerActionCheck: (actionType: string, check: SanityCheck) => void;
  /**
   * register a file merge that needs to happen during deployment.
   * modType is the mod type this applies to, so only mods from this mod type are merged
   * and the output merge is of that type as well.
   *
   * This api is - complex - as it tries to cover multiple related use cases. Please
   * make sure you understand how it works becauses trial&error might drive you mad.
   *
   * The way this works is that as part of deployment the "in" files get copied to a working
   * directory. It's ok for these files to be non-existent. It's ok for these files to be from one
   * of the deployed mods (see below) or a file generated by or shipped with the game itself.
   * Then the "merge" function is called on each matching file from each mod so you get an
   * opportunity to incorporate the modded content into the file in the working directory
   * Finally, the merged file from the working directory is deployed, just like every other file,
   * based on which mod type you specified.
   * If the "in" file was from mone of the mods, the merge function will be called with that
   * file again, so it's your own responsibility to not duplicate the content from that file.
   * If the "in" file did not exist, you get an empty file as the basis to merge into, that is not
   * an error.
   * The "out" path specified by the baseFiles is the relative path of the "temporary" file
   * in the working directory. Together with the mod type, this will control what the final output
   * path is.
   */
  registerMerge: (test: MergeTest, merge: MergeFunc, modType: string) => void;
  /**
   * register an interpreter to be used to run files of the specified type when starting with
   * IExtensionApi.runExecutable
   * @param {string} extension File extension to handle
   * @param {string} apply A filter function that will receive the run parameters as provided by
   *                       the user (with the script as the executable) and should return adjusted
   *                       parameters that will actually invoke the right interpreter.
   *                       If the interpreter is not installed/found, please throw a
   *                       "MissingInterpreter" exception so Vortex can show a nicer error message
   */
  registerInterpreter: (extension: string, apply: (call: IRunParameters) => IRunParameters) => void;
  /**
   * register a hook to be called before Vortex starts any tool and is allowed to replace parameter
   * or cancel the start by rejecting with ProcessCanceled or UserCanceled.
   * This could be used as a more powerful replacement for registerInterpreter.
   * Interpreters registered with registerInterpreter will be processed before any hooks are applied
   * @param {number} priority Hooks are applied in ascending priority order. Please choose
   *                          priorities with a bit of space between hooks you know about so that
   *                          other extension developers can insert their own hooks between.
   *                          Non-extension hooks will be applied in steps of 100
   * @param {string} id identifier for the hook. This will only be used for logging
   * @param {function} hook the hook to be called
   */
  registerStartHook: (
    priority: number,
    id: string,
    hook: (call: IRunParameters) => PromiseLike<IRunParameters>,
  ) => void;
  /**
   * register a migration step. This migration is always called when the loaded extension has
   * a different version from the one that was used last.
   * This way when the new version requires any form of migration (upgrading state for example)
   * it can be done from there. The version that was previously run is being passed to the migration
   * function so the extension can determine if the upgrade is actually necessary and if so, which
   * (if there are multiple).
   * IMPORTANT: Use the old version only to save time, your migration must not cause break anything
   *   if this version is inaccurate. E.g. if state was manipulated/damaged, Vortex may send 0.0.0
   *   for the old version even when the current version was run before.
   * If the extension was never loaded before, the version "0.0.0" is passed in.
   * Please note: Vortex will continue running, with the extension loaded, after migrate is called,
   *   it is not currently possible to delay loading an extension until the migration is complete.
   *   This means one of these must be true:
   *     - the extension is functional without the migration, at least so much so that it doesn't
   *       cause "damage"
   *     - the extension disables/blocks itself until the migration is done
   *     - the migration is synchronous so that the migrate function doesn't return until it's done.
   * Important: Migration happens in the *main process*, not in the renderer process.
   * @param {function} migrate called if the running extension version differs from the old one.
   *                           As soon as the promise returned from this is resolved, the stored
   *                           version number is updated.
   */
  registerMigration: (migrate: (oldVersion: string) => PromiseBB$1<void>) => void;
  /**
   * register a file to be stored with the profile. It will always be synchronised with the current
   * profile, so when users switch to a different profile, this file will be copied to the
   * profile they're switching away from, then the corresponding file from the profile they're
   * switching to is copied to filePath.
   * filePath can either be a static string or a function returning a promise that resolves
   * to the actual file path. The latter allows for the path to be determined dynamically
   */
  registerProfileFile?: (gameId: string, filePath: string | (() => PromiseLike<string[]>)) => void;
  /**
   * register a profile feature that can be toggled/configured on the profiles screen.
   * The configured value can be queried at
   * state.persistent.profiles.<profile id>.features.<feature id>
   */
  registerProfileFeature?: (
    featureId: string,
    type: string,
    icon: string,
    label: string,
    description: string,
    supported: () => boolean,
  ) => void;
  /**
   * register a game version resolution provider.
   */
  registerGameVersionProvider?: (
    id: string,
    priority: number,
    supported: GameVersionProviderTest,
    getVersion: GameVersionProviderFunc,
    options?: IGameVersionProviderOptions,
  ) => void;
  /**
   * register a handler that can be used to preview or diff files.
   * A handler can return a promise rejected with a "ProcessCanceled" exception to indicate
   * it doesn't support the file type, in which case the next handler is tried.
   * If no handler supports a file type, an error is displayed.
   *
   * Now at the lowest level a preview handler just has to be able to show a single file
   * of the file type, in which case it should show the first file from the list passed in
   * as a parameter, or offer the user a choice. More advanced handlers may show a diff between
   * the files.
   * If the "allowPick" option is specified the caller would like the user to be
   * able to pick one of the files and that choice should then be returned but
   * this is an optional feature the handler doesn't need to support.
   *
   * Handlers that support both diffing files and picking choices should have high
   * priority (0-100), handlers that support diffing but not picking should be
   * put into the range (100-200), handlers that only support showing a single
   * file should be in the range (300-infinite).
   * (Obviously the use case where the handler supports picking files but can only
   * show a single file doesn't exist because duh.)
   * This way the most feature rich handler supporting a file type will get picked.
   *
   * Note: If the viewer supports picking the Promise shall resolve after the
   *   choice is made and include the selected entry, if it doesn't it can resolve
   *   as soon as the handler knows whether it supports the file.
   */
  registerPreview?: (
    priority: number,
    handler: (files: IPreviewFile[], allowPick: boolean) => PromiseBB$1<IPreviewFile>,
  ) => void;
  /**
   * register a callback that will introduce additional variables that can be used as part of
   * tool command lines. The callback you provide here gets called every time a tool gets started
   * from vortex, the returned object gets merged with all other parameter object and then used
   * when resolving the final command line.
   * Please use keys that are all upper case and consist only of latin characters and underscores.
   * While this is not necessary from a technical standpoint it's more consistent and predictable
   * for users.
   * Also make sure the keys you return are sufficiently unique to avoid collisions
   * @param callback the function that gets called to generate variables. the argument
   *                 passed to this contains details about the tool being started, usually
   *                 you will probably not need this
   */
  registerToolVariables: (callback: ToolParameterCB) => void;
  registerLoadOrderPage: (gameEntry: IGameLoadOrderEntry) => void;
  /**
   * Add file based load ordering functionality to the specified game.
   *  Please use this instead of registerLoadOrderPage
   */
  registerLoadOrder: (gameInfo: ILoadOrderGameInfo) => void;
  /**
   * Sets up a stack for a history of events that can be presented to the user
   */
  registerHistoryStack: (id: string, options: IHistoryStack) => void;
  /**
   * Allows extensions to define additional data to add to a collection
   */
  registerGameSpecificCollectionsData: (data: ICollectionsGameSupportEntry) => void;
  /**
   * add a function to the IExtensionApi object that is made available to all other extensions
   * in the api.ext object.
   */
  registerAPI: (name: string, func: (...args: any[]) => any, options: IApiFuncOptions) => void;
  /**
   * specify that a certain range of versions of vortex is required
   * (see https://www.npmjs.com/package/semver for syntax documentation).
   * If you call this multiple times, all ranges have to match so that makes little sense
   */
  requireVersion: (versionRange: string) => void;
  /**
   * register a dependency on a different extension
   * @param {string} extId id of the extension that this one depends on
   * @param {string} version a semver version range that the mod is compatible with
   * @param {boolean} optional if set to true, the extension will not fail if the dependency is not found
   */
  requireExtension: (extId: string, version?: string, optional?: boolean) => void;
  /**
   * called once after the store has been set up and after all extensions have been initialized
   * This means that if your extension registers its own extension function
   * (@see registerExtensionFunction) then those registrations happen before once is called.
   *
   * You shouldn't make assumptions on the order in which extensions are loaded and on them to be
   * loaded synchronously, so if you have initialization code that requires another extension to
   * be initialized first, you should check if that happened already in your "once" call and react
   * to some sort of event that would indicate that other initialization to be finished (usually
   * a state change)
   *
   * @memberOf IExtensionContext
   */
  once: (callback: () => void | PromiseLike<void>) => void;
  /**
   * similar to once but this callback will be run (only) on the electron "main" process.
   * Use this only if you absolutely must (if you don't know what electron main process means, it's
   * almost certain you don't want this).
   * While almost all program logic of Vortex runs in the renderer process, some libraries will not
   * work correctly on that process so you have to run on the main process.
   *
   * @deprecated This is a very niche use case and modern Electron practices are explicitly
   * discouraging running code on the main process. This will be removed in future versions.
   *
   * If you need unrestricted NodeJS environment for your extension - use a separate NodeJS process
   * and communicate with it via IPC.
   *
   * If you need to run code before the renderer process is ready,
   * inform the Vortex team about your use case and we will investigate your requirements or
   * suggest alternatives.
   */
  onceMain: (callback: () => void) => void;
  /**
   * contains various utility functions. It's valid to store this object inside
   * the extension for later use.
   *
   * @type {IExtensionApi}
   * @memberOf IExtensionContext
   */
  api: IExtensionApi;
  /**
   * proxy to make optional register calls (if such calls are invalid in the api the extension
   * will not be unloaded)
   */
  optional: any;
}
//#endregion
//#region lib/types/extensions.d.ts
type ExtensionInit = (context: IExtensionContext) => boolean;
type ExtensionType = "game" | "translation" | "theme";
/**
 * Raw shape of an extension's info.json file.
 */
interface ExtensionInfo {
  id?: string;
  namespace?: string;
  name: string;
  author: string;
  description: string;
  version: string;
  type?: ExtensionType;
  bundled?: boolean;
  path?: string;
  modId?: number;
  fileId?: number;
  issueTrackerURL?: string;
}
/** @deprecated Use ExtensionInfo instead */
type IExtension = ExtensionInfo;
interface IExtensionDownloadInfo {
  name: string;
  modId?: number;
  fileId?: number;
  type?: ExtensionType;
}
/**
 * information about an extension available on the central extension list
 */
interface IAvailableExtension extends IExtensionDownloadInfo {
  description: {
    short: string;
    long: string;
  };
  id?: string;
  type?: ExtensionType;
  language?: string;
  gameName?: string;
  gameId?: string;
  image: string;
  author: string;
  uploader: string;
  version: string;
  downloads: number;
  endorsements: number;
  timestamp: number;
  tags: string[];
  dependencies?: {
    [key: string]: any;
  };
  hide?: boolean;
}
interface IRegisteredExtension {
  name: string;
  namespace: string;
  path: string;
  dynamic: boolean;
  initFunc: () => ExtensionInit;
  info?: IExtension;
}
//#endregion
//#region lib/actions/app.d.ts
declare const setStateVersion: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const setApplicationVersion: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const addExtension: import("redux-act").ComplexActionCreator2<
  string,
  ExtensionInfo,
  {
    extensionId: string;
    info: ExtensionInfo;
  },
  {}
>;
declare const setExtensionEnabled: import("redux-act").ComplexActionCreator2<
  string,
  boolean,
  {
    extensionId: string;
    enabled: boolean;
  },
  {}
>;
declare const setExtensionVersion: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    extensionId: string;
    version: string;
  },
  {}
>;
declare const setExtensionEndorsed: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    extensionId: string;
    endorsed: string;
  },
  {}
>;
declare const removeExtension: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const forgetExtension: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const completeMigration: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const setInstanceId: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const setWarnedAdmin: import("redux-act").ComplexActionCreator1<number, number, {}>;
declare const setInstallType: import("redux-act").ComplexActionCreator1<
  VortexInstallType,
  VortexInstallType,
  {}
>;
//#endregion
//#region lib/actions/notifications.d.ts
/**
 * adds a notification to be displayed. Takes one parameter of type INotification. The id may be
 * left unset, in that case one will be generated
 */
declare const startNotification: import("redux-act").ComplexActionCreator1<
  INotification,
  INotification,
  {}
>;
declare const updateNotification: import("redux-act").ComplexActionCreator3<
  string,
  number,
  string,
  {
    id: string;
    progress: number;
    message: string;
  },
  {
    forward: boolean;
    scope: string;
  }
>;
/**
 * dismiss a notification. Takes the id of the notification
 */
declare const stopNotification: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const stopAllNotifications: import("redux-act").EmptyActionCreator;
/**
 * show a modal dialog to the user
 *
 * don't call this directly, use showDialog
 */
declare const addDialog: import("redux-act").ComplexActionCreator6<
  string,
  DialogType,
  string,
  IDialogContent,
  string,
  string[],
  {
    id: string;
    type: DialogType;
    title: string;
    content: IDialogContent;
    defaultAction: string;
    actions: string[];
  },
  {}
>;
/**
 * dismiss the dialog being displayed
 *
 * don't call this directly especially when you used "showDialog" to create the dialog or
 * you leak (a tiny amount of) memory and the action callbacks aren't called.
 * Use closeDialog instead
 */
declare const dismissDialog: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare function fireNotificationAction(
  notiId: string,
  notiProcess: string,
  action: number,
  dismiss: NotificationDismiss,
): void;
declare function setupNotificationSuppression(cb: (id: string) => boolean): void;
/**
 * show a notification
 *
 * @public
 */
declare function addNotification(
  notification: INotification,
): ThunkAction<Promise<void>, unknown, null, AnyAction>;
declare function dismissNotification(id: string): ThunkAction<void, unknown, null, AnyAction>;
declare function dismissAllNotifications(): ThunkAction<void, unknown, null, AnyAction>;
/**
 * show a dialog
 * @public
 */
declare function showDialog(
  type: DialogType,
  title: string,
  content: IDialogContent,
  actions: DialogActions,
  inId?: string,
): ThunkAction<PromiseBB$1<IDialogResult>, unknown, null, AnyAction>;
declare function closeDialog(
  id: string,
  actionKey?: string,
  input?: unknown,
): ThunkAction<void, unknown, null, AnyAction>;
declare function closeDialogs(
  ids: string[],
  actionKey?: string,
  input?: unknown,
): ThunkAction<void, unknown, null, AnyAction>;
declare function triggerDialogLink(id: string, idx: number): void;
//#endregion
//#region lib/actions/notificationSettings.d.ts
/**
 * set (or unset) notifications to not show again
 */
declare const suppressNotification: import("redux-act").ComplexActionCreator2<
  string,
  boolean,
  {
    id: string;
    suppress: boolean;
  },
  {}
>;
declare const resetSuppression: import("redux-act").ComplexActionCreator1<unknown, any, {}>;
//#endregion
//#region lib/actions/session.d.ts
/**
 * action to choose which item in a group to display (all other items in the
 * group will be hidden). the itemId can be undefined to hide them all.
 */
declare const displayGroup: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    groupId: string;
    itemId: string;
  },
  {}
>;
declare const setDialogVisible: import("redux-act").ComplexActionCreator1<
  string,
  {
    dialogId: string;
  },
  {}
>;
declare const setSettingsPage: import("redux-act").ComplexActionCreator1<
  string,
  {
    pageId: string;
  },
  {}
>;
declare const setOpenMainPage: import("redux-act").ComplexActionCreator2<
  string,
  boolean,
  {
    page: string;
    secondary: boolean;
  },
  {}
>;
declare const startActivity: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    group: string;
    activityId: string;
  },
  {
    forward: boolean;
    scope: string;
  }
>;
declare const stopActivity: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    group: string;
    activityId: string;
  },
  {
    forward: boolean;
    scope: string;
  }
>;
declare const setProgress: import("redux-act").ComplexActionCreator4<
  string,
  string,
  string,
  number,
  {
    group: string;
    progressId: string;
    text: string;
    percent: number;
  },
  {}
>;
declare const setToolRunning: import("redux-act").ComplexActionCreator3<
  string,
  number,
  boolean,
  {
    exePath: string;
    started: number;
    exclusive: boolean;
  },
  {}
>;
declare const setToolPid: import("redux-act").ComplexActionCreator3<
  string,
  number,
  boolean,
  {
    exePath: string;
    pid: number;
    exclusive: boolean;
  },
  {}
>;
declare const setToolStopped: import("redux-act").ComplexActionCreator1<
  string,
  {
    exePath: string;
  },
  {}
>;
declare const setExtensionLoadFailures: import("redux-act").ComplexActionCreator1<
  Record<string, IExtensionLoadFailure[]>,
  Record<string, IExtensionLoadFailure[]>,
  {}
>;
declare const setUIBlocker: import("redux-act").ComplexActionCreator4<
  string,
  string,
  string,
  boolean,
  {
    id: string;
    icon: string;
    description: string;
    mayCancel: boolean;
  },
  {}
>;
declare const clearUIBlocker: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const setNetworkConnected: import("redux-act").ComplexActionCreator1<boolean, boolean, {}>;
declare const setCommandLine: import("redux-act").ComplexActionCreator1<
  IParameters,
  IParameters,
  {}
>;
declare const setDownloadGameFilter: import("redux-act").ComplexActionCreator1<string, string, {}>;
//#endregion
//#region lib/actions/tables.d.ts
declare const setAttributeVisible: import("redux-act").ComplexActionCreator3<
  string,
  string,
  boolean,
  {
    tableId: string;
    attributeId: string;
    visible: boolean;
  },
  {}
>;
declare const setAttributeSort: import("redux-act").ComplexActionCreator3<
  string,
  string,
  SortDirection,
  {
    tableId: string;
    attributeId: string;
    direction: SortDirection;
  },
  {}
>;
declare const setAttributeFilter: import("redux-act").ComplexActionCreator3<
  string,
  string,
  unknown,
  {
    tableId: string;
    attributeId: string;
    filter: unknown;
  },
  {}
>;
declare const setGroupingAttribute: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    tableId: string;
    attributeId: string;
  },
  {}
>;
declare const collapseGroup: import("redux-act").ComplexActionCreator3<
  string,
  string,
  boolean,
  {
    tableId: string;
    groupId: string;
    collapse: boolean;
  },
  {}
>;
declare const setCollapsedGroups: import("redux-act").ComplexActionCreator2<
  string,
  string[],
  {
    tableId: string;
    groups: string[];
  },
  {}
>;
//#endregion
//#region lib/actions/window.d.ts
/**
 * action to set window size in the store.
 */
declare const setWindowSize: import("redux-act").ComplexActionCreator1<
  {
    width: number;
    height: number;
  },
  {
    width: number;
    height: number;
  },
  {}
>;
/**
 * action to set window position in the store.
 */
declare const setWindowPosition: import("redux-act").ComplexActionCreator1<
  {
    x: number;
    y: number;
  },
  {
    x: number;
    y: number;
  },
  {}
>;
/**
 * action to set maximized in the store
 * to avoid confusion: maximize maintains window frame and fills one screen,
 * fullscreen makes the window borderless + fill the screen
 */
declare const setMaximized: import("redux-act").ComplexActionCreator1<boolean, boolean, {}>;
declare const setZoomFactor: import("redux-act").ComplexActionCreator1<number, number, {}>;
declare const setTabsMinimized: import("redux-act").ComplexActionCreator1<boolean, boolean, {}>;
declare const setCustomTitlebar: import("redux-act").ComplexActionCreator1<boolean, boolean, {}>;
declare const setUseModernLayout: import("redux-act").ComplexActionCreator1<boolean, boolean, {}>;
//#endregion
//#region lib/actions/loadOrder.d.ts
/**
 * generic action to store load orders for games. How it is to be interpreted
 * is up to the corresponding game support code.
 * the id will usually be the profile id for which the load order is to be stored, the items
 * in the order could be the ids of mods/plugins - in the order they should be loaded.
 *
 * With most games we don't store the load order this way but instead directly synchronise
 * with the data/configuration file holding the load order.
 * Use this only if that isn't an option (e.g. with "7 days to die" there is no generic way
 * to store the load order, it's only stored in the form of mod names and it would be
 * impractical to redeploy every time the load order is changed)
 */
declare const setLoadOrder: import("redux-act").ComplexActionCreator2<
  string,
  unknown[],
  {
    id: string;
    order: unknown[];
  },
  {}
>;
//#endregion
//#region lib/extensions/browser/actions.d.ts
type ShowUrlFunc = (
  url: string,
  instructions?: string,
  subscriber?: string,
  skippable?: boolean,
) => Action<{
  url: string;
  instructions: string;
  subscriber: string;
  skippable: boolean;
}>;
declare const showURL: ShowUrlFunc;
declare const closeBrowser: import("redux-act").EmptyActionCreator;
//#endregion
//#region lib/extensions/category_management/actions/category.d.ts
declare const loadCategories: import("redux-act").ComplexActionCreator2<
  string,
  ICategoryDictionary,
  {
    gameId: string;
    gameCategories: ICategoryDictionary;
  },
  {}
>;
declare const setCategory: import("redux-act").ComplexActionCreator3<
  string,
  string,
  ICategory,
  {
    gameId: string;
    id: string;
    category: ICategory;
  },
  {}
>;
declare const removeCategory: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    gameId: string;
    id: string;
  },
  {}
>;
declare const setCategoryOrder: import("redux-act").ComplexActionCreator2<
  string,
  string[],
  {
    gameId: string;
    categoryIds: string[];
  },
  {}
>;
declare const updateCategories: import("redux-act").ComplexActionCreator2<
  string,
  ICategoryDictionary,
  {
    gameId: string;
    gameCategories: ICategoryDictionary;
  },
  {}
>;
declare const renameCategory: import("redux-act").ComplexActionCreator3<
  string,
  string,
  string,
  {
    gameId: string;
    categoryId: string;
    name: string;
  },
  {}
>;
//#endregion
//#region lib/extensions/download_management/actions/settings.d.ts
declare const setMaxDownloads: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setDownloadPath: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setShowDLDropzone: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setShowDLGraph: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setCopyOnIFF: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setMaxBandwidth: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setCollectionConcurrency: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
//#endregion
//#region lib/extensions/download_management/actions/state.d.ts
interface IDictionary {
  [key: string]: any;
}
/**
 * initialize a download (it may not be started immediately)
 */
declare const initDownload: import("redux-act").ComplexActionCreator4<
  string,
  string[],
  IDictionary,
  string[],
  {
    id: string;
    urls: string[];
    modInfo: IDictionary;
    games: string[];
  },
  {}
>;
/**
 * set download progress (in percent)
 */
declare const downloadProgress: import("redux-act").ComplexActionCreator4<
  string,
  number,
  number,
  string[],
  {
    id: string;
    received: number;
    total: number;
    urls: string[];
  },
  {}
>;
declare const finalizingProgress: import("redux-act").ComplexActionCreator2<
  string,
  number,
  {
    id: string;
    progress: number;
  },
  {}
>;
/**
 * set/change the file path
 */
declare const setDownloadFilePath: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    id: string;
    filePath: string;
  },
  {}
>;
/**
 * mark the download as pausable or not
 */
declare const setDownloadPausable: import("redux-act").ComplexActionCreator2<
  string,
  boolean,
  {
    id: string;
    pausable: boolean;
  },
  {}
>;
/**
 * mark download as started
 */
declare const startDownload: import("redux-act").ComplexActionCreator1<
  string,
  {
    id: string;
  },
  {}
>;
/**
 * mark download as finalizing, meaning the file has been downloaded fully,
 * during this phase checksums are calculated for example
 */
declare const finalizingDownload: import("redux-act").ComplexActionCreator1<
  string,
  {
    id: string;
  },
  {}
>;
/**
 * mark download as finished
 */
declare const finishDownload: import("redux-act").ComplexActionCreator3<
  string,
  "finished" | "failed" | "redirect",
  any,
  {
    id: string;
    state: "finished" | "failed" | "redirect";
    failCause: any;
  },
  {}
>;
declare const setDownloadHash: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    id: string;
    fileMD5: string;
  },
  {}
>;
declare const setDownloadHashByFile: import("redux-act").ComplexActionCreator3<
  string,
  string,
  number,
  {
    fileName: string;
    fileMD5: string;
    fileSize: number;
  },
  {}
>;
/**
 * mark download paused
 */
declare const pauseDownload: import("redux-act").ComplexActionCreator2<
  string,
  boolean,
  {
    id: string;
    paused: boolean;
  },
  {}
>;
declare const setDownloadInterrupted: import("redux-act").ComplexActionCreator2<
  string,
  number,
  {
    id: string;
    realReceived: number;
  },
  {}
>;
/**
 * remove a download (and associated file if any)
 */
declare const removeDownload: import("redux-act").ComplexActionCreator1<
  string,
  {
    id: string;
  },
  {}
>;
declare const removeDownloadSilent: import("redux-act").ComplexActionCreator1<
  string,
  {
    id: string;
  },
  {}
>;
/**
 * sets the current download speed in bytes/second
 */
declare const setDownloadSpeed: import("redux-act").ComplexActionCreator1<
  unknown,
  unknown,
  {
    forward: boolean;
    scope: string;
  }
>;
declare const setDownloadSpeeds: import("redux-act").ComplexActionCreator1<unknown, unknown, {}>;
/**
 * add a file that has been found on disk but where we weren't involved
 * in the download.
 */
declare const addLocalDownload: import("redux-act").ComplexActionCreator4<
  string,
  string,
  string,
  number,
  {
    id: string;
    game: string;
    localPath: string;
    fileSize: number;
  },
  {}
>;
declare const mergeDownloadModInfo: import("redux-act").ComplexActionCreator2<
  string,
  any,
  {
    id: string;
    value: any;
  },
  {}
>;
declare const setDownloadModInfo: import("redux-act").ComplexActionCreator3<
  string,
  string,
  any,
  {
    id: string;
    key: string;
    value: any;
  },
  {}
>;
declare const setDownloadInstalled: import("redux-act").ComplexActionCreator3<
  string,
  string,
  string,
  {
    id: string;
    gameId: string;
    modId: string;
  },
  {}
>;
declare const setDownloadTime: import("redux-act").ComplexActionCreator2<
  string,
  number,
  {
    id: string;
    time: number;
  },
  {}
>;
declare const setCompatibleGames: import("redux-act").ComplexActionCreator2<
  string,
  string[],
  {
    id: string;
    games: string[];
  },
  {}
>;
//#endregion
//#region lib/extensions/installer_fomod_shared/actions/installerUI.d.ts
declare const startDialog: import("redux-act").ComplexActionCreator2<
  IInstallerInfoState,
  string,
  {
    info: IInstallerInfoState;
    instanceId: string;
  },
  {}
>;
declare const endDialog: import("redux-act").ComplexActionCreator1<
  string,
  {
    instanceId: string;
  },
  {}
>;
declare const clearDialog: import("redux-act").ComplexActionCreator1<
  string,
  {
    instanceId: string;
  },
  {}
>;
declare const setDialogState: import("redux-act").ComplexActionCreator2<
  IInstallerState,
  string,
  {
    dialogState: IInstallerState;
    instanceId: string;
  },
  {}
>;
//#endregion
//#region lib/extensions/mod_load_order/actions/loadOrder.d.ts
declare const setLoadOrderEntry: any;
//#endregion
//#region lib/extensions/file_based_loadorder/actions/loadOrder.d.ts
declare const setFBLoadOrderEntry: any;
declare const setFBLoadOrder: any;
//#endregion
//#region lib/extensions/mod_management/actions/settings.d.ts
/**
 * change the mod install path. Supports placeholders
 */
declare const setInstallPath: reduxAct.ComplexActionCreator2<
  string,
  string,
  {
    gameId: string;
    path: string;
  },
  {}
>;
declare const setInstallPathMode: reduxAct.ComplexActionCreator1<
  InstallPathMode,
  InstallPathMode,
  {}
>;
declare const setSuggestInstallPathDirectory: reduxAct.ComplexActionCreator1<string, string, {}>;
/**
 * sets the activator to use for this game
 */
declare const setActivator: reduxAct.ComplexActionCreator2<
  string,
  string,
  {
    gameId: string;
    activatorId: string;
  },
  {}
>;
declare const setShowModDropzone: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setConfirmPurge: reduxAct.ComplexActionCreator1<boolean, boolean, {}>;
declare const setCleanupOnDeploy: reduxAct.ComplexActionCreator1<boolean, boolean, {}>;
//#endregion
//#region lib/extensions/mod_management/actions/deployment.d.ts
declare const setDeploymentNecessary: reduxAct.ComplexActionCreator2<
  string,
  boolean,
  {
    gameId: string;
    required: boolean;
  },
  {}
>;
//#endregion
//#region lib/extensions/mod_management/actions/mods.d.ts
declare const addMod: reduxAct.ComplexActionCreator2<
  string,
  IMod,
  {
    gameId: string;
    mod: IMod;
  },
  {}
>;
declare const addMods: reduxAct.ComplexActionCreator2<
  string,
  IMod[],
  {
    gameId: string;
    mods: IMod[];
  },
  {}
>;
declare const removeMod: reduxAct.ComplexActionCreator2<
  string,
  string,
  {
    gameId: string;
    modId: string;
  },
  {}
>;
declare const setModArchiveId: reduxAct.ComplexActionCreator3<
  string,
  string,
  string,
  {
    gameId: string;
    modId: string;
    archiveId: string;
  },
  {}
>;
/**
 * sets the state of a mod (whether it's downloaded, installed, ...)
 */
declare const setModState: reduxAct.ComplexActionCreator3<
  string,
  string,
  ModState,
  {
    gameId: string;
    modId: string;
    modState: ModState;
  },
  {}
>;
/**
 * sets the (final) installation path of the mod. This should be set as soon as
 * any data is written to disk so that it can be cleaned/removed in case of an error.
 * The actual path on disk may be a variation of this path during installation.
 */
declare const setModInstallationPath: reduxAct.ComplexActionCreator3<
  string,
  string,
  string,
  {
    gameId: string;
    modId: string;
    installPath: string;
  },
  {}
>;
/**
 * sets the value of an attribute on a mod
 */
declare const setModAttribute: reduxAct.ComplexActionCreator4<
  string,
  string,
  string,
  any,
  {
    gameId: string;
    modId: string;
    attribute: string;
    value: any;
  },
  {}
>;
/**
 * set multiple mod attributes at once
 */
declare const setModAttributes: reduxAct.ComplexActionCreator3<
  string,
  string,
  {
    [attribute: string]: any;
  },
  {
    gameId: string;
    modId: string;
    attributes: {
      [attribute: string]: any;
    };
  },
  {}
>;
/**
 * sets the type of a mod
 */
declare const setModType: reduxAct.ComplexActionCreator3<
  string,
  string,
  string,
  {
    gameId: string;
    modId: string;
    type: string;
  },
  {}
>;
declare const clearModRules: reduxAct.ComplexActionCreator2<
  string,
  string,
  {
    gameId: string;
    modId: string;
  },
  {}
>;
/**
 * add a dependency rule for this mod
 */
declare const addModRule: reduxAct.ComplexActionCreator3<
  string,
  string,
  IModRule,
  {
    gameId: string;
    modId: string;
    rule: IModRule;
  },
  {}
>;
/**
 * remove a dependency rule from this mod
 */
declare const removeModRule: reduxAct.ComplexActionCreator3<
  string,
  string,
  IModRule,
  {
    gameId: string;
    modId: string;
    rule: IModRule;
  },
  {}
>;
/**
 * store the mod id for a resolved rule, so we can resolve it quicker and more
 * reliably in the future
 */
declare const cacheModReference: reduxAct.ComplexActionCreator4<
  string,
  string,
  IModReference,
  string,
  {
    gameId: string;
    modId: string;
    reference: IModReference;
    refModId: string;
  },
  {}
>;
declare const setINITweakEnabled: reduxAct.ComplexActionCreator4<
  string,
  string,
  string,
  boolean,
  {
    gameId: string;
    modId: string;
    tweak: string;
    enabled: boolean;
  },
  {}
>;
/**
 * set list of files that will always be provided by this mod, no matter the deployment order
 */
declare const setFileOverride: reduxAct.ComplexActionCreator3<
  string,
  string,
  string[],
  {
    gameId: string;
    modId: string;
    files: string[];
  },
  {}
>;
//#endregion
//#region lib/extensions/mod_management/actions/transactions.d.ts
/**
 * Durable "this profile still needs its plugins sorted/enabled" marker, keyed by the profile a
 * collection was installed against (load order and plugin-enable state are per-profile). Set when a
 * collection install begins and cleared only once a plugin sort actually succeeds, so an install
 * interrupted by a crash/quit is recovered on the next activation of the profile (deploy then sort).
 * Lives in the cross-extension transactions slice because it is written by the collections install
 * flow but read/cleared by gamebryo plugin management. The value is the epoch-ms time it was queued.
 */
declare const setPendingPluginSort: import("redux-act").ComplexActionCreator3<
  string,
  string,
  number,
  {
    profileId: string;
    collectionId: string;
    time: number;
  },
  {}
>;
/**
 * Clears every pending plugin-sort marker for a profile; a single successful sort orders all of the
 * profile's plugins, so it satisfies all collections queued for that profile at once.
 */
declare const clearPendingPluginSort: import("redux-act").ComplexActionCreator1<
  string,
  {
    profileId: string;
  },
  {}
>;
//#endregion
//#region lib/extensions/nexus_integration/actions/account.d.ts
declare const setUserAPIKey: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const clearOAuthCredentials: reduxAct.ComplexActionCreator1<unknown, any, {}>;
declare const setOAuthCredentials: reduxAct.ComplexActionCreator3<
  string,
  string,
  string,
  {
    token: string;
    refreshToken: string;
    fingerprint: string;
  },
  {}
>;
declare const setForcedLogout: reduxAct.ComplexActionCreator1<boolean, boolean, {}>;
//#endregion
//#region lib/extensions/nexus_integration/actions/settings.d.ts
declare const setAssociatedWithNXMURLs: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
//#endregion
//#region lib/extensions/nexus_integration/actions/persistent.d.ts
/**
 * action to set the user info nexus associates with an api key
 */
declare const setUserInfo: import("redux-act").ComplexActionCreator1<any, any, {}>;
/**
 * remember current version available on nexus
 */
declare const setNewestVersion: import("redux-act").ComplexActionCreator1<any, any, {}>;
//#endregion
//#region lib/extensions/gamemode_management/actions/settings.d.ts
/**
 * add info about a discovered game
 */
declare const addDiscoveredGame: import("redux-act").ComplexActionCreator2<
  string,
  IDiscoveryResult,
  {
    id: string;
    result: IDiscoveryResult;
  },
  {}
>;
declare const clearDiscoveredGame: import("redux-act").ComplexActionCreator1<
  string,
  {
    id: string;
  },
  {}
>;
/**
 * override the path of a game that's already been discovered
 */
declare const setGamePath: import("redux-act").ComplexActionCreator4<
  string,
  string,
  string,
  string,
  {
    gameId: string;
    gamePath: string;
    store: string;
    exePath: string;
  },
  {}
>;
/**
 * add info about a discovered tool
 */
declare const addDiscoveredTool: import("redux-act").ComplexActionCreator4<
  string,
  string,
  IDiscoveredTool,
  boolean,
  {
    gameId: string;
    toolId: string;
    result: IDiscoveredTool;
    manual: boolean;
  },
  {}
>;
/**
 * set visibility of a tool. Tools that have been added by the user will be removed entirely whereas
 * discovered tools (those where we have code to discover them) are merely hidden
 */
declare const setToolVisible: import("redux-act").ComplexActionCreator3<
  string,
  string,
  boolean,
  {
    gameId: string;
    toolId: string;
    visible: boolean;
  },
  {}
>;
/**
 * change parameters for a game (i.e. call arguments, environment, ...)
 */
declare const setGameParameters: import("redux-act").ComplexActionCreator2<
  string,
  any,
  {
    gameId: string;
    parameters: any;
  },
  {}
>;
/**
 * hide or unhide a game
 */
declare const setGameHidden: import("redux-act").ComplexActionCreator2<
  string,
  boolean,
  {
    gameId: string;
    hidden: boolean;
  },
  {}
>;
declare const setGameSearchPaths: import("redux-act").ComplexActionCreator1<string[], string[], {}>;
declare const setPickerLayout: import("redux-act").ComplexActionCreator1<
  "small" | "list" | "large",
  {
    layout: "small" | "list" | "large";
  },
  {}
>;
declare const setSortManaged: import("redux-act").ComplexActionCreator1<string, string, {}>;
declare const setSortUnmanaged: import("redux-act").ComplexActionCreator1<string, string, {}>;
//#endregion
//#region lib/extensions/profile_management/actions/settings.d.ts
/**
 * sets a profile to be activated
 */
declare const setNextProfile: reduxAct.ComplexActionCreator1<
  string,
  {
    profileId: string;
  },
  {}
>;
//#endregion
//#region lib/extensions/settings_interface/actions/automation.d.ts
declare const setAutoDeployment: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setAutoInstall: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setAutoEnable: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setAutoStart: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
declare const setStartMinimized: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
//#endregion
//#region lib/extensions/settings_interface/actions/interface.d.ts
/**
 * change the user interface language
 */
declare const setLanguage: reduxAct.ComplexActionCreator1<string, string, {}>;
/**
 * enable or disable advanced mode
 */
declare const setAdvancedMode: reduxAct.ComplexActionCreator1<
  boolean,
  {
    advanced: boolean;
  },
  {}
>;
declare const setProfilesVisible: reduxAct.ComplexActionCreator1<
  boolean,
  {
    visible: boolean;
  },
  {}
>;
declare const setDesktopNotifications: reduxAct.ComplexActionCreator1<boolean, boolean, {}>;
declare const setHideTopLevelCategory: reduxAct.ComplexActionCreator1<
  boolean,
  {
    hide: boolean;
  },
  {}
>;
declare const showUsageInstruction: reduxAct.ComplexActionCreator2<
  string,
  boolean,
  {
    usageId: string;
    show: boolean;
  },
  {}
>;
declare const setRelativeTimes: reduxAct.ComplexActionCreator1<boolean, boolean, {}>;
declare const setForegroundDL: reduxAct.ComplexActionCreator1<boolean, boolean, {}>;
//#endregion
//#region lib/extensions/updater/actions.d.ts
/**
 * changes the 'channel' from which to receive Vortex updates
 * currently either 'beta', 'stable' or 'none'
 */
declare const setUpdateChannel: reduxAct.ComplexActionCreator1<unknown, unknown, {}>;
//#endregion
//#region lib/extensions/starter_dashlet/actions.d.ts
declare const setPrimaryTool: import("redux-act").ComplexActionCreator2<
  string,
  string,
  {
    gameId: string;
    toolId: string;
  },
  {}
>;
declare const setToolOrder: import("redux-act").ComplexActionCreator2<
  string,
  string[],
  {
    gameId: string;
    tools: string[];
  },
  {}
>;
declare const setToolValid: import("redux-act").ComplexActionCreator3<
  string,
  string,
  boolean,
  {
    gameId: string;
    toolId: string;
    valid: boolean;
  },
  {}
>;
declare const setToolPinned: import("redux-act").ComplexActionCreator3<
  string,
  string,
  boolean,
  {
    gameId: string;
    toolId: string;
    pinned: boolean;
  },
  {}
>;
declare namespace index_d_exports {
  export {
    Condition,
    ConditionResults,
    DialogActions,
    DialogContentItem,
    DialogType,
    ICheckbox,
    IConditionResult,
    IControlBase,
    IDialog,
    IDialogAction,
    IDialogContent,
    IDialogResult,
    IDictionary,
    IEnableOptions,
    IInput,
    ILink,
    addDialog,
    addDiscoveredGame,
    addDiscoveredTool,
    addExtension,
    addLocalDownload,
    addMod,
    addModRule,
    addMods,
    addNotification,
    cacheModReference,
    clearDialog,
    clearDiscoveredGame,
    clearModRules,
    clearOAuthCredentials,
    clearPendingPluginSort,
    clearUIBlocker,
    closeBrowser,
    closeDialog,
    closeDialogs,
    collapseGroup,
    completeMigration,
    dismissAllNotifications,
    dismissDialog,
    dismissNotification,
    displayGroup,
    downloadProgress,
    endDialog,
    finalizingDownload,
    finalizingProgress,
    finishDownload,
    fireNotificationAction,
    forgetExtension,
    forgetMod,
    initDownload,
    loadCategories,
    mergeDownloadModInfo,
    pauseDownload,
    removeCategory,
    removeDownload,
    removeDownloadSilent,
    removeExtension,
    removeMod,
    removeModRule,
    removeProfile,
    renameCategory,
    resetSuppression,
    setActivator,
    setAdvancedMode,
    setApplicationVersion,
    setAssociatedWithNXMURLs,
    setAttributeFilter,
    setAttributeSort,
    setAttributeVisible,
    setAutoDeployment,
    setAutoEnable,
    setAutoInstall,
    setAutoStart,
    setCategory,
    setCategoryOrder,
    setCleanupOnDeploy,
    setCollapsedGroups,
    setCollectionConcurrency,
    setCommandLine,
    setCompatibleGames,
    setConfirmPurge,
    setCopyOnIFF,
    setCustomTitlebar,
    setDeploymentNecessary,
    setDesktopNotifications,
    setDialogState,
    setDialogVisible,
    setDownloadFilePath,
    setDownloadGameFilter,
    setDownloadHash,
    setDownloadHashByFile,
    setDownloadInstalled,
    setDownloadInterrupted,
    setDownloadModInfo,
    setDownloadPath,
    setDownloadPausable,
    setDownloadSpeed,
    setDownloadSpeeds,
    setDownloadTime,
    setExtensionEnabled,
    setExtensionEndorsed,
    setExtensionLoadFailures,
    setExtensionVersion,
    setFBLoadOrder,
    setFBLoadOrderEntry,
    setFeature,
    setFileOverride,
    setForcedLogout,
    setForegroundDL,
    setGameHidden,
    setGameParameters,
    setGamePath,
    setGameSearchPaths,
    setGroupingAttribute,
    setHideTopLevelCategory,
    setINITweakEnabled,
    setInstallPath,
    setInstallPathMode,
    setInstallType,
    setInstanceId,
    setLanguage,
    setLoadOrder,
    setLoadOrderEntry,
    setMaxBandwidth,
    setMaxDownloads,
    setMaximized,
    setModArchiveId,
    setModAttribute,
    setModAttributes,
    setModEnabled,
    setModInstallationPath,
    setModState,
    setModType,
    setModsEnabled,
    setNetworkConnected,
    setNewestVersion,
    setNextProfile,
    setOAuthCredentials,
    setOpenMainPage,
    setPendingPluginSort,
    setPickerLayout,
    setPrimaryTool,
    setProfile,
    setProfileActivated,
    setProfilesVisible,
    setProgress,
    setRelativeTimes,
    setSettingsPage,
    setShowDLDropzone,
    setShowDLGraph,
    setShowModDropzone,
    setSortManaged,
    setSortUnmanaged,
    setStartMinimized,
    setStateVersion,
    setSuggestInstallPathDirectory,
    setTabsMinimized,
    setToolOrder,
    setToolPid,
    setToolPinned,
    setToolRunning,
    setToolStopped,
    setToolValid,
    setToolVisible,
    setUIBlocker,
    setUpdateChannel,
    setUseModernLayout,
    setUserAPIKey,
    setUserInfo,
    setWarnedAdmin,
    setWindowPosition,
    setWindowSize,
    setZoomFactor,
    setupNotificationSuppression,
    showDialog,
    showURL,
    showUsageInstruction,
    startActivity,
    startDialog,
    startDownload,
    startNotification,
    stopActivity,
    stopAllNotifications,
    stopNotification,
    suppressNotification,
    triggerDialogLink,
    updateCategories,
    updateNotification,
    willRemoveProfile,
  };
}
//#endregion
//#region ../shared/dist/index.d.ts
//#endregion
//#region src/Debouncer.d.ts
type Callback = (err: Error | null) => void;
type SetTimeoutFunc<Timeout> = (callback: () => void, delay: number) => Timeout;
type ClearTimeoutFunc<Timeout> = (timeout: Timeout) => void;
/**
 * management function. Prevents a function from being called too often
 * and, for function returning a promise, it ensures that it's not run
 * again (through this Debouncer) before the promise is resolved.
 */
declare class GenericDebouncer<
  Timeout,
  SetTimeout extends SetTimeoutFunc<Timeout>,
  ClearTimeout extends ClearTimeoutFunc<Timeout>,
  Args extends unknown[] = unknown[],
> {
  #private;
  private mDebounceMS;
  private mFunc;
  private mTimer;
  private mCallbacks;
  private mAddCallbacks;
  private mRunning;
  private mReschedule;
  private mArgs?;
  private mResetting;
  private mTriggerImmediately;
  private mRetrigger;
  /**
   * constructor
   * @param func the function to call when the timer expired
   * @param debounceMS the (minimum) time between two calls
   * @param reset if true (the default) the time is reset with every
   *              time schedule gets called. This means if the debouncer
   *              is triggered regularly in less than debounceMS it never
   *              gets run.
   * @param triggerImmediately if true, the debouncer will trigger immediately
   *                           when first called and then not be called again
   *                           until the timer expires. Otherwise (the default)
   *                           the initial call is delay.
   */
  constructor(
    setTimeoutFunc: SetTimeout,
    clearTimeoutFunc: ClearTimeout,
    func: (...args: Args) => Error | PromiseLike<void>,
    debounceMS: number,
    reset?: boolean,
    triggerImmediately?: boolean,
  );
  /**
   * schedule the function and invoke the callback once that is done
   * @param callback the callback to invoke upon completion
   * @param args the arguments to pass to the function. When the timer expires
   *             and the function actually gets invoked, only the last set of
   *             parameters will be used
   */
  schedule(callback?: Callback, ...args: Args): void;
  /**
   * run the function immediately without waiting for the timer
   * to run out. (It does cancel the timer though and invokes all
   * scheduled callbacks)
   *
   * @param {(err: Error) => void} callback
   * @param {...any[]} args
   *
   * @memberof Debouncer
   */
  runNow(callback: Callback, ...args: Args): void;
  /**
   * wait for the completion of the current timer without scheduling it.
   * if the function is not scheduled currently the callback will be
   * called (as a success) immediately.
   * This does not reset the timer
   *
   * @param {(err: Error) => void} callback
   * @param {boolean} immediately if set (default is false) the function gets called
   *                              immediately instead of awaiting the timer
   *
   * @memberof Debouncer
   */
  wait(callback: (err: Error | null) => void, immediately?: boolean): void;
  clear(): void;
  private run;
  private reschedule;
  private invokeCallbacks;
  private startTimer;
}
//#endregion
//#region lib/logging.d.ts
declare function log(level: Level, message: string, metadata?: unknown): void;
//#endregion
//#region lib/util/message.d.ts
/**
 * calculate a reasonable time to display a message based on the
 * amount of text.
 * This is quite crude because the reading speed differs between languages.
 * Japanese and Chinese for example where a single symbol has much more meaning
 * than a latin character the reading speed per symbol will be lower.
 *
 * @export
 * @param {number} messageLength
 * @returns
 */
declare function calcDuration(messageLength: number): number;
/**
 * show a notification that some operation succeeded. This message has a timer based on
 * the message length
 *
 * @export
 * @template S
 * @param {Redux.Dispatch<S>} dispatch
 * @param {string} message
 * @param {string} [id]
 */
declare function showSuccess<S>(
  dispatch: ThunkDispatch<IState, null, Redux.Action>,
  message: string,
  id?: string,
): void;
/**
 * show activity notification
 */
declare function showActivity<S>(
  dispatch: ThunkDispatch<IState, null, Redux.Action>,
  message: string,
  id?: string,
): void;
/**
 * show an info notification. Please don't use this for important stuff as the message
 * has a timer based on message length
 *
 * @export
 * @template S
 * @param {Redux.Dispatch<S>} dispatch
 * @param {string} message
 * @param {string} [id]
 */
declare function showInfo<S>(
  dispatch: ThunkDispatch<IState, null, Redux.Action>,
  message: string,
  id?: string,
): void;
/**
 * show an error notification with an optional "more" button that displays further details
 * in a modal dialog.
 *
 * @export
 * @param {Redux.Dispatch<S>} dispatch
 * @param {string} title
 * @param {any} [details] further details about the error (stack and such). The api says we only
 *                        want string or Errors but since some node apis return non-Error objects
 *                        where Errors are expected we have to be a bit more flexible here.
 */
declare function showError(
  dispatch: ThunkDispatch<IState, null, Redux.Action>,
  title: string,
  details?: string | Error | any,
  options?: IErrorOptions,
): void;
interface IPrettifiedError extends Error {
  code?: string;
  replace?: Record<string, string>;
  allowReport?: boolean;
}
declare function prettifyNodeErrorMessage(
  err: any,
  options?: IErrorOptions,
  fileName?: string,
): IPrettifiedError;
interface IErrorRendered {
  message?: string;
  text?: string;
  parameters?: any;
  allowReport?: boolean;
  wrap: boolean;
  translated?: boolean;
}
/**
 * render error message for display to the user
 * @param err
 */
declare function renderError(err: string | Error | any, options?: IErrorOptions): IErrorRendered;
//#endregion
//#region lib/controls/Icon.d.ts
declare global {
  interface Window {
    __iconSetPromises?: Map<string, Promise<Set<string>>>;
  }
}
interface IIconProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  set?: string;
  name: string;
  spin?: boolean;
  pulse?: boolean;
  stroke?: boolean;
  hollow?: boolean;
  border?: boolean;
  flip?: "horizontal" | "vertical";
  rotate?: number;
  svgStyle?: string;
  onContextMenu?: MouseEventHandler<SVGSVGElement>;
}
/**
 * Install a custom icon set from a given path (for extensions).
 */
declare const installIconSet: (set: string, setPath: string) => Promise<Set<string>>;
declare const Icon: FC<React$1.PropsWithChildren<IIconProps>>;
//#endregion
//#region lib/extensions/category_management/util/retrieveCategoryPath.d.ts
/**
 * retrieve the Category from the Store returning the full category path.
 *
 * @param {number} category
 * @param {Redux.Store<any>} store
 */
declare function resolveCategoryPath(category: string | number, state: IState): string;
/**
 * retrieve the Category from the Store
 *
 * @param {number} category
 * @param {Redux.Store<any>} store
 */
declare function resolveCategoryName(category: string | number, state: IState): string;
//#endregion
//#region lib/extensions/extension_manager/util.d.ts
declare function readExtensibleDir(
  extType: ExtensionType,
  bundledPath: string,
  customPath: string,
): PromiseBB$1<any[]>;
//#endregion
//#region lib/extensions/gamemode_management/util/getDriveList.d.ts
declare function getDriveList(api: IExtensionApi): Promise<string[]>;
//#endregion
//#region lib/extensions/gamemode_management/util/getGame.d.ts
declare function getGames(): IGame[];
declare function getGame(gameId: string): IGame;
//#endregion
//#region lib/extensions/gamemode_management/util/modTypeExtensions.d.ts
/**
 * get information about a mod type
 * will return undefined if the id does not refer to a known mod type.
 * Also the default modType (empty string) for a game has no info structure like this
 * and will thus also return undefined
 * @param id mod type id
 * @returns details about the mod type, if available, undefined otherwise
 */
declare function getModType(id: string): IModType;
//#endregion
//#region lib/extensions/mod_management/modIdManager.d.ts
declare function deriveModInstallName(archiveName: string, info: any): string;
//#endregion
//#region lib/extensions/mod_management/util/activationStore.d.ts
/**
 * return a manifest (detailing which files are currently deployed by Vortex)
 * Please note that the manifest is intended only as kind of a fallback, core functionality
 * of Vortex is designed to work cleanly even if the manifest is deleted by the user and
 * the same should be true for any extension using this function: Work on the assumption
 * that the manifest may be missing or outdated.
 * @remarks
 * This call is expensive as it attempts to read the manifest every time. Store the
 * result or call infrequently to minimise allocations and/or lag.
 * @param api api
 * @param modType the mod type for which to retrieve the manifest, default mod type if undefined
 * @param gameId the game for which to retrieve the manifest, defaults to the current game.
 */
declare function getManifest(
  api: IExtensionApi,
  modType?: string,
  gameId?: string,
): Promise<IDeploymentManifest>;
//#endregion
//#region lib/extensions/mod_management/util/coerceToSemver.d.ts
declare function coerceToSemver(version: string): string;
//#endregion
//#region lib/extensions/mod_management/util/dependencies.d.ts
declare function lookupFromDownload(download: IDownload): IModLookupInfo;
declare function findDownloadByRef(
  reference: IReference,
  downloads: {
    [dlId: string]: IDownload;
  },
): string;
//#endregion
//#region lib/extensions/mod_management/util/deploymentMethods.d.ts
declare function getCurrentActivator(
  state: IState,
  gameId: string,
  allowDefault: boolean,
): IDeploymentMethod;
declare function getActivator(activatorId: string): IDeploymentMethod;
//#endregion
//#region lib/extensions/mod_management/util/findModByRef.d.ts
declare function findModByRef(
  reference: IModReference,
  mods: {
    [modId: string]: IMod;
  },
  source?: {
    gameId: string;
    modId: string;
  },
  installSpec?: IModInstallSpec,
): IMod;
//#endregion
//#region lib/extensions/mod_management/util/isFuzzyVersion.d.ts
declare function isFuzzyVersion(input: string): boolean;
//#endregion
//#region lib/extensions/mod_management/util/modName.d.ts
interface INameOptions {
  version?: boolean;
  variant?: boolean;
}
/**
 * determins the mod name to show to the user based on the mod attributes.
 * absolutely never use this function for anything other than showing the output
 * to the user, the output must not be stored or used as an identifier for the mod,
 * I reserve the right to change the algorithm at any time.
 * @param {IMod} mod
 * @param {INameOptions} [options]
 * @returns {string}
 */
declare function modName(
  mod: Pick<IMod, "attributes" | "installationPath">,
  options?: INameOptions,
): string;
interface IRenderOptions {
  version?: boolean;
}
declare function renderModReference(
  ref?: IModReference,
  mod?: Pick<IMod, "attributes" | "installationPath">,
  options?: IRenderOptions,
): string;
//#endregion
//#region lib/extensions/mod_management/util/modReference.d.ts
declare function makeModReference(mod: IMod): IReference$2;
//#endregion
//#region lib/extensions/mod_management/types/IModSource.d.ts
interface IModSource {
  id: string;
  name: string;
  onBrowse?: () => void;
  options?: IModSourceOptions;
}
//#endregion
//#region lib/extensions/mod_management/util/modSource.d.ts
declare function getModSources(): IModSource[];
declare function getModSource(id: string): IModSource;
//#endregion
//#region lib/extensions/mod_management/util/removeMods.d.ts
declare function removeMods(api: IExtensionApi, gameId: string, modIds: string[]): Promise<void>;
//#endregion
//#region lib/extensions/mod_management/util/rulePhase.d.ts
/**
 * The install-ordering phase a rule belongs to. Optional (recommends) members always map to the
 * dedicated OPTIONAL_PHASE regardless of their authored phase, so they run last as a group. For
 * required rules, `phase` is a first-class IModRule field, but older rules stored it under
 * `extra.phase`; this is the single place that bridges the two locations (mirroring ruleInstallSpec
 * for patches), so callers never have to know about the legacy location. Defaults to phase 0.
 */
declare function rulePhase(rule: IModRule | undefined): number;
//#endregion
//#region lib/extensions/mod_management/util/sort.d.ts
declare function sortMods(gameId: string, mods: IMod[], api: IExtensionApi): Promise<IMod[]>;
//#endregion
//#region lib/extensions/nexus_integration/util/convertGameId.d.ts
/**
 * get the nexus page id for a game
 * TODO: some games have hard-coded transformations here, should move all of that to game.details
 */
declare function nexusGameId(game: IGameStored | IGame, fallbackGameId?: string): string;
/**
 * get our internal game id for a nexus page id
 */
declare function convertGameIdReverse(knownGames: IGameStored[], input: string): string;
//#endregion
//#region lib/util/application.d.ts
interface IApplication {
  name: string;
  version: string;
  isFocused: boolean;
  window: Electron.BrowserWindow | null;
  memory: {
    total: number;
  };
  platform: string;
  platformVersion: string;
  quit: (exitCode?: number) => void;
}
declare function getApplication(): IApplication;
//#endregion
//#region lib/util/calculateFolderSize.d.ts
declare function calculateFolderSize(dirPath: string): Promise<number>;
//#endregion
//#region lib/util/checksum.d.ts
declare function checksum(input: Buffer): string;
declare function fileMD5(
  input: string | Buffer,
  progress?: (bytesProcessed: number, totalBytes: number) => void,
): Promise<string>;
//#endregion
//#region lib/util/collectionInstallSession.d.ts
declare function generateCollectionSessionId(collectionId: string, profileId: string): string;
declare function modRuleId(input: IModRule): string;
//#endregion
//#region lib/util/ConcurrencyLimiter.d.ts
/**
 * helper class to limit concurrency with asynchronous functions.
 */
declare class ConcurrencyLimiter {
  private mInitialLimit;
  private mLimit;
  private mNext;
  private mEndOfQueue;
  private mRepeatTest;
  /**
   * Constructor
   * @param limit number of operations enqueued with do() that will happen concurrently
   * @param repeatTest if set, this function is called when an error happens and it can
   *                   decide if the operation should be retried.
   *                   This is purely a convenience feature but usually if you want to limit
   *                   concurrency it's because you're worried that some resource will run out
   *                   and it's not usually possible to know in advance how many operations
   *                   exactly can happen in parallel so you will usually still want to
   *                   handle errors that indicate the resource running out separately
   */
  constructor(limit: number, repeatTest?: (err: Error) => boolean);
  clearQueue(): void;
  do<T>(cb: () => PromiseLike<T>): Promise<T>;
  private doImpl;
  private process;
  private enqueue;
}
//#endregion
//#region lib/util/copyRecursive.d.ts
/**
 * custom implementation of recursive directory copying.
 * copy from fs-extra does this already, but that function has no limit on the number
 * of files it will copy at once making it fairly inefficient, especially on spinning
 * disks and unpredictable in regards to memory usage.
 *
 * TODO: This implementation could do with more real world testing and optimization
 *   (maybe even adapting to whether copying many small files or few large ones and
 *    the disk type and different OSes)
 *
 * @param {string} source source path to copy from
 * @param {string} destination destination path to copy to
 */
declare function copyRecursive(source: string, destination: string): PromiseBB$1<void>;
//#endregion
//#region lib/util/Debouncer.d.ts
declare class Debouncer<Args extends unknown[] = unknown[]> extends GenericDebouncer<
  number,
  typeof window.setTimeout,
  typeof window.clearTimeout,
  Args
> {
  constructor(
    func: (...args: Args) => Error | PromiseLike<void>,
    debounceMS: number,
    reset?: boolean,
    triggerImmediately?: boolean,
  );
}
//#endregion
//#region lib/util/EpicGamesLauncher.d.ts
declare const instance$1: IGameStore | undefined;
//#endregion
//#region lib/util/errorHandling.d.ts
declare function getVisibleWindow(win?: BrowserWindow | null): BrowserWindow | null;
/**
 * display an error message and quit the application
 * on confirmation.
 * Use this whenever the application state is unknown and thus
 * continuing could lead to data loss
 *
 * @export
 * @param {ITermination} error
 */
declare function terminate(
  error: ReportableError,
  state: IState | undefined,
  allowReport?: boolean,
  source?: string,
): void;
/**
 * execute a function with the specified error context
 * @param id identifier of the context to set
 * @param value context value
 * @param fun the function to set
 */
declare function withContext(id: string, value: string, fun: () => PromiseBB$1<any>): Promise<any>;
type SetAttribute = (key: string, value: string | number | boolean) => void;
type SetError = (error: Error) => void;
type TrackedFunction<T> = (
  setAttribute: SetAttribute,
  setError: SetError,
) => PromiseBB$1<T> | Promise<T>;
interface TrackedActivityOptions {
  /** Start a new root trace instead of inheriting the active parent span. */
  root?: boolean;
}
/**
 * Execute a function wrapped in an OTel span with full control over
 * tracer name, span name, and attributes.
 * The span is automatically ended when the returned promise settles.
 * The callback receives a `setAttribute` function for adding dynamic attributes.
 *
 * Pass `{ root: true }` for top-level operations (downloads, installs) that
 * should start a new trace rather than becoming children of whatever span
 * happens to be active in the Bluebird chain.
 */
declare function withTrackedActivity<T>(
  tracerName: string,
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fun: TrackedFunction<T>,
  options?: TrackedActivityOptions,
): Promise<T>;
//#endregion
//#region lib/util/exeIcon.d.ts
declare function extractExeIcon(exePath: string, destPath: string): Promise<void>;
//#endregion
//#region lib/controls/LazyComponent.d.ts
declare function LazyComponent<T>(load: () => any): (props: any) => React$2.JSX.Element;
//#endregion
//#region lib/extensions/mod_management/util/installerHelpers.d.ts
/**
 * Returns the single top-level directory that contains every entry in `files`,
 * or `undefined` if files live at the root or under different top-level dirs.
 * Entries may use either `/` or `\` separators; both are recognised.
 */
declare function findCommonRootDir(files: readonly string[]): string | undefined;
/**
 * Build a `copy` instruction for every non-directory entry. When
 * `stripCommonRoot` is true and the archive wraps everything in a single
 * top-level dir, that dir is stripped from destination paths so the mod stages
 * at game root rather than inside the wrapper. Appends a `setmodtype`
 * instruction when `modType` is provided.
 */
declare function buildCopyInstructions(
  files: readonly string[],
  opts: {
    stripCommonRoot: boolean;
    modType?: string;
  },
): IInstallResult;
/**
 * Compile string stopPatterns (typically taken from `IGame.details.stopPatterns`)
 * to case-insensitive RegExp objects.
 */
declare function compileStopPatterns(patterns: readonly string[]): RegExp[];
/**
 * Build a `(testSupported, install)` pair from a spec. Exposed primarily so
 * callers can wire the pair into `context.registerInstaller` directly without
 * the loop in `declareInstallers` — useful when a game wants to mix
 * spec-driven installers with hand-written ones at custom priorities.
 */
declare function makeInstallerFromSpec(
  spec: IInstallerSpec,
  gameId: string,
): {
  testSupported: TestSupported;
  install: (files: string[]) => Promise<IInstallResult>;
};
/**
 * Register a data-driven installer table for one game. For each spec, builds a
 * `testSupported`/`install` pair from the match + install config and calls
 * `context.registerInstaller`. Registration id defaults to `${gameId}-${spec.id}`
 * when no `modType` is provided.
 */
declare function declareInstallers(
  context: IExtensionContext,
  gameId: string,
  specs: readonly IInstallerSpec[],
): void;
//#endregion
//#region lib/store/reduxLogger.d.ts
interface ILog {
  action: {
    type: string;
    payload: any;
  };
  delta: any;
}
declare function getReduxLog(): Promise<ILog[]>;
//#endregion
//#region lib/util/fsAtomic.d.ts
declare function writeFileAtomic(filePath: string, input: string | Buffer): PromiseBB$1<void>;
/**
 * copy a file in such a way that it will not replace the target if the copy is
 * somehow interrupted. The file is first copied to a temporary file in the same
 * directory as the destination, then deletes the destination and renames the temp
 * to destination. Since the rename is atomic and the deletion only happens after
 * a successful write this should minimize the risk of error.
 *
 * @export
 * @param {string} srcPath
 * @param {string} destPath
 * @returns {PromiseBB<void>}
 */
declare function copyFileAtomic(srcPath: string, destPath: string): PromiseBB$1<void>;
//#endregion
//#region lib/util/getVortexPath.d.ts
type AppPath = keyof VortexPaths;
declare function getVortexPath(id: AppPath): string;
//#endregion
//#region lib/util/github.d.ts
interface IGitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}
interface IGitHubAsset {
  browser_download_url: string;
  content_type: string;
  created_at: string;
  download_count: number;
  id: string;
  label: any;
  name: string;
  node_id: string;
  size: number;
  state: string;
  updated_at: string;
  uploader: IGitHubUser;
  url: string;
}
interface IGitHubRelease {
  assets: IGitHubAsset[];
  assets_url: string;
  author: IGitHubUser;
  body: string;
  created_at: string;
  draft: boolean;
  html_url: string;
  id: number;
  name: string;
  node_id: string;
  prerelease: boolean;
  published_at: string;
  tag_name: string;
  tarball_url: string;
  target_commitish: string;
  upload_url: string;
  url: string;
  zipball_url: string;
}
/**
 * wrap requests to the Vortex GitHub repo, caching results where appropriate
 *
 * @class GitHub
 */
declare class GitHub {
  private static RELEASE_CUTOFF;
  private static USER_AGENT;
  private static CONFIG_BRANCH;
  private static repoUrl;
  private static rawUrl;
  private mReleaseCache;
  private mRatelimitReset;
  releases(): PromiseBB$1<IGitHubRelease[]>;
  fetchConfig(config: string): PromiseBB$1<any>;
  private query;
  private queryReleases;
}
declare const _default$14: GitHub;
//#endregion
//#region lib/util/lazyRequire.d.ts
declare function lazyRequire<T>(delayed: () => T, exportId?: string): T;
//#endregion
//#region lib/util/local.d.ts
/**
 * create a global variable that is available through an id.
 * This is basically a hack to get around the fact js can't have
 * proper singletons.
 */
declare function local<T>(id: string, init: T): T;
//#endregion
//#region lib/util/makeReactive.d.ts
/**
 * create a proxy around the specified object that forces any
 * react component that has this proxy as a prop to update whenever
 * the object is changed (mutated)
 *
 * TODO: The implementation isn't particularly efficient (see comment in
 *   ExtensionGate.tsx), I hope we can fix that someday without changing
 *   the api
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
declare function makeReactive<T extends object>(value: T): T;
//#endregion
//#region lib/util/onceCB.d.ts
/**
 * Higher-Order function that ensures that the wrapped callback is only called once (through this wrapper)
 * When passing a callback to an event it might not be intended to be called more than once but since
 * any part of the application (including extensions) could be adding event handlers and break the logic
 * that ensures that - this ensures that errors like that are reported in a useable fashion.
 * @param func the function to wrap
 */
declare function onceCB<T extends Function>(func: T): T;
//#endregion
//#region lib/util/opn.d.ts
/** @deprecated */
declare function open(target: string, _wait?: boolean): PromiseBB$1<void>;
//#endregion
//#region lib/util/relativeTime.d.ts
/**
 * format the specified date in a user-friendly way, depending on the globally set time mode
 */
declare function userFriendlyTime(date: Date, t: TFunction$1, locale: string): string;
declare function relativeTime(date: Date, t: TFunction$1): string;
//#endregion
//#region lib/util/Steam.d.ts
interface ISteamEntry extends IGameStoreEntry {
  manifestData?: any;
  usesProton?: boolean;
  compatDataPath?: string;
  protonPath?: string;
}
/**
 * base class to interact with local steam installation
 * @class Steam
 */
declare class Steam implements IGameStore {
  id: string;
  name: string;
  priority: number;
  private mBaseFolder;
  private mCache;
  constructor();
  /**
   * find the first game that matches the specified name pattern
   */
  findByName(namePattern: string): PromiseBB$1<ISteamEntry>;
  launchGame(appInfo: any, api?: IExtensionApi): PromiseBB$1<void>;
  getPosixPath(appInfo: any): PromiseBB$1<string>;
  getExecInfo(appInfo: any): PromiseBB$1<IExecInfo>;
  /**
   * find the first game with the specified appid or one of the specified appids
   */
  findByAppId(appId: string | string[]): PromiseBB$1<ISteamEntry>;
  allGames(): PromiseBB$1<ISteamEntry[]>;
  getGameStorePath(): PromiseBB$1<string | undefined>;
  reloadGames(): PromiseBB$1<void>;
  identifyGame(
    gamePath: string,
    fallback: (gamePath: string) => PromiseLike<boolean>,
  ): PromiseBB$1<boolean>;
  private isCustomExecObject;
  private resolveSteamPaths;
  private parseManifests;
  /**
   * Run a Windows tool through Proton using the game's prefix
   */
  runToolWithProton(
    api: IExtensionApi,
    exePath: string,
    args: string[],
    options: any,
    gameEntry: ISteamEntry,
  ): Promise<void>;
}
declare const instance: Steam;
//#endregion
//#region lib/util/deepMerge.d.ts
/**
 * very simplistic deep merge.
 *
 * @param {*} lhs
 * @param {*} rhs
 * @returns {*}
 */
declare function deepMerge(lhs: any, rhs: any): any;
//#endregion
//#region lib/util/elevated.d.ts
interface IElevatedIpc {
  sendMessage(data: unknown): void;
  sendError(error: unknown): void;
  sendEndError(error: unknown): void;
  end(): void;
}
/**
 * run a function as an elevated process (windows only!).
 * This is quite a hack because obviously windows doesn't allow us to elevate a
 * running process so instead we have to store the function code into a file and start a
 * new node process elevated to execute that script.
 *
 * IMPORTANT As a consequence the function can not bind any parameters
 *
 * @param {string} ipcPath a unique identifier for a local ipc channel that can be used to
 *                 communicate with the elevated process (as stdin/stdout can not be)
 *                 redirected
 * @param {Function} func The closure to run in the elevated process. Try to avoid
 *                        'fancy' code. This function receives two parameters, one is an ipc stream,
 *                        connected to the path specified in the first parameter.
 *                        The second function is a require function which you need to use instead of
 *                        the global require. Regular require calls will not work in production
 *                        builds
 * @param {Object} args arguments to be passed into the elevated process
 * @returns {Bluebird<string>} a promise that will be resolved as soon as the process is started
 *                             (which happens after the user confirmed elevation). It resolves to
 *                             the path of the tmpFile we had to create. If the caller can figure
 *                             out when the process is done (using ipc) it should delete it
 */
declare function runElevated(
  ipcPath: string,
  func: (ipc: IElevatedIpc, req: NodeJS.Require) => void | PromiseLike<void>,
  args?: Record<string, unknown>,
): Promise<string>;
//#endregion
//#region lib/util/thread.d.ts
declare function runThreaded(
  func: (...args: any[]) => any,
  moduleBase: string,
  ...args: any[]
): PromiseBB$1<any>;
//#endregion
//#region lib/util/util.d.ts
/**
 * like the python setdefault function:
 * returns the attribute "key" from "obj". If that attribute doesn't exist
 * on obj, it will be set to the default value and that is returned.
 */
declare function setdefault<T, K extends keyof T>(obj: T, key: K, def: T[K]): T[K];
/**
 * return the delta between two objects
 * @param lhs the left, "before", object
 * @param rhs the right, "after", object
 * @param skip properties to skip in the diff, string array
 */
declare function objDiff(lhs: any, rhs: any, skip?: string[]): Record<string, any>;
/**
 * create a "queue".
 * Returns an enqueue function such that that the callback passed to it
 * will be called only after everything before it in the queue is finished
 * and with the promise that nothing else in the queue is run in parallel.
 */
declare function makeQueue<T>(): (func: () => PromiseLike<T>, tryOnly: boolean) => PromiseBB$1<T>;
declare function bytesToString(bytes: number): string;
declare function pad(value: number, padding: string, width: number): string;
/**
 * test if a directory is a sub-directory of another one
 * @param child path of the presumed sub-directory
 * @param parent path of the presumed parent directory
 */
declare function isChildPath(child: string, parent: string, normalize?: Normalize): boolean;
/**
 * take any input string and sanitize it into a valid css id
 */
declare function sanitizeCSSId(input: string): string;
/**
 * remove the BOM from the input string. doesn't do anything if there is none.
 */
declare function deBOM(input: string): string;
/**
 * wait for the specified number of milliseconds before resolving the promise.
 * Bluebird has this feature as Promise.delay but when using es6 default promises this can be used
 */
declare function delay(timeoutMS: number): PromiseBB$1<void>;
declare function isFilenameValid(input: string): boolean;
/**
 * encodes a string so it can safely be used as a filename
 */
declare function sanitizeFilename(input: string): string;
declare function isPathValid(input: string, allowRelative?: boolean): boolean;
/**
 * @deprecated Wrap the call in a plain `new Promise` instead. This helper predates the typed
 * `ApiEvents` registry and erases the callback signature, so the emit's arguments and result
 * go unchecked.
 */
declare function toPromise<ResT>(func: (cb: any) => void): PromiseBB$1<ResT>;
declare function makeUnique<T>(input: T[]): T[];
/**
 * create a list with only "unique" items, using a key function to determine uniqueness.
 * in case of collisions the last item with a key is kept
 * @param input the input list of items
 * @param key key function
 * @returns a list with duplicates removed
 */
declare function makeUniqueByKey<T>(input: T[], key: (item: T) => string): T[];
declare function unique<T, U>(input: T[], keyFunc?: (item: T) => U): T[];
declare function toBlue<T, ArgsT extends any[]>(
  func: (...args: ArgsT) => Promise<T>,
): (...args: ArgsT) => PromiseBB$1<T>;
declare function semverCoerce(input: string, options?: semver.CoerceOptions): semver.SemVer;
declare function batchDispatch(store: Redux.Dispatch | Redux.Store, actions: Redux.Action[]): void;
/**
 * Represents the different sections available in the application and is used to construct URLs for specific subdomains.
 */
declare enum Section {
  Mods = 0,
  Collections = 1,
  Users = 2,
}
/**
 * Represents the available campaign types for tracking user interactions.
 * @property BuyPremium - Campaign for premium subscription advertisements.
 * @property GeneralNavigation - Campaign for general navigation events.
 */
declare enum Campaign {
  BuyPremium = "buy_premium",
  GeneralNavigation = "general_navigation",
}
/**
 * Represents the different types of content placements for advertisements within the application.
 * @property HeaderAd - Ad displayed in the titlebar.
 * @property DownloadsBannerAd - Banner shown at top of downloads page.
 * @property CollectionsDownloadModModal - Modal shown when downloading a mod from a collection.
 * @property DashboardDashletAd - Advertisement displayed in a dashboard dashlet.
 * @property CollectionsDownloadAd - Advertisement shown during collection downloads.
 * @property SettingsDownloadAd - Advertisement displayed in the settings download section.
 * @property HealthCheckAd - Advertisement displayed in the health check page.
 */
declare enum Content {
  HeaderAd = "header_ad",
  DownloadsBannerAd = "downloads_banner_ad",
  DownloadModModal = "downloadmod_modal",
  DashboardDashletAd = "dashboard_dashlet_ad",
  CollectionsDownloadAd = "collections_download_ad",
  SettingsDownloadAd = "settings_download_ad",
  HealthCheckAd = "health_check_ad",
}
interface INexusURLOptions {
  section?: Section;
  content?: Content;
  campaign?: Campaign | string;
  parameters?: string[];
}
declare function nexusModsURL(reqPath: string[], options?: INexusURLOptions): string;
declare class Overlayable<KeyT extends string | number | symbol, ObjT> {
  private mBaseData;
  private mLayers;
  private mDeduce;
  constructor(baseData: Record<KeyT, ObjT>, deduceLayer: (key: KeyT, extraArg: any) => string);
  setLayer(layerId: string, data: Record<KeyT, Partial<ObjT>>): void;
  keys(): string[];
  has(key: KeyT): boolean;
  get<AttrT extends keyof ObjT, ValT extends ObjT[AttrT]>(
    key: KeyT,
    attr: AttrT,
    extraArg?: any,
  ): ValT;
  get baseData(): Record<KeyT, ObjT>;
}
/**
 * helper function to create a dictionary that can have conditional
 * overlays applied to it
 * @param baseData the base data object
 * @param layers keyed layers
 * @param deduceLayer determine the layer to be used for a given key. If this returns
 * @returns
 */
declare function makeOverlayableDictionary<KeyT extends string | number | symbol, ValueT>(
  baseData: Record<KeyT, ValueT>,
  layers: {
    [layerId: string]: Record<KeyT, Partial<ValueT>>;
  },
  deduceLayer: (key: KeyT, extraArg: any) => string,
): Overlayable<KeyT, ValueT>;
declare namespace fs_d_exports {
  export {
    FSWatcher,
    ILinkFileOptions,
    IRemoveFileOptions,
    ITmpOptions,
    Stats,
    WriteStream,
    accessSync,
    appendFileAsync,
    appendFileSync,
    changeFileAttributes,
    changeFileOwnership,
    chmodAsync,
    closeAsync,
    closeSync,
    constants,
    copyAsync,
    createReadStream,
    createWriteStream,
    encodingFromBOM,
    ensureDirAsync,
    ensureDirSync,
    ensureDirWritableAsync,
    ensureFileAsync,
    forcePerm,
    fsyncAsync,
    genFSWrapperAsync,
    isDirectoryAsync,
    linkAsync,
    linkSync,
    lstatAsync,
    makeFileWritableAsync,
    mkdirAsync,
    mkdirsAsync,
    moveAsync,
    moveRenameAsync,
    openAsync,
    openSync,
    readAsync,
    readFileAsync,
    readFileBOM,
    readFileSync,
    readdirAsync,
    readdirSync,
    readlinkAsync,
    removeAsync,
    removeSync,
    renameAsync,
    rmdirAsync,
    setTFunction,
    statAsync,
    statSilentAsync,
    statSync,
    symlinkAsync,
    symlinkSync,
    unlinkAsync,
    utimesAsync,
    watch,
    withTmpDir,
    withTmpDirImpl,
    withTmpFile,
    writeAsync,
    writeFileAsync,
    writeFileSync,
    writeSync,
  };
}
interface ILinkFileOptions {
  showDialogCallback?: () => boolean;
}
interface IRemoveFileOptions {
  showDialogCallback?: () => boolean;
}
declare function setTFunction(tFunc: TFunction$1): void;
declare function genFSWrapperAsync<T extends (...args: any[]) => any>(
  func: T,
): (...args: any[]) => PromiseBB$1<any>;
declare const chmodAsync: (path: string, mode: string | number) => PromiseBB$1<void>;
declare const closeAsync: (fd: number) => PromiseBB$1<void>;
declare const fsyncAsync: (fd: number) => PromiseBB$1<void>;
declare const lstatAsync: (path: string) => PromiseBB$1<fs.Stats>;
declare const mkdirAsync: (path: string) => PromiseBB$1<void>;
declare const mkdirsAsync: (path: string) => PromiseBB$1<void>;
declare const moveAsync: (src: string, dest: string, options?: fs.MoveOptions) => PromiseBB$1<void>;
declare const openAsync: (
  path: string,
  flags: string | number,
  mode?: number,
) => PromiseBB$1<number>;
declare const readdirAsync: (path: string) => PromiseBB$1<string[]>;
declare const readFileAsync: (...args: any[]) => PromiseBB$1<any>;
declare const statAsync: (path: string) => PromiseBB$1<fs.Stats>;
declare const statSilentAsync: (path: string) => PromiseBB$1<fs.Stats>;
declare const symlinkAsync: (srcpath: string, dstpath: string, type?: string) => PromiseBB$1<void>;
declare const utimesAsync: (path: string, atime: number, mtime: number) => PromiseBB$1<void>;
declare const writeAsync: <BufferT>(...args: any[]) => PromiseBB$1<{
  bytesWritten: number;
  buffer: BufferT;
}>;
declare const readAsync: <BufferT>(...args: any[]) => PromiseBB$1<{
  bytesRead: number;
  buffer: BufferT;
}>;
declare const writeFileAsync: (
  file: string,
  data: any,
  options?: fs.WriteFileOptions,
) => PromiseBB$1<void>;
declare const appendFileAsync: (
  file: string,
  data: any,
  options?: fs.WriteFileOptions,
) => PromiseBB$1<void>;
/** @deprecated use node:fs directly */
declare function isDirectoryAsync(dirPath: string): PromiseBB$1<boolean>;
/** @deprecated use node:fs directly */
declare function ensureDirSync(dirPath: string): void;
/** @deprecated use node:fs directly */
declare function ensureFileAsync(filePath: string): PromiseBB$1<void>;
/** @deprecated use node:fs directly */
declare function ensureDirAsync(
  dirPath: string,
  onDirCreatedCB?: (created: string) => PromiseLike<void>,
): PromiseBB$1<void>;
/**
 * move a file. If the destination exists, will generate a new name with an
 * increasing counter until an unused name is found
 */
declare function moveRenameAsync(src: string, dest: string): PromiseBB$1<string>;
/**
 * copy file
 * The copy function from fs-extra doesn't (at the time of writing) correctly check that a file
 * isn't copied onto itself (it fails for links or potentially on case insensitive disks),
 * so this makes a check based on the ino number.
 * A bug in older versions of node.js made it necessary this check be optional but that is
 * resolved now so the check should always be enabled.
 * @param src file to copy
 * @param dest destination path
 * @param options copy options (see documentation for fs)
 *
 * @deprecated Use node:fs directly
 */
declare function copyAsync(
  src: string,
  dest: string,
  options?: fs.CopyOptions & {
    noSelfCopy?: boolean;
    showDialogCallback?: () => boolean;
  },
): PromiseBB$1<void>;
/** @deprecated use node:fs directly */
declare function linkAsync(
  src: string,
  dest: string,
  options?: ILinkFileOptions,
): PromiseBB$1<void>;
declare function removeSync(dirPath: string): void;
declare function unlinkAsync(filePath: string, options?: IRemoveFileOptions): PromiseBB$1<void>;
/** @deprecated use node:fs directly */
declare function renameAsync(sourcePath: string, destinationPath: string): PromiseBB$1<void>;
declare function rmdirAsync(dirPath: string): PromiseBB$1<void>;
/** @deprecated use node:fs directly */
declare function removeAsync(remPath: string, options?: IRemoveFileOptions): PromiseBB$1<void>;
/** @deprecated use node:fs directly */
declare function readlinkAsync(linkPath: string): PromiseBB$1<string>;
declare function ensureDirWritableAsync(
  dirPath: string,
  confirm?: () => PromiseLike<void>,
): PromiseBB$1<void>;
declare function changeFileOwnership(filePath: string, stat: fs.Stats): PromiseBB$1<void>;
declare function changeFileAttributes(
  filePath: string,
  wantedAttributes: number,
  stat: fs.Stats,
): PromiseBB$1<void>;
declare function makeFileWritableAsync(filePath: string): PromiseBB$1<void>;
declare function forcePerm<T>(
  t: TFunction$1,
  op: () => PromiseBB$1<T>,
  filePath?: string,
  maxTries?: number,
): PromiseBB$1<T>;
declare function withTmpDirImpl<T>(cb: (tmpPath: string) => PromiseBB$1<T>): PromiseBB$1<T>;
interface ITmpOptions {
  cleanup?: boolean;
}
declare const withTmpDir: (...args: any[]) => PromiseBB$1<any>;
declare const withTmpFile: (...args: any[]) => PromiseBB$1<any>;
declare function encodingFromBOM(buf: Buffer): {
  encoding: string;
  length: number;
};
/**
 * read file, using the BOM to determine the encoding
 * @param filePath the file to read
 * @param fallbackEncoding the encoding to use if there is no BOM. Expects one of the iconv-constants,
 *                         which seem to be a super-set of the regular node buffer encodings
 * @returns decoded file encoding
 */
declare function readFileBOM(filePath: string, fallbackEncoding: string): Promise<string>;
//#endregion
//#region lib/util/walk.d.ts
interface IWalkOptions {
  ignoreErrors?: string[] | true;
}
/**
 * recursively walk the target directory
 *
 * @param {string} target the directory to search
 * @param {any} callback called on each file and directory encountered. Receives the path and
 *                       corresponding fs stats as parameter. Should return a promise that will be
 *                       awaited before proceeding to the next directory. If this promise is
 *                       rejected, the walk is interrupted
 * @returns {Promise<void>} a promise that is resolved once the search is complete
 */
declare function walk(
  target: string,
  callback: (iterPath: string, stats: Stats) => PromiseLike<any>,
  options?: IWalkOptions,
): Promise<void>;
//#endregion
//#region lib/util/network.d.ts
interface IRequestOptions {
  expectedContentType?: RegExp;
  encoding?: BufferEncoding;
}
declare function rawRequest(apiURL: string, options?: IRequestOptions): Promise<string | Buffer>;
declare function jsonRequest<T>(apiURL: string): Promise<T>;
type Method = "GET" | "POST" | "PUT";
declare function request(
  method: Method,
  reqURL: string,
  headers: any,
  cb: (res: IncomingMessage) => void,
): ClientRequest;
declare function upload(targetUrl: string, dataStream: Readable, dataSize: number): Promise<Buffer>;
//#endregion
//#region lib/util/storeHelper.d.ts
/**
 * return an item from state or the fallback if the path doesn't lead
 * to an item or if the item is null/undefined.
 *
 * @public
 * @deprecated Use optional chaining (`?.`) and nullish coalescing (`??`) instead.
 */
declare function getSafe<T>(state: any, path: Array<string | number | undefined>, fallback: T): T;
/**
 * case insensitive variant of getSafe
 *
 * @public
 * @deprecated Use `Object.keys()` + `find()` for case-insensitive key lookup with optional chaining.
 */
declare function getSafeCI<T>(state: any, path: Array<string | number>, fallback: T): T;
/**
 * @public
 * @deprecated Use direct assignment instead.
 */
declare function mutateSafe<T>(state: T, path: Array<string | number>, value: any): void;
/**
 * set an item in state, creating all intermediate nodes as necessary
 *
 * @public
 * @deprecated Use spread syntax with computed property names and nested spreads for immutable updates.
 */
declare function setSafe<T extends object>(state: T, path: Array<string | number>, value: any): T;
/**
 * sets a value or do nothing if the path (except for the last element) doesn't exist.
 * That is: setOrNop does not create the object hierarchy referenced in the path but
 * it does add a new attribute to the object if necessary.
 *
 * @public
 * @deprecated Use computed property spread with optional chaining guard (e.g. `state.a?.b ? { ...state, a: { ...state.a, b: val } } : state`).
 */
declare function setOrNop<T>(state: T, path: string[], value: any): T;
/**
 * sets a value or do nothing if the path or the key (last element of the path) doesn't exist.
 * This means changeOrNop only changes a pre-existing object attribute
 *
 * @public
 * @deprecated Use `Object.hasOwn()` guard with spread, or `Object.assign()`.
 */
declare function changeOrNop<T>(state: T, path: Array<string | number>, value: any): T;
/**
 * delete a value or do nothing if the path doesn't exist
 *
 * @public
 * @deprecated Use destructuring rest (`{ [key]: _, ...rest }`) for objects, `Array.filter()` or `Array.toSpliced()` for arrays.
 */
declare function deleteOrNop<T>(state: T, path: Array<string | number>): T;
/**
 * @public
 * @deprecated Use spread + nullish coalescing (`state.path ?? fallback`) with direct immutable updates.
 */
declare function setDefaultArray<T>(state: T, path: Array<string | number>, fallback: any[]): T;
/**
 * push an item to an array inside state. This creates all intermediate
 * nodes and the array itself as necessary
 * @param state immutable object to update
 * @param path path to the item to update
 * @param value the value to add.
 *
 * @public
 * @deprecated Use array spread (`[...arr, value]`) or `Array.toSpliced()`.
 */
declare function pushSafe<T>(state: T, path: Array<string | number>, value: any): T;
/**
 * add an item to an array inside state but don't allow duplicates
 * @param state immutable object to update
 * @param path path to the item to update
 * @param value the value to add.
 *
 * @public
 * @deprecated Use `arr.includes(value) ? state : [...arr, value]`.
 */
declare function addUniqueSafe<T>(state: T, path: Array<string | number>, value: any): T;
/**
 * remove a value from an array by value
 *
 * @public
 * @deprecated Use `arr.filter(v => v !== value)` or `arr.toSpliced(arr.indexOf(value), 1)`.
 */
declare function removeValue<T>(state: T, path: Array<string | number>, value: any): T;
/**
 * remove all vales for which the predicate applies
 *
 * @public
 * @deprecated Use `arr.filter(ele => !predicate(ele))`.
 */
declare function removeValueIf<T extends object>(
  state: T,
  path: Array<string | number>,
  predicate: (element: any) => boolean,
): T;
/**
 * shallow merge a value into the store at the specified location
 *
 * @public
 * @deprecated Use spread syntax (`{ ...obj, ...values }`).
 */
declare function merge<T extends object>(state: T, path: Array<string | number>, value: any): T;
/**
 * @public
 * @deprecated Use spread with nullish coalescing (`{ ...state, ...(inbound ?? {}) }`).
 */
declare function rehydrate<T extends object>(
  state: T,
  inbound: any,
  path: string[],
  replace: boolean,
  defaults: any,
): T;
/**
 * return the stored static details about the currently selected game mode
 * or a fallback with the id '__placeholder'
 * the return value is a promise because known games are loaded during extension
 * initialization so there is quite a bit of code where we can't be sure
 * if this is yet available
 *
 * @public
 */
declare function currentGame$1(store: Redux.Store<any>): PromiseBB$1<IGameStored>;
declare namespace api_d_exports$1 {
  export {
    Archive,
    ArgumentInvalid,
    Campaign,
    CollectionInstallOutcomeProps,
    CollectionsDownloadCancelledEvent,
    CollectionsDownloadClickedEvent,
    CollectionsDownloadCompletedEvent,
    CollectionsDownloadFailedEvent,
    CollectionsDraftUpdateUploadedEvent,
    CollectionsDraftUploadedEvent,
    CollectionsDraftedEvent,
    CollectionsInstallationCancelledEvent,
    CollectionsInstallationCompletedEvent,
    CollectionsInstallationFailedEvent,
    CollectionsInstallationStartedEvent,
    ConcurrencyLimiter,
    Content,
    CycleError,
    DataInvalid,
    Debouncer,
    GameNotFound,
    instance$2 as GameStoreHelper,
    IErrorRendered,
    IPrettifiedError,
    IRequestOptions,
    ISteamEntry,
    LazyComponent,
    Method,
    MissingInterpreter,
    ModChangeReason,
    Normalize,
    NotFound,
    NotSupportedError,
    Overlayable,
    ProcessCanceled,
    ReduxProp,
    Section,
    SetupError,
    SevenZip,
    StarterInfo,
    TextGroup,
    UserCanceled,
    addUniqueSafe,
    batchDispatch,
    preProcess as bbcodePreProcess,
    bbcodeToHTML,
    renderBBCode as bbcodeToReact,
    buildCopyInstructions,
    bytesToString,
    calcDuration,
    calculateFolderSize,
    changeOrNop,
    checksum,
    coerceToSemver,
    compileStopPatterns,
    convertGameIdReverse,
    copyFileAtomic,
    copyRecursive,
    currentGame$1 as currentGame,
    deBOM,
    declareInstallers,
    deepMerge,
    delay,
    deleteOrNop,
    deriveModInstallName as deriveInstallName,
    instance$1 as epicGamesLauncher,
    extractExeIcon,
    fileMD5,
    findCommonRootDir,
    findDownloadByRef,
    findModByRef,
    findRuleByRef,
    generateCollectionSessionId,
    getActivator,
    getApplication,
    getCurrentActivator,
    getCurrentLanguage,
    getDriveList,
    getGame,
    getGames,
    getManifest,
    getModSource,
    getModSources,
    getModType,
    getNormalizeFunc,
    getReduxLog,
    getSafe,
    getSafeCI,
    getText,
    getVisibleWindow,
    getVortexPath,
    _default$14 as github,
    installIconSet,
    isChildPath,
    isFilenameValid,
    isFuzzyVersion,
    isPathValid,
    jsonRequest,
    lazyRequire,
    local,
    lookupFromDownload,
    makeInstallerFromSpec,
    makeModReference,
    makeNormalizingDict,
    makeOverlayableDictionary,
    makeQueue,
    makeReactive,
    makeRemoteCall,
    makeUnique,
    makeUniqueByKey,
    merge,
    modRuleId,
    mutateSafe,
    nexusGameId,
    nexusModsURL,
    normalizeStoreQuery,
    objDiff,
    onceCB,
    open as opn,
    pad,
    prettifyNodeErrorMessage,
    pushSafe,
    rawRequest,
    readExtensibleDir,
    rehydrate,
    relativeTime,
    removeMods,
    removeValue,
    removeValueIf,
    renderError,
    modName as renderModName,
    renderModReference,
    request,
    resolveCategoryName,
    resolveCategoryPath,
    ruleInstallSpec,
    rulePhase,
    runElevated,
    runThreaded,
    sanitizeCSSId,
    sanitizeFilename,
    semverCoerce,
    setDefaultArray,
    setOrNop,
    setSafe,
    setdefault,
    showActivity,
    showError,
    showInfo,
    showSuccess,
    sortMods,
    instance as steam,
    terminate,
    testModReference,
    testRefByIdentifiers,
    toBlue,
    toPromise,
    unique,
    upload,
    userFriendlyTime,
    walk,
    withContext as withErrorContext,
    withTrackedActivity,
    writeFileAtomic,
  };
}
/**
 * @deprecated Use window.api for IPC communication from renderer to main process.
 * See src/shared/types/preload.ts for the complete API.
 */
declare function makeRemoteCall(): never;
type TextGroup = "mod" | "profile";
declare function getText(group: TextGroup, textId: string, t: TFunction$1): string;
//#endregion
//#region lib/extensions/download_management/selectors.d.ts
declare const downloadPath: (state: IState) => string;
declare function downloadPathForGame(state: IState, gameId?: string): string;
declare const downloadsForGame: (
  state: IState,
  gameId: string,
) => {
  [dlId: string]: IDownload;
};
declare const downloadsForActiveGame: (state: IState) => ((state: IState) => {
  [dlId: string]: IDownload;
}) &
  import("reselect").OutputSelectorFields<
    (args_0: string) => {
      [dlId: string]: IDownload;
    },
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const queueClearingDownloads: ((state: IState) => {}) &
  import("reselect").OutputSelectorFields<
    (args_0: { [id: string]: IDownload }) => {},
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const activeDownloads: ((state: IState) => {}) &
  import("reselect").OutputSelectorFields<
    (args_0: { [id: string]: IDownload }) => {},
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const getDownloadByIds: ((
  state: IState,
  identifiers: {
    fileId: number;
    modId: number;
    gameId: string;
  },
) => IDownload) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {
        [id: string]: IDownload;
      },
      args_1: {
        fileId: number;
        modId: number;
        gameId: string;
      },
    ) => IDownload,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
//#endregion
//#region lib/extensions/profile_management/selectors.d.ts
declare const profiles: (state: IState) => {
  [profileId: string]: IProfile;
};
declare const lastActiveProfiles: (state: IState) => {
  [gameId: string]: string;
};
declare const activeGameId: (state: IState) => string;
declare const gameProfiles: ((state: IState) => IProfile[]) &
  import("reselect").OutputSelectorFields<
    (
      args_0: string,
      args_1: {
        [profileId: string]: IProfile;
      },
    ) => IProfile[],
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const activeProfileId: (state: IState) => string | undefined;
declare const nextProfileId: (state: IState) => string | undefined;
declare const activeProfile: (state: IState) => IProfile | undefined;
declare function profileById(state: IState, profileId: string): IProfile;
declare const enabledModCountForProfile: import("re-reselect").ParametricSelector<
  IState,
  string,
  number
> & {
  resultFunc: (res1: IModTable, res2: IProfile) => number;
  dependencies: [
    import("re-reselect").ParametricSelector<IState, string, IModTable>,
    import("re-reselect").ParametricSelector<IState, string, IProfile>,
  ];
  recomputations: () => number;
  resetRecomputations: () => number;
} & {
  getMatchingSelector: (
    state: IState,
    props: string,
    ...args: any[]
  ) => import("re-reselect").OutputParametricSelector<
    IState,
    string,
    number,
    (res1: IModTable, res2: IProfile) => number,
    [
      import("re-reselect").ParametricSelector<IState, string, IModTable>,
      import("re-reselect").ParametricSelector<IState, string, IProfile>,
    ]
  >;
  removeMatchingSelector: (state: IState, props: string, ...args: any[]) => void;
  clearCache: () => void;
  cache: import("re-reselect").ICacheObject;
  keySelector: import("re-reselect").ParametricKeySelector<IState, string>;
};
declare const lastActiveProfileForGame: import("re-reselect").ParametricSelector<
  IState,
  string,
  string
> & {
  resultFunc: (
    res1: {
      [gameId: string]: string;
    },
    res2: string,
  ) => string;
  dependencies: [
    import("re-reselect").ParametricSelector<
      IState,
      string,
      {
        [gameId: string]: string;
      }
    >,
    import("re-reselect").ParametricSelector<IState, string, string>,
  ];
  recomputations: () => number;
  resetRecomputations: () => number;
} & {
  getMatchingSelector: (
    state: IState,
    props: string,
    ...args: any[]
  ) => import("re-reselect").OutputParametricSelector<
    IState,
    string,
    string,
    (
      res1: {
        [gameId: string]: string;
      },
      res2: string,
    ) => string,
    [
      import("re-reselect").ParametricSelector<
        IState,
        string,
        {
          [gameId: string]: string;
        }
      >,
      import("re-reselect").ParametricSelector<IState, string, string>,
    ]
  >;
  removeMatchingSelector: (state: IState, props: string, ...args: any[]) => void;
  clearCache: () => void;
  cache: import("re-reselect").ICacheObject;
  keySelector: import("re-reselect").ParametricKeySelector<IState, string>;
};
//#endregion
//#region lib/extensions/mod_management/selectors.d.ts
declare const installPath: ((state: IState) => string) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {
        [gameId: string]: string;
      },
      args_1: string,
    ) => string,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const installPathForGame: import("re-reselect").ParametricSelector<
  IState,
  string,
  string
> & {
  resultFunc: (res1: string, res2: string) => string;
  dependencies: [
    import("re-reselect").ParametricSelector<IState, string, string>,
    import("re-reselect").ParametricSelector<IState, string, string>,
  ];
  recomputations: () => number;
  resetRecomputations: () => number;
} & {
  getMatchingSelector: (
    state: IState,
    props: string,
    ...args: any[]
  ) => import("re-reselect").OutputParametricSelector<
    IState,
    string,
    string,
    (res1: string, res2: string) => string,
    [
      import("re-reselect").ParametricSelector<IState, string, string>,
      import("re-reselect").ParametricSelector<IState, string, string>,
    ]
  >;
  removeMatchingSelector: (state: IState, props: string, ...args: any[]) => void;
  clearCache: () => void;
  cache: import("re-reselect").ICacheObject;
  keySelector: import("re-reselect").ParametricKeySelector<IState, string>;
};
declare const currentActivator: ((state: IState) => string) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {
        [gameId: string]: string;
      },
      args_1: string,
    ) => string,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const activatorForGame: import("re-reselect").ParametricSelector<IState, string, string> & {
  resultFunc: (
    res1: {
      [gameId: string]: string;
    },
    res2: string,
  ) => string;
  dependencies: [
    import("re-reselect").ParametricSelector<
      IState,
      string,
      {
        [gameId: string]: string;
      }
    >,
    import("re-reselect").ParametricSelector<IState, string, string>,
  ];
  recomputations: () => number;
  resetRecomputations: () => number;
} & {
  getMatchingSelector: (
    state: IState,
    props: string,
    ...args: any[]
  ) => import("re-reselect").OutputParametricSelector<
    IState,
    string,
    string,
    (
      res1: {
        [gameId: string]: string;
      },
      res2: string,
    ) => string,
    [
      import("re-reselect").ParametricSelector<
        IState,
        string,
        {
          [gameId: string]: string;
        }
      >,
      import("re-reselect").ParametricSelector<IState, string, string>,
    ]
  >;
  removeMatchingSelector: (state: IState, props: string, ...args: any[]) => void;
  clearCache: () => void;
  cache: import("re-reselect").ICacheObject;
  keySelector: import("re-reselect").ParametricKeySelector<IState, string>;
};
interface INeedToDeployMap {
  [gameId: string]: boolean;
}
declare const needToDeploy: ((state: IState) => boolean) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {
        [gameId: string]: boolean;
      },
      args_1: string,
    ) => boolean,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const needToDeployForGame: import("re-reselect").ParametricSelector<
  IState,
  string,
  boolean
> & {
  resultFunc: (res1: INeedToDeployMap, res2: string) => boolean;
  dependencies: [
    import("re-reselect").ParametricSelector<IState, string, INeedToDeployMap>,
    import("re-reselect").ParametricSelector<IState, string, string>,
  ];
  recomputations: () => number;
  resetRecomputations: () => number;
} & {
  getMatchingSelector: (
    state: IState,
    props: string,
    ...args: any[]
  ) => import("re-reselect").OutputParametricSelector<
    IState,
    string,
    boolean,
    (res1: INeedToDeployMap, res2: string) => boolean,
    [
      import("re-reselect").ParametricSelector<IState, string, INeedToDeployMap>,
      import("re-reselect").ParametricSelector<IState, string, string>,
    ]
  >;
  removeMatchingSelector: (state: IState, props: string, ...args: any[]) => void;
  clearCache: () => void;
  cache: import("re-reselect").ICacheObject;
  keySelector: import("re-reselect").ParametricKeySelector<IState, string>;
};
declare const modPathsForGame: ((
  state: IState,
  gameId: string,
) => {
  [typeId: string]: string;
}) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {},
      args_1: string,
    ) => {
      [typeId: string]: string;
    },
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const modsForGame: (
  state: IState,
  gameId: string,
) => {
  [modId: string]: IMod;
};
declare const modsForActiveGame: ((state: IState) => {
  [modId: string]: IMod;
}) &
  import("reselect").OutputSelectorFields<
    (
      args_0: string,
      args_1: IState,
    ) => {
      [modId: string]: IMod;
    },
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const getMod: ((state: IState, gameId: string, modId: string | number) => IMod) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {
        [modId: string]: IMod;
      },
      args_1: string | number,
    ) => IMod,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const getModInstallPath: ((
  state: IState,
  gameId: string,
  modId: string | number,
) => string) &
  import("reselect").OutputSelectorFields<
    (args_0: IMod, args_1: string) => string,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
//#endregion
//#region lib/extensions/gamemode_management/selectors.d.ts
declare function knownGames(state: IState): IGameStored[];
declare function discovered(state: IState): {
  [id: string]: IDiscoveryResult;
};
declare const currentGame: ((state: IState) => IGameStored) &
  import("reselect").OutputSelectorFields<
    (args_0: IGameStored[], args_1: string) => IGameStored,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const gameById: import("re-reselect").ParametricSelector<IState, string, IGameStored> & {
  resultFunc: (res1: IGameStored[], res2: string) => IGameStored;
  dependencies: [
    import("re-reselect").ParametricSelector<IState, string, IGameStored[]>,
    import("re-reselect").ParametricSelector<IState, string, string>,
  ];
  recomputations: () => number;
  resetRecomputations: () => number;
} & {
  getMatchingSelector: (
    state: IState,
    props: string,
    ...args: any[]
  ) => import("re-reselect").OutputParametricSelector<
    IState,
    string,
    IGameStored,
    (res1: IGameStored[], res2: string) => IGameStored,
    [
      import("re-reselect").ParametricSelector<IState, string, IGameStored[]>,
      import("re-reselect").ParametricSelector<IState, string, string>,
    ]
  >;
  removeMatchingSelector: (state: IState, props: string, ...args: any[]) => void;
  clearCache: () => void;
  cache: import("re-reselect").ICacheObject;
  keySelector: import("re-reselect").ParametricKeySelector<IState, string>;
};
/**
 * return the discovery information about a game
 *
 * @export
 * @param {*} state
 * @returns {IDiscoveryResult}
 */
declare function currentGameDiscovery(state: any): IDiscoveryResult;
declare const discoveryByGame: import("re-reselect").ParametricSelector<
  IState,
  string,
  IDiscoveryResult
> & {
  resultFunc: (
    res1: {
      [id: string]: IDiscoveryResult;
    },
    res2: string,
  ) => IDiscoveryResult;
  dependencies: [
    import("re-reselect").ParametricSelector<
      IState,
      string,
      {
        [id: string]: IDiscoveryResult;
      }
    >,
    import("re-reselect").ParametricSelector<IState, string, string>,
  ];
  recomputations: () => number;
  resetRecomputations: () => number;
} & {
  getMatchingSelector: (
    state: IState,
    props: string,
    ...args: any[]
  ) => import("re-reselect").OutputParametricSelector<
    IState,
    string,
    IDiscoveryResult,
    (
      res1: {
        [id: string]: IDiscoveryResult;
      },
      res2: string,
    ) => IDiscoveryResult,
    [
      import("re-reselect").ParametricSelector<
        IState,
        string,
        {
          [id: string]: IDiscoveryResult;
        }
      >,
      import("re-reselect").ParametricSelector<IState, string, string>,
    ]
  >;
  removeMatchingSelector: (state: IState, props: string, ...args: any[]) => void;
  clearCache: () => void;
  cache: import("re-reselect").ICacheObject;
  keySelector: import("re-reselect").ParametricKeySelector<IState, string>;
};
declare function gameName(state: any, gameId: string): string;
//#endregion
//#region lib/extensions/nexus_integration/selectors.d.ts
declare const apiKey: (state: IState) => string;
declare const userInfo: (state: IState) => IValidateKeyDataV2;
declare const isPremium: (state: IState) => boolean;
/**
 * Returns true only when we know for certain the user is not premium.
 * While userInfo is still loading, assumes premium to avoid flashing
 * "Go Premium" ads at paying customers on startup.
 * Use this for ad/banner visibility only — not for feature gating.
 */
declare const shouldShowPremiumAd: (state: IState) => boolean;
declare const isLoggedIn: (state: IState) => boolean;
declare const nexusIdsFromDownloadId: ((
  state: IState,
  downloadId: string,
) => {
  gameDomainName: string;
  fileId: string;
  modId: string;
  numericGameId: number;
  collectionSlug: string;
  collectionId: string;
  revisionId: string;
}) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {
        [id: string]: IDownload;
      },
      args_1: string,
    ) => {
      gameDomainName: string;
      fileId: string;
      modId: string;
      numericGameId: number;
      collectionSlug: string;
      collectionId: string;
      revisionId: string;
    },
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
//#endregion
//#region lib/extensions/analytics/selectors.d.ts
declare const isAnalyticsEnabled: (state: any) => boolean;
//#endregion
//#region lib/telemetry/selectors.d.ts
declare const isTelemetryEnabled: (state: IState) => boolean;
//#endregion
//#region lib/util/collectionInstallSessionSelectors.d.ts
/**
 * Get the active installation session
 * @returns The current active session or undefined if no session is active
 */
declare const getCollectionActiveSession: (state: IState) => ICollectionInstallSession | undefined;
/** Whether the active session was force-resolved by the stall watchdog (see the field doc). */
declare const isActiveSessionStalled: (state: IState) => boolean;
/**
 * Get the session ID of the last completed installation
 * @returns The last active session ID or undefined
 */
declare const getCollectionLastActiveSessionId: (state: IState) => string | undefined;
/**
 * Get the history of all completed/failed installation sessions
 * @returns Map of session IDs to session data
 */
declare const getCollectionSessionHistory: (state: IState) => {
  [sessionId: string]: ICollectionInstallSession;
};
/**
 * Get a specific session from history by ID
 * @param sessionId The session ID to retrieve
 * @returns The session or undefined if not found
 */
declare const getCollectionSessionById: (
  state: IState,
  sessionId: string,
) => ICollectionInstallSession | undefined;
/**
 * Get the last completed session from history
 * @returns The last completed session or undefined
 */
declare const getCollectionLastCompletedSession: (
  state: IState,
) => ICollectionInstallSession | undefined;
/**
 * Check if there is an active installation session
 * @returns True if a session is currently active
 */
declare const hasCollectionActiveSession: (state: IState) => boolean;
/**
 * Check if a specific collection is currently being installed
 * @param collectionId The collection ID to check
 * @returns True if the collection is being installed
 */
declare const isCollectionInstalling: (state: IState, collectionId: string) => boolean;
declare const getCollectionSessionMods: (
  state: IState,
  sessionId: string,
) =>
  | {
      [ruleId: string]: ICollectionModInstallInfo;
    }
  | undefined;
/**
 * Get all mods in the active session
 * @returns Map of rule IDs to mod installation info, or empty object if no active session
 */
declare const getCollectionActiveSessionMods: (state: IState) => {
  [ruleId: string]: ICollectionModInstallInfo;
};
/**
 * Get a specific mod from the active session by rule ID
 * @param ruleId The rule ID to retrieve
 * @returns The mod installation info or undefined if not found
 */
declare const getCollectionActiveSessionMod: (
  state: IState,
  ruleId: string,
) => ICollectionModInstallInfo | undefined;
/**
 * Search for a mod in the active collection that a download corresponds to.
 * @param lookup Canonical lookup info for the download (use lookupFromDownload)
 * @returns The mod installation info or undefined if not found
 *
 * Matches each session rule's reference with the shared testModReference matcher (the same
 * identity logic the dependency resolver uses), so there is one notion of reference identity
 * and no separate "find by modId" path: the session stores the installed Vortex mod id,
 * which is a different namespace than the Nexus ids a download carries.
 */
declare const getCollectionModByReference: (
  state: IState,
  lookup: IModLookupInfo,
) => ICollectionModInstallInfo | undefined;
/**
 * Get all mods with a specific status from the active session
 * @param status The status to filter by
 * @returns Array of mods with the specified status
 */
declare const getCollectionModsByStatus: (
  state: IState,
  status: CollectionModStatus,
) => ICollectionModInstallInfo[];
/**
 * Get all required mods from the active session
 * @returns Array of required mods
 */
declare const getCollectionRequiredMods: (state: IState) => ICollectionModInstallInfo[];
/**
 * Required members of the active session that settled as failed (terminal "failed"). Used by the
 * install-finished dialog to reword the prompt and trim its actions when the collection completed
 * WITH failures rather than cleanly - a failed required member means the collection isn't really
 * "installed", so we don't offer to install the optional mods on top of a broken required set.
 * @returns Array of failed required mods
 */
declare const getFailedRequiredMods: (state: IState) => ICollectionModInstallInfo[];
/**
 * Optional members of the active session that settled as failed. A default-skipped optional is
 * "ignored", never "failed", so this lists only optionals the user SELECTED and that then failed to
 * install. Surfaced additively in the install-finished dialog - a failed optional annotates the
 * result but does not make the collection "incomplete" the way a failed required member does.
 * @returns Array of failed optional mods
 */
declare const getFailedOptionalMods: (state: IState) => ICollectionModInstallInfo[];
/**
 * Get all optional/recommended mods from the active session
 * @returns Array of optional mods
 */
declare const getCollectionOptionalMods: (state: IState) => ICollectionModInstallInfo[];
/**
 * Get all mods grouped by phase
 * @returns Map of phase number to array of mods in that phase
 */
declare const getCollectionModsByPhase: (state: IState) => Map<number, ICollectionModInstallInfo[]>;
/**
 * Get all mods for a specific phase
 * @param phase The phase number
 * @returns Array of mods in the specified phase
 */
declare const getCollectionModsForPhase: (
  state: IState,
  phase: number,
) => ICollectionModInstallInfo[];
/**
 * Get the total number of phases in the active session
 * @returns The highest phase number, or 0 if no active session
 */
declare const getCollectionTotalPhases: (state: IState) => number;
/**
 * Get installation progress statistics for the active session
 * @returns Object with various progress metrics
 */
declare const getCollectionInstallProgress: ((state: IState) => {
  totalRequired: number;
  totalOptional: number;
  downloadedCount: number;
  installedCount: number;
  failedCount: number;
  ignoredCount: number;
  downloadProgress: number;
  installProgress: number;
  combinedProgress: number;
  isComplete: boolean;
}) &
  import("reselect").OutputSelectorFields<
    (args_0: ICollectionInstallSession) => {
      totalRequired: number;
      totalOptional: number;
      downloadedCount: number;
      installedCount: number;
      failedCount: number;
      ignoredCount: number;
      downloadProgress: number;
      installProgress: number;
      combinedProgress: number;
      isComplete: boolean;
    },
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
declare const isCollectionModPresent: ((state: IState, collectionSlug: string) => boolean) &
  import("reselect").OutputSelectorFields<
    (
      args_0: {
        [modId: string]: IMod;
      },
      args_1: {},
      args_2: string,
    ) => boolean,
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
/**
 * Get the status breakdown for all mods in the active session
 * @returns Object with counts for each status
 */
declare const getCollectionStatusBreakdown: ((
  state: IState,
  sessionId: string,
) => {
  required: {
    [status: string]: number;
  };
  optional: {
    [status: string]: number;
  };
  total: {
    [status: string]: number;
  };
}) &
  import("reselect").OutputSelectorFields<
    (args_0: { [ruleId: string]: ICollectionModInstallInfo }) => {
      required: {
        [status: string]: number;
      };
      optional: {
        [status: string]: number;
      };
      total: {
        [status: string]: number;
      };
    },
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
/**
 * Get mods that are currently in progress (downloading or installing)
 * @returns Array of mods that are actively being processed
 */
declare const getCollectionModsInProgress: (state: IState) => ICollectionModInstallInfo[];
/**
 * Get mods that are waiting to be processed
 * @returns Array of mods with 'pending' or 'downloaded' status
 */
declare const getCollectionPendingMods: (state: IState) => ICollectionModInstallInfo[];
/**
 * Get mods that have completed (successfully or not)
 * @returns Array of mods with 'installed', 'failed', or 'skipped' status
 */
declare const getCollectionCompletedMods: (state: IState) => ICollectionModInstallInfo[];
/**
 * Check if a specific phase is complete
 * @param phase The phase number to check
 * @returns True if all required mods in the phase are completed
 */
declare const isCollectionPhaseComplete: (state: IState, phase: number) => boolean;
/**
 * Check if a phase settled successfully - every required member installed or ignored.
 * On re-entry check that a failed member's retry runs at its own phase,
 * serialized before later phases. Mid-install advancement reads isCollectionPhaseComplete.
 * @param phase The phase number to check
 */
declare const isCollectionPhaseSettledSuccessfully: (state: IState, phase: number) => boolean;
/**
 * Get the current phase being processed
 * @returns The lowest phase number with incomplete mods, or -1 if all complete
 */
declare const getCollectionCurrentPhase: (state: IState) => number;
/**
 * Get detailed phase progress information
 * @returns Array of phase progress objects with stats for each phase
 */
declare const getCollectionPhaseProgress: ((state: IState) => {
  phase: number;
  total: number;
  required: number;
  optional: number;
  installed: number;
  failed: number;
  skipped: number;
  pending: number;
  progress: number;
  isComplete: boolean;
}[]) &
  import("reselect").OutputSelectorFields<
    (args_0: { [ruleId: string]: ICollectionModInstallInfo }) => {
      phase: number;
      total: number;
      required: number;
      optional: number;
      installed: number;
      failed: number;
      skipped: number;
      pending: number;
      progress: number;
      isComplete: boolean;
    }[],
    {
      clearCache: () => void;
    }
  > & {
    clearCache: () => void;
  };
//#endregion
//#region lib/selectors.d.ts
declare const mainPage: (state: IState) => string;
declare const secondaryPage: (state: IState) => string;
declare const notifications: (state: IState) => INotification[];
declare namespace selectors_d_exports {
  export {
    activatorForGame,
    activeDownloads,
    activeGameId,
    activeProfile,
    activeProfileId,
    apiKey,
    currentActivator,
    currentGame,
    currentGameDiscovery,
    discovered,
    discoveryByGame,
    downloadPath,
    downloadPathForGame,
    downloadsForActiveGame,
    downloadsForGame,
    enabledModCountForProfile,
    gameById,
    gameName,
    gameProfiles,
    getCollectionActiveSession,
    getCollectionActiveSessionMod,
    getCollectionActiveSessionMods,
    getCollectionCompletedMods,
    getCollectionCurrentPhase,
    getCollectionInstallProgress,
    getCollectionLastActiveSessionId,
    getCollectionLastCompletedSession,
    getCollectionModByReference,
    getCollectionModsByPhase,
    getCollectionModsByStatus,
    getCollectionModsForPhase,
    getCollectionModsInProgress,
    getCollectionOptionalMods,
    getCollectionPendingMods,
    getCollectionPhaseProgress,
    getCollectionRequiredMods,
    getCollectionSessionById,
    getCollectionSessionHistory,
    getCollectionSessionMods,
    getCollectionStatusBreakdown,
    getCollectionTotalPhases,
    getDownloadByIds,
    getFailedOptionalMods,
    getFailedRequiredMods,
    getMod,
    getModInstallPath,
    hasCollectionActiveSession,
    installPath,
    installPathForGame,
    isActiveSessionStalled,
    isAnalyticsEnabled,
    isCollectionInstalling,
    isCollectionModPresent,
    isCollectionPhaseComplete,
    isCollectionPhaseSettledSuccessfully,
    isLoggedIn,
    isPremium,
    isTelemetryEnabled,
    knownGames,
    lastActiveProfileForGame,
    lastActiveProfiles,
    mainPage,
    modPathsForGame,
    modsForActiveGame,
    modsForGame,
    needToDeploy,
    needToDeployForGame,
    nextProfileId,
    nexusIdsFromDownloadId,
    notifications,
    profileById,
    profiles,
    queueClearingDownloads,
    secondaryPage,
    shouldShowPremiumAd,
    userInfo,
  };
}
//#endregion
//#region lib/extensions/file_based_loadorder/views/loadOrderIndex.d.ts
interface IProps$10 {
  className?: string;
  api: IExtensionApi;
  item: ILoadOrderEntry$1;
  loadOrder: LoadOrder;
  currentPosition: number;
  lockedEntriesCount: number;
  isLocked?: (item: ILoadOrderEntry$1) => boolean;
  onApplyIndex: (idx: number) => void;
}
declare function LoadOrderIndexInput(props: IProps$10): React$1.JSX.Element;
//#endregion
//#region lib/types/IExtensionProvider.d.ts
interface IExtensibleProps {
  group?: string;
  staticElements?: any[];
  children?: ReactNode;
}
//#endregion
//#region lib/controls/ContextMenu.d.ts
interface IContextPosition {
  x: number;
  y: number;
}
interface IContextMenuProps {
  t?: TFunction$1;
  position?: IContextPosition;
  anchor?: HTMLElement;
  visible: boolean;
  onHide: () => void;
  instanceId: string;
  actions?: IActionDefinitionEx[];
  className?: string;
  onTrigger?: () => void;
  children?: React$2.ReactNode;
}
declare const _default$3: React$2.ComponentClass<IContextMenuProps>;
//#endregion
//#region lib/controls/ActionContextMenu.d.ts
type ExportType$3 = IContextMenuProps &
  IActionControlProps &
  IExtensibleProps &
  React$2.HTMLAttributes<any>;
declare class ActionContextMenu extends React$2.Component<ExportType$3> {
  private static ACTION_PROPS;
  render(): React$2.JSX.Element;
}
//#endregion
//#region lib/controls/ActionDropdown.d.ts
type ButtonType$1 = "text" | "icon" | "both" | "menu";
interface IBaseProps$11 {
  t: TFunction$1;
  className?: string;
  group?: string;
  instanceId?: string | string[];
  buttonType?: ButtonType$1;
  orientation?: "horizontal" | "vertical";
}
type ExportType$2 = IBaseProps$11 &
  IActionControlProps &
  IExtensibleProps &
  React$2.HTMLAttributes<any>;
declare const _default: React$2.ComponentClass<ExportType$2>;
//#endregion
//#region lib/controls/Advanced.d.ts
declare const _default$1: React$2.ComponentType<React$2.PropsWithChildren<{}>>;
//#endregion
//#region lib/controls/Banner.d.ts
interface IBaseProps$10 {
  group: string;
  cycleTime?: number;
}
type ExportType$1 = IBaseProps$10 & IExtensibleProps & React$2.HTMLAttributes<any> & any;
declare const _default$2: React$2.ComponentClass<ExportType$1>;
//#endregion
//#region lib/controls/Dashlet.d.ts
interface IDashletProps {
  className: string;
  title: string;
  children?: React$2.ReactNode;
}
declare class Dashlet extends React$2.Component<IDashletProps, {}> {
  render(): JSX.Element;
}
//#endregion
//#region lib/controls/DraggableList.d.ts
interface IDraggableListProps {
  disabled?: boolean;
  id: string;
  itemTypeId: string;
  items: any[];
  isLocked?: (item: any) => boolean;
  idFunc?: (item: any) => string;
  itemRenderer: React$2.ComponentType<
    React$2.PropsWithChildren<{
      item: any;
    }>
  >;
  apply: (ordered: any[]) => void;
  style?: React$2.CSSProperties;
  className?: string;
  virtualized?: boolean;
}
declare function DraggableListWrapper(props: IDraggableListProps): React$2.JSX.Element;
//#endregion
//#region lib/controls/Dropdown.d.ts
interface IBaseProps$9 {
  container?: Element;
}
type IProps$9 = IBaseProps$9 & typeof Dropdown.prototype.props;
/**
 * An enhanced dropdown that adjusts placement of the popover based on the
 * position within the container, so it doesn't get cut off (as long as the
 * popover isn't larger than half of the container)
 *
 * @class MyDropdown
 * @extends {React.Component<IProps, { up: boolean }>}
 */
declare class MyDropdown extends React$2.Component<
  IProps$9,
  {
    up: boolean;
  }
> {
  static Menu: typeof Dropdown.Menu;
  static Toggle: typeof Dropdown.Toggle;
  private mNode;
  private mOpen;
  constructor(props: IProps$9);
  componentDidMount(): void;
  render(): JSX.Element;
  private get bounds();
  private onToggle;
}
//#endregion
//#region lib/controls/DropdownButton.d.ts
interface IBaseProps$8 {
  split?: boolean;
  container?: Element;
}
type IProps$8 = IBaseProps$8 & typeof DropdownButton.prototype.props;
/**
 * An enhanced dropdown button that adjusts placement of the popover based on the
 * position within the container, so it doesn't get cut off (as long as the
 * popover isn't larger than half of the container)
 *
 * @class MyDropdownButton
 * @extends {React.Component<IProps, { up: boolean }>}
 */
declare function MyDropdownButton(props: IProps$8): React$2.JSX.Element;
//#endregion
//#region lib/controls/Dropzone.d.ts
type DropType = "urls" | "files";
interface IBaseProps$7 {
  drop: (type: DropType, paths: string[]) => void;
  accept: DropType[];
  dropText?: string;
  clickText?: string;
  icon?: string;
  clickable?: boolean;
  dialogHint?: string;
  dialogDefault?: string;
  style?: React$2.CSSProperties;
  dragOverlay?: JSX.Element;
  children?: React$2.ReactNode;
}
declare const _default$4: React$2.ComponentClass<IBaseProps$7>;
//#endregion
//#region lib/controls/EmptyPlaceholder.d.ts
interface IEmptyPlaceholderProps {
  icon: string;
  text: string;
  subtext?: string | JSX.Element;
  fill?: boolean;
}
declare class EmptyPlaceholder extends React$2.PureComponent<IEmptyPlaceholderProps, {}> {
  constructor(props: any);
  render(): JSX.Element;
}
//#endregion
//#region lib/controls/ErrorBoundary.d.ts
declare const _default$5: any;
//#endregion
//#region lib/controls/FlexLayout.d.ts
interface IFlexProps {
  fill?: boolean;
}
interface IFlexLayoutProps {
  type: "column" | "row";
  fill?: boolean;
}
type IProps$7 = IFlexLayoutProps & React$2.HTMLAttributes<HTMLDivElement>;
declare class FlexLayout extends React$2.PureComponent<IProps$7, {}> {
  static Fixed: (props: React$2.HTMLAttributes<HTMLDivElement>) => React$2.JSX.Element;
  static Flex: (props: IFlexProps & React$2.HTMLAttributes<HTMLDivElement>) => React$2.JSX.Element;
  render(): JSX.Element;
}
//#endregion
//#region lib/controls/FormFeedback.d.ts
interface IFormFeedbackProps {
  pending?: boolean;
  className?: string;
}
declare class FormFeedback extends React$2.Component<IFormFeedbackProps, {}> {
  static contextTypes: React$2.ValidationMap<any>;
  context: {
    $bs_formGroup?: {
      validationState?: string;
    };
  };
  static defaultProps: {
    bsRole: string;
  };
  render(): JSX.Element;
  private icon;
}
//#endregion
//#region lib/controls/ComponentEx.d.ts
/**
 * convenience extension for React.Component that adds support for the
 * i18n library.
 *
 * This whole module is just here to reduce the code required for "decorated"
 * components.
 *
 * @export
 * @class ComponentEx
 * @extends {(React.Component<P & II18NProps, S>)}
 * @template P
 * @template S
 */
declare class ComponentEx<P, S extends object> extends React$2.Component<
  P & Partial<WithTranslation>,
  S
> {
  static contextTypes: React$2.ValidationMap<any>;
  context: IComponentContext;
  nextState: S;
  protected initState(value: S, delayed?: boolean): void;
}
declare class PureComponentEx<P, S extends object> extends React$2.PureComponent<
  P & Partial<WithTranslation>,
  S
> {
  static contextTypes: React$2.ValidationMap<any>;
  context: IComponentContext;
  nextState: S;
  protected initState(value: S, delayed?: boolean): void;
}
//#endregion
//#region lib/controls/FormFields.d.ts
interface IFormItemProps {
  t: TFunction;
  controlId: string;
  label: string;
  placeholder?: string;
  stateKey: string;
  value: any;
  onChangeValue?: (key: string, newValue: any) => void;
  validator?: (value: string) => string;
  readOnly?: boolean;
  maxLength?: number;
  style?: React$2.CSSProperties;
}
declare class FormTextItem extends React$2.Component<IFormItemProps, {}> {
  render(): React$2.JSX.Element;
  private validationState;
  private onChangeValue;
}
declare class FormCheckboxItem extends React$2.Component<IFormItemProps, {}> {
  render(): React$2.JSX.Element;
  private onChangeValue;
}
interface IFormPathProps extends IFormItemProps {
  directory: boolean;
  extensions?: string[];
}
declare class FormPathItem extends ComponentEx<IFormPathProps, {}> {
  render(): JSX.Element;
  private validationState;
  private handleTypePath;
  private handleChangePath;
}
//#endregion
//#region lib/controls/FormInput.d.ts
interface IProps$6 {
  className?: string;
  groupClass?: string;
  style?: any;
  value: string | number;
  min?: number;
  max?: number;
  onChange: (newValue: string, id: string) => void;
  onFocus?: (focused: boolean) => void;
  id?: string;
  label?: string;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
  validate?: ValidationState | ((value: any) => ValidationState);
  debounceTimer?: number;
  clearable?: boolean;
  emptyIcon?: string;
  maxLength?: number;
}
declare const _default$6: React$2.ComponentClass<IProps$6>;
//#endregion
//#region lib/controls/IconBar.d.ts
type ButtonType = "text" | "icon" | "both" | "menu";
interface IBaseProps$6 {
  className?: string;
  group?: string;
  instanceId?: string | string[];
  tooltipPlacement?: "top" | "right" | "bottom" | "left";
  buttonType?: ButtonType;
  orientation?: "horizontal" | "vertical";
  collapse?: boolean | "force";
  groupByIcon?: boolean;
  filter?: (action: IActionDefinition) => boolean;
  icon?: string;
  pullRight?: boolean;
  clickAnywhere?: boolean;
  showAll?: boolean;
  t: TFunction$1;
}
type ExportType = IBaseProps$6 &
  IActionControlProps &
  IExtensibleProps &
  React$2.HTMLAttributes<any>;
declare const _default$7: React$2.ComponentClass<ExportType>;
//#endregion
//#region lib/controls/Image.d.ts
interface IExtraImageProps<T> extends React$2.ImgHTMLAttributes<T> {
  srcs: string[];
  circle?: boolean;
}
type IImageProps = React$2.DetailedHTMLProps<IExtraImageProps<HTMLImageElement>, HTMLImageElement>;
/**
 * image component that supports alternative images, using the first that renders
 * successfully
 */
declare function Image(props: IImageProps): JSX.Element;
//#endregion
//#region lib/controls/Modal.d.ts
declare class MyModal extends React$2.PureComponent<typeof Modal.prototype.props, {}> {
  static Header: typeof ModalHeader;
  static Title: typeof ModalTitle;
  static Body: typeof ModalBody;
  static Footer: typeof ModalFooter;
  static childContextTypes: React$2.ValidationMap<any>;
  context: Partial<IComponentContext>;
  private getContainer;
  private mMenuLayer;
  getChildContext(): any;
  render(): JSX.Element;
  private getContainerImpl;
  private setMenuLayer;
}
//#endregion
//#region lib/controls/More.d.ts
interface IMoreProps {
  id: string;
  name: string;
  wikiId?: string;
  children?: string;
  container?: Element;
  orientation?: "vertical" | "horizontal";
}
declare const _default$8: React$2.ComponentClass<IMoreProps>;
//#endregion
//#region lib/controls/Overlay.d.ts
interface IBaseProps$5 {
  triggerRef?: (ref: HTMLElement) => void;
  getBounds: () => ClientRect;
  orientation: "vertical" | "horizontal";
  shouldUpdatePosition?: boolean;
}
type IProps$5 = IBaseProps$5 & typeof Overlay.prototype.props;
/**
 * custom variant of the overlay that automatically chooses the placement
 * of the popover based on the position on the screen.
 *
 * This still uses an "orientation" of horizontal or vertical to pick the dimension
 * on which to move.
 *
 * The prop "getBounds" is used to retrieve the bounding rect used to determine the
 * placement. We can't use the container for this as the container may be a scrolling
 * control and not having to scroll to see the popover is the whole point of this.
 *
 * Right now the placement is only calculated when the popover is opened, it isn't updated
 * as a result of scrolling/resizing while the popover is open
 *
 * @class MyOverlayTrigger
 * @extends {React.Component<any, { placement: string }>}
 */
declare class MyOverlay extends React$2.Component<
  IProps$5,
  {
    placement: string;
  }
> {
  constructor(props: any);
  render(): React$2.JSX.Element;
  private onEnter;
}
//#endregion
//#region lib/controls/OverlayTrigger.d.ts
interface IBaseProps$4 {
  triggerRef?: (ref: HTMLElement) => void;
  getBounds: () => ClientRect;
  orientation: "vertical" | "horizontal";
  shouldUpdatePosition?: boolean;
}
type IProps$4 = IBaseProps$4 & typeof OverlayTrigger.prototype.props;
/**
 * custom variant of the overlay trigger that automatically chooses the placement
 * of the popover based on the position on the screen.
 *
 * This still uses an "orientation" of horizontal or vertical to pick the dimension
 * on which to move.
 *
 * The prop "getBounds" is used to retrieve the bounding rect used to determine the
 * placement. We can't use the container for this as the container may be a scrolling
 * control and not having to scroll to see the popover is the whole point of this.
 *
 * Right now the placement is only calculated when the popover is opened, it isn't updated
 * as a result of scrolling/resizing while the popover is open
 *
 * @class MyOverlayTrigger
 * @extends {React.Component<any, { placement: string }>}
 */
declare class MyOverlayTrigger extends React$2.Component<
  IProps$4,
  {
    placement: string;
  }
> {
  private mNode;
  constructor(props: any);
  componentDidMount(): void;
  render(): React$2.JSX.Element;
  private onEnter;
}
//#endregion
//#region lib/controls/PortalMenu.d.ts
interface IPortalMenuProps {
  open: boolean;
  target: Element | React$2.Component | null;
  onClick: (evt: React$2.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
  onSelect?: SelectCallback;
  useMousePosition?:
    | boolean
    | {
        x: number;
        y: number;
      };
  bsRole?: string;
  placement?: "top" | "bottom" | "left" | "right";
  children?: React$2.ReactNode;
}
declare class PortalMenu extends React$2.Component<
  IPortalMenuProps,
  {
    x: number;
    y: number;
  }
> {
  static contextTypes: React$2.ValidationMap<any>;
  context: {
    menuLayer: JSX.Element;
  };
  constructor(props: IPortalMenuProps);
  render(): React$2.JSX.Element;
  private onClick;
}
//#endregion
//#region lib/controls/ProgressBar.d.ts
interface IBaseProps$3 {
  className?: string;
  style?: React$2.CSSProperties;
  min?: number;
  max?: number;
  now: number;
  labelLeft?: string;
  labelRight?: string;
  showPercentage?: boolean;
  showTimeLeft?: boolean;
}
interface IProgressBarState {
  startTime: number;
  startPos: number;
}
/**
 * custom progress bar control, since the one from bootstrap isn't customizable
 * enough
 */
declare class ProgressBar extends React$2.PureComponent<IBaseProps$3, IProgressBarState> {
  constructor(props: IBaseProps$3);
  UNSAFE_componentWillReceiveProps(newProps: IBaseProps$3): void;
  render(): JSX.Element;
  private renderLabels;
  private renderPercentage;
  private renderTimeLeft;
}
//#endregion
//#region lib/controls/RadialProgress.d.ts
interface IBar {
  value: number;
  min: number;
  max: number;
  class: string;
}
interface IBaseProps$2 {
  data: IBar[];
  className?: string;
  innerGap?: number;
  gap?: number;
  totalRadius: number;
  offset?: number;
  maxWidth?: number;
  style?: React$2.CSSProperties;
  restOverlap?: boolean;
  spin?: boolean;
}
declare const _default$9: React$2.ComponentClass<IBaseProps$2>;
//#endregion
//#region lib/controls/SelectUpDown.d.ts
interface ISelectUpDownProps {
  container?: Element;
  className?: string;
}
interface ISelectUpDownState {
  up: boolean;
}
type IProps$3 = ISelectUpDownProps & ReactSelectProps;
declare class SelectUpDown extends React$2.Component<IProps$3, ISelectUpDownState> {
  private mNode;
  constructor(props: IProps$3);
  componentDidMount(): void;
  render(): JSX.Element;
  private get bounds();
  private onMenuOpen;
}
//#endregion
//#region lib/controls/Spinner.d.ts
interface ISpinnerProps {
  style?: React$2.CSSProperties;
  className?: string;
}
declare function Spinner(props: ISpinnerProps): React$2.JSX.Element;
//#endregion
//#region lib/controls/Step.d.ts
interface IStepProps {
  stepId: string;
  title: string;
  description: string;
  index?: number;
  state?: "done" | "current" | "future";
}
declare class Step extends React$2.Component<IStepProps, {}> {
  render(): JSX.Element;
}
//#endregion
//#region lib/controls/Steps.d.ts
interface IStepsProps {
  step: string;
}
type IProps$2 = React$2.HTMLAttributes<any> & IStepsProps;
interface ISteps extends React$2.ComponentClass<IProps$2> {
  Step: typeof Step;
}
declare const _default$10: ISteps;
//#endregion
//#region lib/controls/Table.d.ts
type ChangeDataHandler = (rowId: string, attributeId: string, newValue: any) => void;
interface ITableRowAction extends IActionDefinition {
  singleRowAction?: boolean;
  multiRowAction?: boolean;
  hotKey?: {
    code: number;
    shift?: boolean;
    alt?: boolean;
    ctrl?: boolean;
  };
  subMenus?: ITableRowAction[];
}
interface IBaseProps$1 {
  tableId: string;
  data: {
    [rowId: string]: any;
  };
  dataId?: number;
  actions: ITableRowAction[];
  columnBlacklist?: string[];
  detailsTitle?: string;
  multiSelect?: boolean;
  defaultSort?: string;
  showHeader?: boolean;
  showDetails?: boolean;
  stickyHeader?: boolean;
  edgeToEdge?: boolean;
  hasActions?: boolean;
  onChangeSelection?: (ids: string[]) => void;
  children?: React$2.ReactNode;
}
type GetSelection = OutputSelector<any, string[], (res: ITableState) => string[]>;
declare function makeGetSelection(tableId: string): GetSelection;
declare const _default$11: React$2.ComponentType<
  React$2.PropsWithChildren<IBaseProps$1 & IExtensibleProps>
>;
//#endregion
//#region lib/controls/table/DateTimeFilter.d.ts
declare class DateTimeFilterComponent extends ComponentEx<IFilterProps, {}> {
  private currentComparison;
  private currentValue;
  private comparisons;
  constructor(props: IFilterProps);
  render(): JSX.Element;
  private hasValidComparison;
  private changeFilter;
  private toggleDirection;
}
declare class DateTimeFilter implements ITableFilter {
  component: typeof DateTimeFilterComponent;
  raw: boolean;
  matches(filter: any, input: any): boolean;
  isEmpty(filter: any): boolean;
}
//#endregion
//#region lib/controls/table/NumericFilter.d.ts
declare class NumericFilterComponent extends React$2.Component<IFilterProps, {}> {
  private currentComparison;
  private currentValue;
  private comparisons;
  constructor(props: IFilterProps);
  render(): JSX.Element;
  private changeFilter;
  private toggleDirection;
}
declare class NumericFilter implements ITableFilter {
  component: typeof NumericFilterComponent;
  raw: boolean;
  matches(filter: any, input: number): boolean;
}
//#endregion
//#region lib/controls/table/OptionsFilter.d.ts
interface ISelectOption {
  value: any;
  label: string;
}
type Options = ISelectOption[];
declare class OptionsFilter implements ITableFilter {
  static EMPTY: string;
  component: React$2.ComponentClass<IFilterProps>;
  raw: boolean;
  private mMulti;
  constructor(options: Options | (() => Options), multi: boolean, raw?: boolean);
  matches(filter: any, value: any): boolean;
  isEmpty(filter: any): boolean;
}
//#endregion
//#region lib/controls/table/TextFilter.d.ts
declare class TextFilterComponent extends React$2.Component<IFilterProps, {}> {
  render(): JSX.Element;
  private changeFilter;
}
declare class TextFilter implements ITableFilter {
  component: typeof TextFilterComponent;
  raw: boolean;
  private mCaseInsensitive;
  constructor(ignoreCase: boolean);
  matches(filter: any, value: any): boolean;
}
//#endregion
//#region lib/controls/Timer.d.ts
interface ITimerProps {
  className?: string;
  started: number;
  paused?: boolean;
  duration: number;
  onTrigger?: () => void;
}
declare function Timer(props: ITimerProps): React$2.JSX.Element;
//#endregion
//#region lib/controls/Toggle.d.ts
interface IToggleProps {
  dataId?: string;
  checked: boolean;
  onToggle: (newValue: boolean, dataId?: string) => void;
  disabled?: boolean;
}
type IProps$1 = React$2.HTMLAttributes<HTMLDivElement> & IToggleProps;
declare class Toggle extends React$2.PureComponent<IProps$1, {}> {
  render(): JSX.Element;
  private onToggle;
}
//#endregion
//#region lib/controls/ToolbarIcon.d.ts
interface IToolbarIconProps {
  id?: string;
  instanceId?: string[];
  text?: string;
  placement?: "top" | "right" | "bottom" | "left";
  iconSet?: string;
  icon?: string;
  tooltip?: string;
  onClick?: (ids: string[]) => void;
  pulse?: boolean;
  spin?: boolean;
  disabled?: boolean;
  className?: string;
  stroke?: boolean;
  hollow?: boolean;
  children?: React$2.ReactNode;
}
declare class ToolbarIcon extends React$2.PureComponent<IToolbarIconProps, {}> {
  render(): JSX.Element;
  private invokeAction;
}
//#endregion
//#region lib/controls/ToolIcon.d.ts
interface IItemProps {
  name: string;
}
interface IToolIconProps {
  t?: TFunction$1;
  children?: any;
  classes?: string[];
  valid: boolean;
  isPrimary?: boolean;
  item: IItemProps;
  imageUrl: string;
  imageId?: number;
  onRun?: () => void;
}
declare const ToolIcon: (props: IToolIconProps) => React$2.JSX.Element;
declare namespace TooltipControls_d_exports {
  export {
    Button$1 as Button,
    ButtonProps,
    ClickPopover,
    ClickPopoverProps,
    IIconButtonExtraProps,
    IToggleButtonExtraProps,
    ITooltipIconProps,
    ITooltipProps,
    Icon$1 as Icon,
    IconButton,
    IconButtonProps,
    IconProps,
    NavItem$1 as NavItem,
    NavItemProps,
    ToggleButton,
    ToggleButtonProps,
  };
}
interface ITooltipProps {
  tooltip: string | React$2.ReactElement<any>;
  id?: string;
  placement?: "top" | "right" | "bottom" | "left";
  buttonType?: ButtonType;
}
type ButtonProps = ITooltipProps & typeof Button.prototype.props;
/**
 * Button with a tooltip
 *
 */
declare class Button$1 extends React$2.PureComponent<ButtonProps, {}> {
  render(): React$2.JSX.Element;
}
interface IIconButtonExtraProps {
  icon: string;
  set?: string;
  spin?: boolean;
  pulse?: boolean;
  stroke?: boolean;
  hollow?: boolean;
  border?: boolean;
  inverse?: boolean;
  flip?: "horizontal" | "vertical";
  rotate?: number;
  rotateId?: string;
  vertical?: boolean;
}
type IconButtonProps = ButtonProps & IIconButtonExtraProps;
declare class IconButton extends React$2.Component<IconButtonProps, {}> {
  render(): React$2.JSX.Element;
}
interface IToggleButtonExtraProps {
  onIcon: string;
  offIcon: string;
  offTooltip: string | React$2.Component<any, any>;
  state: boolean;
}
type ToggleButtonProps = ButtonProps & IToggleButtonExtraProps;
declare class ToggleButton extends React$2.Component<ToggleButtonProps, {}> {
  render(): React$2.JSX.Element;
}
type NavItemProps = ITooltipProps & typeof NavItem.prototype.props;
declare class NavItem$1 extends React$2.Component<NavItemProps, {}> {
  render(): React$2.JSX.Element;
}
/**
 * copied from the typings .d.ts file because this interface is not exported
 *
 * @interface FontAwesomeProps
 */
interface ITooltipIconProps {
  border?: boolean;
  className?: string;
  fixedWidth?: boolean;
  flip?: "horizontal" | "vertical";
  inverse?: boolean;
  name: string;
  set?: string;
  pulse?: boolean;
  rotate?: "90" | "180" | "270";
  rotateId?: string;
  spin?: boolean;
  stack?: string;
  stroke?: boolean;
  hollow?: boolean;
  style?: React$2.CSSProperties;
}
type IconProps = ITooltipProps & ITooltipIconProps;
/**
 * Icon with a tooltip
 *
 * @export
 * @class Icon
 */
declare class Icon$1 extends React$2.Component<IconProps, {}> {
  render(): React$2.JSX.Element;
}
type ClickPopoverProps = ButtonProps & IIconButtonExtraProps & {};
declare class ClickPopover extends React$2.Component<
  ClickPopoverProps,
  {
    open: boolean;
  }
> {
  private mRef;
  constructor(props: ClickPopoverProps);
  render(): JSX.Element;
  private toggleOverlay;
  private hideOverlay;
  private setRef;
}
//#endregion
//#region lib/controls/TriStateCheckbox.d.ts
declare const _default$12: any;
//#endregion
//#region lib/controls/Usage.d.ts
interface IUsageProps {
  infoId: string;
  persistent?: boolean;
  className?: string;
  opaque?: boolean;
  children?: React$2.ReactNode;
}
declare const _default$13: React$2.ComponentClass<IUsageProps>;
//#endregion
//#region lib/controls/VisibilityProxy.d.ts
/**
 * proxy component that delays loading of a control until it comes into view
 *
 * @class VisibilityProxy
 * @extends {React.Component<IProps, IState>}
 */
declare class VisibilityProxy extends React$2.PureComponent<any, {}> {
  private static sObservers;
  private static sInstances;
  private static getObserver;
  private static callback;
  private static observe;
  private static unobserve;
  private mLastVisible;
  private mVisibleTime;
  componentDidMount(): void;
  componentWillUnmount(): void;
  render(): JSX.Element;
}
//#endregion
//#region lib/controls/Webview.d.ts
interface IWebView extends React$2.DetailedHTMLProps<
  React$2.WebViewHTMLAttributes<HTMLWebViewElement>,
  HTMLWebViewElement
> {
  src?: string;
  style?: any;
  autosize?: boolean;
  nodeintegration?: boolean;
  plugins?: boolean;
  preload?: string;
  httpreferrer?: string;
  useragent?: string;
  disablewebsecurity?: boolean;
  partition?: string;
  webpreferences?: string;
  blinkfeatures?: string;
  disableblinkfeatures?: string;
  guestinstance?: string;
}
interface IWebviewProps {
  onLoading?: (loading: boolean) => void;
  onNewWindow?: (url: string, disposition: string) => void;
  onFullscreen?: (fullscreen: boolean) => void;
  events?: {
    [evtId: string]: (...args: any[]) => void;
  };
}
declare class WebviewEmbed extends React$2.Component<IWebviewProps & IWebView, {}> {
  private mNode;
  componentDidMount(): void;
  componentWillUnmount(): void;
  render(): JSX.Element;
  loadURL(newUrl: string): void;
  private startLoad;
  private stopLoad;
  private newWindow;
  private enterFullscreen;
  private leaveFullscreen;
  private logMessage;
}
//#endregion
//#region lib/controls/ZoomableImage.d.ts
interface IZoomableImageProps {
  className: string;
  url: string;
  container?: JSX.Element;
  overlayClass?: string;
  children?: React$2.ReactNode;
}
declare class ZoomableImage extends React$2.Component<
  IZoomableImageProps,
  {
    showOverlay: boolean;
  }
> {
  static contextTypes: React$2.ValidationMap<any>;
  context: {
    menuLayer: JSX.Element;
  };
  constructor(props: any);
  render(): JSX.Element;
  private toggleOverlay;
}
//#endregion
//#region lib/contexts/MainContext.d.ts
declare const MainContext: React$1.Context<IComponentContext>;
//#endregion
//#region lib/views/DNDContainer.d.ts
interface IDNDContainerProps {
  style?: React$1.CSSProperties;
  children?: React$1.ReactNode;
}
/**
 * This is pointless at this point and could probably be removed, moving the style
 * up to the parent, but I'll have to admit I don't understand 100% how "context" and
 * "manager" work in react-dnd and what changed in its api since we needed this.
 */
declare const DNDContainer: FC<React$1.PropsWithChildren<IDNDContainerProps>>;
//#endregion
//#region lib/views/MainPageBody.d.ts
declare const MainPageBody: React$1.ForwardRefExoticComponent<
  React$1.HTMLAttributes<HTMLDivElement> & React$1.RefAttributes<HTMLDivElement>
>;
//#endregion
//#region lib/views/MainPageHeader.d.ts
interface IProps {
  children?: ReactNode;
}
declare const MainPageHeader: FC<React$1.PropsWithChildren<IProps>>;
//#endregion
//#region lib/views/MainPage.d.ts
interface IBaseProps {
  id?: string;
  className?: string;
  domRef?: (ref: HTMLElement) => void;
  children?: React$1.ReactNode;
}
declare const MainPageInner: React$1.ForwardRefExoticComponent<
  IBaseProps & React$1.RefAttributes<HTMLDivElement>
>;
declare const MainPage: typeof MainPageInner & {
  Body: typeof MainPageBody;
  Header: typeof MainPageHeader;
};
//#endregion
export {
  ActionContextMenu,
  _default as ActionDropdown,
  _default$1 as Advanced,
  _default$2 as Banner,
  type ChangeDataHandler,
  ComponentEx,
  _default$3 as ContextMenu,
  DNDContainer,
  Dashlet,
  DraggableListWrapper as DraggableList,
  MyDropdown as Dropdown,
  MyDropdownButton as DropdownButton,
  _default$4 as Dropzone,
  EmptyPlaceholder,
  _default$5 as ErrorBoundary,
  type FileSystemErrorData,
  FlexLayout,
  FormCheckboxItem,
  FormFeedback,
  _default$6 as FormInput,
  FormPathItem,
  FormTextItem,
  type ITableRowAction,
  Icon,
  _default$7 as IconBar,
  Image,
  LoadOrderIndexInput,
  MainContext,
  MainPage,
  MyModal as Modal,
  _default$8 as More,
  OptionsFilter,
  type OsErrorData,
  MyOverlay as Overlay,
  MyOverlayTrigger as OverlayTrigger,
  PortalMenu,
  ProgressBar,
  PromiseBB as Promise,
  PureComponentEx,
  _default$9 as RadialProgress,
  SelectUpDown,
  Spinner,
  _default$10 as Steps,
  _default$11 as Table,
  DateTimeFilter as TableDateTimeFilter,
  NumericFilter as TableNumericFilter,
  TextFilter as TableTextFilter,
  Timer,
  Toggle,
  ToolIcon,
  ToolbarIcon,
  _default$12 as TriStateCheckbox,
  _default$13 as Usage,
  VisibilityProxy,
  VortexError,
  type VortexErrorData,
  type VortexErrorKind,
  type VortexErrorKindMap,
  WebviewEmbed as Webview,
  ZoomableImage,
  index_d_exports as actions,
  fs_d_exports as fs,
  log,
  makeGetSelection,
  selectors_d_exports as selectors,
  TooltipControls_d_exports as tooltip,
  api_d_exports as types,
  api_d_exports$1 as util,
};
