# Notifications & Dialogs Reference

Source: `Vortex/src/renderer/src/types/INotification.ts`, `IDialog.ts`, `IExtensionContext.ts`

---

## `api.sendNotification(notification)`

Shows a notification in the Vortex notification bar. Returns the notification ID.

```typescript
sendNotification(notification: INotification): string;
```

### INotification

```typescript
interface INotification {
  id?: string;
  type: NotificationType;
  message: string;
  title?: string;
  icon?: string;
  progress?: number;
  displayMS?: number;
  noDismiss?: boolean;
  noToast?: boolean;
  allowSuppress?: boolean;
  group?: string;
  actions?: INotificationAction[];
  onDismiss?: () => void;
  replace?: { [key: string]: any };
  localize?: { title?: boolean; message?: boolean };
  createdTime?: number;
  updatedTime?: number;
  process?: string;
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | No | Auto-generated if omitted. Use a fixed ID to update/replace an existing notification |
| `type` | `NotificationType` | Yes | See below |
| `message` | `string` | Yes | Main notification text |
| `title` | `string` | No | Keep to 1-2 words |
| `icon` | `string` | No | Path to icon image |
| `progress` | `number` | No | 0-100, shows a progress indicator |
| `displayMS` | `number` | No | Auto-dismiss after N milliseconds |
| `noDismiss` | `boolean` | No | Hides the dismiss button |
| `noToast` | `boolean` | No | Suppress toast even if `displayMS` is set |
| `allowSuppress` | `boolean` | No | Lets the user suppress future occurrences |
| `group` | `string` | No | Groups related notifications together |
| `actions` | `INotificationAction[]` | No | Buttons shown on the notification |
| `onDismiss` | `() => void` | No | Callback when notification is dismissed |
| `replace` | `{ [key: string]: any }` | No | i18n substitution parameters |
| `localize` | `{ title?: boolean; message?: boolean }` | No | Control which fields get translated (default: both `true`) |

### NotificationType

```typescript
type NotificationType =
  | 'activity'
  | 'global'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'silent';
```

| Value | Description |
| --- | --- |
| `'activity'` | Spinner icon -- use for ongoing operations |
| `'success'` | Green -- operation completed |
| `'info'` | Neutral information |
| `'warning'` | Yellow -- something needs attention |
| `'error'` | Red -- something went wrong |
| `'global'` | Always visible; shown as system notification if window is unfocused |
| `'silent'` | No visual, logged only |

### INotificationAction

```typescript
interface INotificationAction {
  title?: string;
  icon?: string;
  action: (dismiss: NotificationDismiss) => void;
}

type NotificationDismiss = () => void;
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | `string` | No | Button label |
| `icon` | `string` | No | Button icon |
| `action` | `(dismiss: () => void) => void` | Yes | Callback; call `dismiss()` to close the notification |

### Example

```js
const nid = api.sendNotification({
  id: 'my-install-progress',
  type: 'activity',
  title: 'Installing',
  message: 'Downloading required tools...',
  noDismiss: true,
});

// later, dismiss it:
api.dismissNotification(nid);
```

---

## `api.showDialog(type, title, content, actions, id?)`

Shows a modal dialog. Returns a promise that resolves with the button the user clicked and any input values.

```typescript
showDialog(
  type: DialogType,
  title: string,
  content: IDialogContent,
  actions: DialogActions,
  id?: string,
): PromiseBB<IDialogResult>;
```

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | `DialogType` | Yes | `'success'`, `'info'`, `'error'`, `'question'` |
| `title` | `string` | Yes | Dialog title |
| `content` | `IDialogContent` | Yes | Body content -- see below |
| `actions` | `IDialogAction[]` | Yes | Buttons shown at the bottom |
| `id` | `string` | No | Stable ID; prevents duplicate dialogs |

### DialogType

```typescript
type DialogType = 'success' | 'info' | 'error' | 'question';
```

### IDialogContent

```typescript
interface IDialogContent {
  text?: string;
  message?: string;
  htmlFile?: string;
  htmlText?: string;
  bbcode?: string;
  md?: string;
  checkboxes?: ICheckbox[];
  choices?: ICheckbox[];
  input?: IInput[];
  links?: ILink[];
  parameters?: Record<string, string | number> & { count?: number };
  options?: {
    translated?: boolean;
    wrap?: boolean;
    hideMessage?: boolean;
    linksAsButtons?: boolean;
    order?: DialogContentItem[];
    bbcodeContext?: IBBCodeContext;
  };
  condition?: (content: IDialogContent) => IConditionResult[];
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `text` | `string` | Plain text -- wrapped, not selectable |
| `message` | `string` | Scrollable, selectable text |
| `htmlText` | `string` | Raw HTML -- inserted directly into DOM |
| `bbcode` | `string` | BBCode formatted content |
| `md` | `string` | Markdown formatted content |
| `checkboxes` | `ICheckbox[]` | Checkbox controls |
| `choices` | `ICheckbox[]` | Radio-style choices (same shape as checkboxes) |
| `input` | `IInput[]` | Text/password/number/etc. input fields |
| `links` | `ILink[]` | Clickable links (or buttons via `options.linksAsButtons`) |
| `parameters` | `Record<string, string \| number>` | i18n substitution |
| `options` | see above | Display options |
| `condition` | `(content) => IConditionResult[]` | Dynamically disable actions based on input state |

### IDialogAction / DialogActions

```typescript
type DialogActions = IDialogAction[];

interface IDialogAction {
  label: string;
  default?: boolean;
  action?: (label: string) => void;
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `label` | `string` | Yes | Button text -- also the key in `IDialogResult.action` |
| `default` | `boolean` | No | Pre-selects this button (Enter key) |
| `action` | `(label: string) => void` | No | Inline callback instead of using the returned promise |

### ICheckbox

```typescript
interface ICheckbox extends IControlBase {
  text?: string;
  bbcode?: string;
  value: boolean;
  disabled?: boolean;
  subText?: string;
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Yes | (from IControlBase) Used to read value from result |
| `text` | `string` | No | Label |
| `value` | `boolean` | Yes | Initial checked state |
| `disabled` | `boolean` | No | |
| `subText` | `string` | No | Secondary label |

### IInput

```typescript
interface IInput extends IControlBase {
  type?: 'text' | 'password' | 'number' | 'date' | 'time' | 'email' | 'url' | 'multiline';
  value?: string;
  label?: string;
  placeholder?: string;
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Yes | (from IControlBase) Used to read value from result |
| `label` | `string` | No | Field label |
| `value` | `string` | No | Initial value |
| `placeholder` | `string` | No | |
| `type` | `string` | No | `'text'` (default), `'password'`, `'number'`, `'date'`, `'time'`, `'email'`, `'url'`, `'multiline'` |

### ILink

```typescript
interface ILink {
  label: string;
  id?: string;
  action?: (dismiss: () => void, id: string) => void;
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `label` | `string` | Yes | Link text |
| `id` | `string` | No | |
| `action` | `(dismiss, id) => void` | No | Click handler |

### IDialogResult

```typescript
interface IDialogResult {
  action: string;
  input: any;
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `action` | `string` | Label of the button the user clicked |
| `input` | `any` | Map of control `id` -> value for checkboxes/inputs |

### condition (dynamic action disabling)

The `condition` field is called on every content change. Return an array of `IConditionResult` to disable buttons:

```typescript
interface IConditionResult {
  id: string;        // control ID that triggered this
  actions: string[]; // action labels to disable
  errorText: string; // reason shown to the user
}
```

### Example

```js
const result = await api.showDialog('question', 'Confirm Install', {
  text: 'Install the required tool?',
  checkboxes: [
    { id: 'remember', text: "Don't ask again", value: false },
  ],
}, [
  { label: 'Cancel' },
  { label: 'Install', default: true },
]);

if (result.action === 'Install') {
  const dontAsk = result.input['remember'];
  // proceed...
}
```

---

## Related Functions

### `api.dismissNotification(id)`

Closes a notification by ID.

```typescript
dismissNotification(id: string): void;
```

### `api.showErrorNotification(message, detail, options?)`

Convenience wrapper that opens an error dialog directly from an Error object or string.

```typescript
showErrorNotification(
  message: string,
  detail: string | Error | any,
  options?: IErrorOptions,
): void;
```

### `api.closeDialog(id, actionKey?, input?)`

Programmatically closes a dialog as if the user clicked a button.

```typescript
closeDialog(id: string, actionKey?: string, input?: any): void;
```
