# Cowork on Windows: a step-by-step guide

This guide is for people who don't usually use a terminal. You'll copy and paste a few lines once, and after that you start Cowork from a right-click menu.

**What you get:** Claude works inside a folder on your PC. You talk to it from your phone or any web browser, it keeps a task list, and it has a board where you can drop files for it.

**Time needed:** about 15 minutes the first time, a few seconds after that.

---

## Before you start

You need:

- A Windows 10 or Windows 11 PC.
- A paid Claude plan: **Pro, Max, Team or Enterprise**. The free plan doesn't include Claude Code.
- Optional: the **Claude app** on your phone (App Store or Google Play), if you want to work from your phone.

Team and Enterprise users: your organization's owner has to allow "Remote Control" for Claude Code. If step 12 doesn't find your session, ask them.

---

## Part 1: One-time setup

### Step 1: Install Git for Windows

Claude Code needs this on Windows.

1. Go to **https://git-scm.com/download/win**. The download starts by itself.
2. Open the downloaded file.
3. Click **Next** on every screen, then **Install**, then **Finish**. The standard choices are fine.

### Step 2: Install Node.js

This runs the board (the task list and file drop page).

1. Go to **https://nodejs.org**.
2. Click the big button labelled **LTS**.
3. Open the downloaded file and click **Next** on every screen, then **Install**, then **Finish**.

### Step 3: Open PowerShell

PowerShell is the Windows window where you paste commands.

1. Click the **Start** button.
2. Type **PowerShell**.
3. Click **Windows PowerShell**. A window with a blue or black background opens.

> **How to paste in PowerShell:** copy the line from this page, click inside the PowerShell window, then **right-click**. The line appears. Press **Enter** to run it.

### Step 4: Install Claude Code

Paste this line into PowerShell and press **Enter**:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Wait until it says it's done, which usually takes under a minute. Then **close the PowerShell window**.

### Step 5: Sign in to Claude

1. Open PowerShell again (Step 3).
2. Type `claude` and press **Enter**.
3. It asks a few setup questions (a color theme, then how to sign in). Use the arrow keys and **Enter** to choose. Pick **Claude account with subscription**.
4. Your web browser opens. Sign in to Claude and click **Authorize**.
5. Back in PowerShell, if it asks whether you trust the folder, press **Enter** for Yes.
6. Type `/exit` and press **Enter** to leave.

### Step 6: Install Cowork

In the same PowerShell window, paste this line and press **Enter**:

```powershell
irm https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.ps1 | iex
```

You'll see a few green check marks and **Done**. **Close the PowerShell window.**

Setup is finished. You don't need to do Part 1 again.

---

## Part 2: Every time you work

### Step 7: Make a folder for the work

1. Open **File Explorer**, for example **Documents**.
2. Right-click an empty area → **New** → **Folder**.
3. Name it after the work, for example **Vendor Review**. Claude uses this name for the session.

Use one folder per project. You can go back to the same folder any time; Claude remembers what's in it.

### Step 8: Start Cowork in the folder

1. **Right-click the folder.**
2. On Windows 11, click **Show more options** first.
3. Click **Open Cowork here**.

A black window opens and shows:

```
Cowork is starting in "Vendor Review"
  Pick it up on your phone or computer: Claude app -> Code -> "Vendor Review"
  Keep this window open and the computer awake while you work.
```

If it asks **"Do you trust the files in this folder?"**, press **Enter** for Yes.

**Leave this window open.** Minimize it if you like, but don't close it: this is Claude working on your PC.

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

Finished work is saved in the folder's **outputs** folder, so you can find it in File Explorer as well.

### Step 13: When you're done

- To stop, close the black window.
- To carry on later, repeat Steps 8 and 9 with the same folder. Claude starts with a short summary of where things stand.

---

## Keep your PC awake while you're away

If the PC goes to sleep, the session pauses until it wakes up.

1. Open **Settings** → **System** → **Power & battery** (Windows 10: **Power & sleep**).
2. Under **Screen and sleep**, set **When plugged in, put my device to sleep after** to **Never**.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| `claude is not recognized` | Close PowerShell, open it again, and retry. If it still fails, repeat Step 4. |
| `Claude Code isn't installed yet` when installing Cowork | Do Steps 4 and 5 first, then Step 6 again. |
| No **Open Cowork here** in the right-click menu | On Windows 11, click **Show more options** first. Otherwise repeat Step 6. |
| The session doesn't appear in the app | Check the black window is still open and the PC is awake. Sign out of the Claude app and back in. Team/Enterprise: ask your owner to allow Remote Control. |
| The board says **waiting for Claude** | Press **Send to Claude** on the board, or type "sync the board" in the chat. |
| "Run cowork inside a folder made for the work" | You started it in your user folder. Make a folder (Step 7) and start it there. |
| Something else | Type what happened into the chat. Claude can usually explain and fix it. |

**Updating Cowork:** open PowerShell, type `cowork update`, press **Enter**.
