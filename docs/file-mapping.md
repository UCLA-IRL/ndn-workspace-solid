# File Mapping

File mapping allows the user to map the workspace to a folder on the disk,
and then compile / edit using a text editor.

## Step

- Make sure you are using Chrome or Edge 119+. Firefox and Safari do not support required API.
- On the LaTeX page, click `Map to a folder` in the menu
- Select a folder. Empty folder is recommended as local changes will be discarded.
- Click `yes` to allow the app to write to the selected folder.
- Now the browser will start syncing the workspace and the folder.
  - Remote updates will be write to the disk folder upon receiption.
  - Local updates will be processed and propagated in about 1.5s **after you save the file**.
  - Note that real time collaboration is **NOT** supported in the text editor.
    Some content will be lost when there is a conflict. (VSCode will warn you at that time)
    If you cannot make sure that only you are editing one file, please go back to the browser app.
  - Only files existing in the workspace will be synced.
    If you need to create a new file, please use the browser app.
- To stop syncing, navigate to any page other than `LaTeX`.

## Mechanism

- Keep the handle of the directory the user selected.
- Scan that folder every 1.5s.
  - When there is an update to a text file, use JS `diff` to capture the deltas and apply to the YDoc.
  - When there is an update to a blob file, wrap the local version into a segmented object and publish.
  - On the other hand, if the YDoc version is newer, write is back to the disk.
  - This function uses a mutex to avoid race conditions.
- Listen to all YDoc updates. Call the callback above when there is an update.
