# FEAT-035: VS Code Extension

## 1. Intent (Required)

**User Story:**
As a developer
I want to profile data files directly from VS Code
So that I can understand data without leaving my editor

**Success Looks Like:**
Right-click a CSV file in VS Code → "Profile with DataCert" → See profile results in a VS Code panel.

## 2. Context & Constraints (Required)

**Background:**
Developers spend most time in VS Code. An extension brings DataCert into their workflow:
- Profile CSV/JSON/Parquet without opening browser
- Quick data inspection during development
- Generate validation rules and copy to clipboard
- View profiles side-by-side with code

This increases adoption by meeting users where they already work.

**Scope:**
- **In Scope:**
  - Right-click context menu on data files
  - Profile viewer in webview panel
  - Support CSV, JSON, JSONL, Parquet
  - Basic statistics display
  - Copy column stats to clipboard
  - Quick export to JSON/Markdown
  - File size limit warning (>100MB)

- **Out of Scope:**
  - Full feature parity with web app
  - SQL Mode in VS Code
  - Validation rule import
  - Remote file profiling
  - Live file watching

**Constraints:**
- Must use VS Code Webview API
- Bundle size <5MB (VS Code marketplace limit)
- WASM must work in webview context
- No external network calls

## 3. Acceptance Criteria (Required)

**Scenario: Profile from context menu**
Given a file "data.csv" is open in VS Code
When I right-click and select "Profile with DataCert"
Then a webview panel opens
And the file is profiled
And results are displayed

**Scenario: Profile from explorer**
Given I see "sales.json" in VS Code file explorer
When I right-click and select "Profile with DataCert"
Then the file is profiled in a new panel

**Scenario: Copy column stats**
Given I'm viewing a profile in VS Code
When I right-click a column and select "Copy Stats"
Then column statistics are copied as Markdown

**Scenario: Large file warning**
Given I try to profile a 200MB file
When I right-click and select "Profile with DataCert"
Then I see warning "Large file (200MB). Profiling may be slow. Continue?"

**Scenario: Quick export**
Given I'm viewing a profile
When I click "Export JSON" button
Then a save dialog opens
And profile JSON is saved to selected location

**Scenario: Command palette**
Given I have a data file open
When I open command palette and type "DataCert: Profile"
Then the current file is profiled

## 4. AI Execution Instructions (Required)

**Allowed to Change:**
- Create new `vscode-extension/` directory at repo root
- Create extension manifest `package.json`
- Create `src/extension.ts` entry point
- Create webview UI in `src/webview/`
- Reuse WASM profiling core

**Must NOT Change:**
- Web app code (`src/app/`)
- WASM code (`src/wasm/`)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- feat(vscode): scaffold VS Code extension
- feat(vscode): add context menu for data files
- feat(vscode): integrate WASM profiler in webview
- feat(vscode): add profile viewer webview
- feat(vscode): add export functionality
- feat(vscode): add command palette commands
- docs: add VS Code extension README

## 6. Verification & Definition of Done (Required)

- [ ] Extension installs from .vsix file
- [ ] Right-click context menu works on CSV/JSON/Parquet
- [ ] Profile displays in webview panel
- [ ] All basic statistics shown
- [ ] Histograms render correctly
- [ ] Export to JSON works
- [ ] Copy stats to clipboard works
- [ ] Large file warning appears
- [ ] Works on Windows, macOS, Linux

## 7. Technical Design

### Extension Structure

```
vscode-extension/
├── package.json           # Extension manifest
├── src/
│   ├── extension.ts       # Main entry point
│   ├── commands/
│   │   ├── profile.ts     # Profile command
│   │   └── export.ts      # Export commands
│   ├── providers/
│   │   └── profileView.ts # Webview provider
│   └── webview/
│       ├── index.html     # Webview HTML
│       ├── profile.tsx    # React/Solid profile viewer
│       └── wasm/          # Bundled WASM
├── media/
│   └── icon.png           # Extension icon
└── README.md
```

### Extension Manifest

```json
{
  "name": "datacert",
  "displayName": "DataCert",
  "description": "Profile data files directly in VS Code",
  "version": "0.1.0",
  "engines": { "vscode": "^1.80.0" },
  "categories": ["Data Science", "Other"],
  "activationEvents": [
    "onCommand:datacert.profile",
    "onLanguage:csv",
    "onLanguage:json"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "datacert.profile",
        "title": "Profile with DataCert"
      },
      {
        "command": "datacert.exportJson",
        "title": "Export Profile as JSON"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "when": "resourceExtname == .csv || resourceExtname == .json || resourceExtname == .parquet",
          "command": "datacert.profile",
          "group": "navigation"
        }
      ],
      "editor/context": [
        {
          "when": "resourceExtname == .csv || resourceExtname == .json",
          "command": "datacert.profile",
          "group": "navigation"
        }
      ]
    }
  }
}
```

### Webview Provider

```typescript
class ProfileViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'export':
          await this.exportProfile(message.format);
          break;
        case 'copyStats':
          await vscode.env.clipboard.writeText(message.text);
          vscode.window.showInformationMessage('Copied to clipboard');
          break;
      }
    });
  }

  async profileFile(uri: vscode.Uri) {
    const fileData = await vscode.workspace.fs.readFile(uri);
    // Send to webview for WASM processing
    this._view?.webview.postMessage({
      type: 'profile',
      filename: path.basename(uri.fsPath),
      data: fileData
    });
  }
}
```

### WASM in Webview

```typescript
// webview/profile.tsx
async function initProfiler() {
  // Load WASM from extension assets
  const wasmModule = await import('./wasm/datacert_wasm.js');
  await wasmModule.default(); // Initialize
  wasmModule.init();

  return wasmModule;
}

window.addEventListener('message', async (event) => {
  const message = event.data;
  if (message.type === 'profile') {
    const profiler = await initProfiler();
    const result = profiler.profile(message.data);
    setProfileResult(result);
  }
});
```

## 8. Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [WASM in Webviews](https://github.com/nicolo-ribaudo/vscode-wasm-webview-example)
- [VS Code Marketplace Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
