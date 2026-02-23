The main area shows two panes (**Left** and **Right**). Each pane displays the variables of the loaded group. When both panes are loaded, you can see added, removed, and modified variables.

## Toolbar

Use the toolbar to:
- **Sync scroll** between panes
- **Swap** left and right
- **Refresh** both panes
- **Unload** a pane

## In the table

- Use **Copy to Left** / **Copy to Right** to move values between sides.
- Toggle secret masking and add or delete variables as needed.

## Color legend

The comparison view uses these colors to show the status of each variable:

| Color | Meaning |
| ----- | ------- |
| <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#22c55e;vertical-align:middle;margin-right:8px" aria-hidden="true"></span> **Green** | **Added** — variable is new or present on only one side. |
| <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#ef4444;vertical-align:middle;margin-right:8px" aria-hidden="true"></span> **Red** | **Deleted** — variable has been removed (staged for deletion). |
| <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#eab308;vertical-align:middle;margin-right:8px" aria-hidden="true"></span> **Amber** | **Edited** — you have changed this variable’s value or key locally. |
| <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#3b82f6;vertical-align:middle;margin-right:8px" aria-hidden="true"></span> **Blue** | **Renamed** — the variable key was renamed. |
| <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#ec4899;vertical-align:middle;margin-right:8px" aria-hidden="true"></span> **Fuchsia (magenta)** | **Modified** — the same key has different values on each side. |
| <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#64748b;vertical-align:middle;margin-right:8px" aria-hidden="true"></span> **Slate / dimmed** | **Identical** — same key and value on both sides. |

The stats bar under each pane header shows counts for only here, modified, and identical.

## Saving changes

When you are done editing, use **Review & Push** to stage your changes and push them to Azure DevOps. You can also **Discard** all local changes if you want to reset.
