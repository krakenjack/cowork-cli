# Cowork on a Mac: a step-by-step guide

This guide is for people who don't usually use a terminal. You'll copy and paste a few lines once, and after that you start Cowork from a folder's right-click menu with one word.

**What you get:** Claude works inside a folder on your Mac. You talk to it from your phone or any web browser, it keeps a task list, and it has a board where you can drop files for it.

**Time needed:** about 15 minutes the first time, a few seconds after that.

---

## Before you start

You need:

- A Mac running a recent macOS (13 Ventura or later).
- A paid Claude plan: **Pro, Max, Team or Enterprise**. The free plan doesn't include Claude Code.
- Optional: the **Claude app** on your phone (App Store or Google Play), if you want to work from your phone.

Team and Enterprise users: your organization's owner has to allow "Remote Control" for Claude Code. If step 12 doesn't find your session, ask them.

---

## Part 1: One-time setup

### Step 1: Open Terminal

Terminal is the Mac window where you paste commands.

1. Press **Command (⌘) + Space** to open Spotlight.
2. Type **Terminal** and press **Return**. A white or black window opens.

> **How to paste in Terminal:** copy the line from this page, click inside the Terminal window, press **⌘ + V**, then **Return** to run it.

### Step 2: Install Claude Code

Paste this line into Terminal and press **Return**:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Wait until it says it's done, which usually takes under a minute. Then quit Terminal (**⌘ + Q**).

### Step 3: Install Node.js

This runs the board (the task list and file drop page).

1. Go to **https://nodejs.org**.
2. Click the big button labelled **LTS**. On the next page, pick the **macOS Installer (.pkg)** if it asks.
3. Open the downloaded file and click **Continue** on every screen, then **Install**. Enter your Mac password if asked.

### Step 4: Sign in to Claude

1. Open Terminal again (Step 1).
2. Type `claude` and press **Return**.
3. It asks a few setup questions (a color theme, then how to sign in). Use the arrow keys and **Return** to choose. Pick **Claude account with subscription**.
4. Your web browser opens. Sign in to Claude and click **Authorize**.
5. Back in Terminal, if it asks whether you trust the folder, press **Return** for Yes.
6. Type `/exit` and press **Return** to leave.

### Step 5: Install Cowork

In the same Terminal window, paste this line and press **Return**:

```bash
curl -fsSL https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.sh | bash
```

You'll see a few check marks and **Done**. Quit Terminal (**⌘ + Q**).

### Step 6: Turn on "New Terminal at Folder"

This adds an entry to the right-click menu of folders, so you never have to type folder paths.

1. Open **System Settings** (Apple menu  → System Settings).
2. Click **Keyboard** in the sidebar.
3. Click **Keyboard Shortcuts…**.
4. Click **Services** in the list on the left.
5. Open **Files and Folders** and tick **New Terminal at Folder**.
6. Click **Done**.

Setup is finished. You don't need to do Part 1 again.

---

## Part 2: Every time you work

### Step 7: Make a folder for the work

1. Open **Finder**, for example your **Documents** folder.
2. Press **⌘ + Shift + N** (or right-click → **New Folder**).
3. Name it after the work, for example **Vendor Review**. Claude uses this name for the session.

Use one folder per project. You can go back to the same folder any time; Claude remembers what's in it.

### Step 8: Start Cowork in the folder

1. **Right-click the folder** (or hold **Control** and click it).
2. Choose **Services** → **New Terminal at Folder**. A Terminal window opens in that folder.
3. Type `cowork` and press **Return**.

You'll see:

```
Cowork is starting in "Vendor Review"
  Pick it up on your phone or computer: Claude app → Code → "Vendor Review"
  Keep this window open and the computer awake while you work.
```

If it asks **"Do you trust the files in this folder?"**, press **Return** for Yes.

**Leave this window open.** Minimize it (**⌘ + M**) if you like, but don't quit it: this is Claude working on your Mac.

### Step 9: Pick up the session on your phone or in a browser

- **Phone:** open the **Claude** app → tap the menu → **Code** → tap **Vendor Review** (your folder's name).
- **Computer:** go to **https://claude.ai/code** and click **Vendor Review** in the list.

### Step 10: Answer the welcome questions (first time only)

The first time you use a folder, Claude asks:

- what to call you,
- what the folder is for,
- anything it should always check with you first (for example, "ask before emailing anyone").

Answer in a sentence or two. Claude then opens **the board** next to the chat.

### Step 11: Use the board

| On the board | What it does |
|---|---|
| **Tasks** | Tick tasks off, add new ones, delete old ones. |
| **Inbox** | Drag files onto it (or click it to choose files). Claude asks you to confirm once in the chat, then saves them into the folder's **inbox** folder. |
| **Outputs** | Everything Claude makes for you. Click a name to view it; **Open** asks Claude to send it to you. |
| **Message Claude** | Type an instruction and send it straight to the chat. |

If a change shows **waiting for Claude**, press **Send to Claude** at the top of the board.

### Step 12: Ask for things

Type in the chat as you would to a colleague, for example:

- "Compare the three quotes in my inbox and make me a table."
- "Add a task to call the venue on Friday."
- "Write a one-page summary I can send to my manager."

Finished work is saved in the folder's **outputs** folder, so you can find it in Finder as well.

### Step 13: When you're done

- To stop, click the Terminal window and quit it (**⌘ + Q**), or type `/exit`.
- To carry on later, repeat Steps 8 and 9 with the same folder. Claude starts with a short summary of where things stand.

---

## Keep your Mac awake while you're away

If the Mac goes to sleep, the session pauses until it wakes up.

- **MacBook:** **System Settings** → **Battery** → **Options…** → turn on **Prevent automatic sleeping on power adapter when the display is off**, and keep it plugged in.
- **Desktop Mac (iMac, Mac mini, Mac Studio):** **System Settings** → **Energy** → turn on **Prevent automatic sleeping when the display is off**.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| `command not found: claude` | Quit Terminal, open it again, and retry. If it still fails, repeat Step 2. |
| `command not found: cowork` | Quit Terminal (**⌘ + Q**) and open it again. If it still fails, repeat Step 5. |
| `Claude Code isn't installed yet` when installing Cowork | Do Steps 2 and 4 first, then Step 5 again. |
| No **New Terminal at Folder** in the right-click menu | Repeat Step 6. It can also appear under **Quick Actions** or at the bottom of the menu. |
| The session doesn't appear in the app | Check the Terminal window is still open and the Mac is awake. Sign out of the Claude app and back in. Team/Enterprise: ask your owner to allow Remote Control. |
| The board says **waiting for Claude** | Press **Send to Claude** on the board, or type "sync the board" in the chat. |
| "Run cowork inside a folder made for the work" | You started it in your home folder. Make a folder (Step 7) and start it there. |
| Something else | Type what happened into the chat. Claude can usually explain and fix it. |

**Updating Cowork:** open Terminal, type `cowork update`, press **Return**.
