# Deploying cowork-cli for a non-technical person: instructions for AI assistants

You are an AI assistant (Claude, ChatGPT, Gemini, Copilot, or a coding agent such as Claude Code or Codex). A person has asked you to help them set up **cowork-cli** on their computer. Assume they have never used a terminal and find it intimidating. Your job is to get them from nothing to a working setup, one small step at a time, without them ever having to understand what a command does.

Read this whole file before your first reply. Then follow it.

---

## What they're setting up (so you can explain it simply)

cowork-cli turns a folder on their computer into a workspace where Claude does real work: it keeps their task list, reads files they drop in, and saves finished documents back into the folder. They talk to it from the **Claude app on their phone** or from **claude.ai/code** in a browser, while it runs on their own computer.

In one sentence for them: *"Claude will work inside a folder on your computer, and you'll chat with it from your phone or browser."*

The whole setup is:

1. Install Claude Code (Anthropic's app that lets Claude work on a computer).
2. Sign in to it with their Claude account.
3. Install Cowork (one pasted line).
4. Make a folder and start Cowork in it.
5. Open the session on their phone or at claude.ai/code.

After setup, starting work is: **right-click a folder → Open Cowork here** (Windows) or **right-click → Services → New Terminal at Folder, then type `cowork`** (Mac).

---

## Rules for how you guide them

1. **One step per message.** Give a single action, say what they should see when it worked, then ask them to reply "done" or describe or screenshot what they see. Never send the next step until they confirm.
2. **Plain words only.** Say "the black window" or "the PowerShell window", not "shell" or "CLI". Say "paste this line", not "run this command". Never explain flags, PATH, environment variables or how anything works unless they ask.
3. **Every command goes in its own code block**, exactly as written in this file, so they can copy it with one click. Never ask them to edit a command or type one from memory.
4. **Explain how to paste every time** for the first two commands (Windows PowerShell: right-click inside the window; Mac Terminal: ⌘ + V), then press Enter / Return.
5. **Reassure without overdoing it.** One line the first time: *"This window looks technical, but you'll only paste lines I give you. You can't break anything by pasting these."*
6. **Check before moving on.** Ask what the window says. If it isn't what's expected, use the troubleshooting table below before trying anything else.
7. **Stay on the listed commands and links.** Only use the commands and web addresses in this file. Don't improvise alternatives, package managers (Homebrew, winget, Chocolatey, npm global installs), admin/root rights, or security changes (no disabling antivirus, no changing execution policy system-wide, no `sudo`).
8. **Never ask for passwords, API keys or codes.** If a sign-in page opens, they sign in themselves in their browser. If they paste a secret into the chat, tell them to delete that message and not to share it again.
9. **Use screenshots when they offer them.** Read what's on screen and answer from that.
10. **If you can't open web links**, ask them to open https://github.com/krakenjack/cowork-cli/blob/main/DEPLOY-WITH-AN-AGENT.md and paste its text to you.

### If you are an agent running on their computer (Claude Code, Codex, Cursor and the like)

You can run the checks and installs yourself instead of asking them to paste. Still:

- Tell them in one plain sentence what you're about to do, and ask before each install.
- Claude Code must already be installed if you *are* Claude Code: skip Step 3 and check sign-in with them.
- Don't start the Cowork session yourself inside your own session (it's an interactive program that has to run in its own window). For Step 8, have them do it from the folder's right-click menu (Windows) or give them the exact Mac steps.
- Don't change anything outside what this file lists.

---

## Step 0: Find out what they have

Ask, in one message:

- Is it a **Windows PC** or a **Mac**? (If they aren't sure: "Does your keyboard have a ⌘ Command key? Then it's a Mac.")
- Do they have a **paid Claude plan** (Pro, Max, Team or Enterprise)? The free plan can't run Claude Code. If they don't, stop here and tell them they'll need to upgrade at claude.ai first.
- Would they like to use it from their **phone**? If yes, they should install the **Claude** app from the App Store or Google Play (they can do it while you continue).

Team or Enterprise plan: tell them their organization's owner may need to allow "Remote Control" for Claude Code (at claude.ai/admin-settings/claude-code). It's only a problem if Step 9 doesn't find their session.

Then follow the Windows or Mac path.

---

## Windows path

**Step W1: Install Git for Windows.** Claude Code needs it on Windows.
Have them open https://git-scm.com/download/win (the download starts by itself), open the file, and click **Next** on every screen, then **Install** and **Finish**. The default choices are right.

**Step W2: Install Node.js.** It powers the board (task list and file drop page).
Have them open https://nodejs.org, click the **LTS** button, open the file, and click **Next** through to **Install** and **Finish**.

**Step W3: Open PowerShell.**
Click **Start**, type **PowerShell**, click **Windows PowerShell**. Tell them how to paste (right-click inside the window) and to press Enter after pasting.

**Step W4: Install Claude Code.** Give them:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Expected: after up to a minute it reports that Claude Code was installed. Then they **close PowerShell** and open it again (Step W3).

**Step W5: Sign in.** Give them:

```powershell
claude
```

It asks a few questions. Tell them: use the arrow keys and Enter; any color theme is fine; for sign-in choose **Claude account with subscription**. A browser page opens: sign in and click **Authorize**. If asked whether to trust the folder, press Enter (Yes). When they see the Claude prompt, have them type `/exit` and press Enter.

**Step W6: Install Cowork.** Give them:

```powershell
irm https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.ps1 | iex
```

Expected: green check marks, then **Done**. Then they **close PowerShell**. Tell them this is the last time they need to paste anything.

**Step W7: Make a folder.** In File Explorer (for example in Documents): right-click → **New** → **Folder**, named after the work (for example "Vendor Review"). One folder per project.

**Step W8: Start Cowork.** Right-click the new folder → (Windows 11: **Show more options**) → **Open Cowork here**. A black window opens saying `Cowork is starting in "<folder name>"`. If it asks whether to trust the folder, press Enter. Tell them to **leave this window open** (minimizing is fine): it is Claude working on their PC.

Go to **Step 9**.

---

## Mac path

**Step M1: Open Terminal.**
Press **⌘ + Space**, type **Terminal**, press **Return**. Tell them how to paste (⌘ + V) and to press Return after pasting.

**Step M2: Install Claude Code.** Give them:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Expected: after up to a minute it reports that Claude Code was installed. Then they quit Terminal (⌘ + Q).

**Step M3: Install Node.js.** It powers the board.
Have them open https://nodejs.org, click **LTS**, choose the **macOS Installer (.pkg)** if asked, open it and click **Continue** through to **Install** (their Mac password may be asked: that's the Mac asking, which is fine).

**Step M4: Sign in.** Open Terminal again (Step M1) and give them:

```bash
claude
```

Arrow keys and Return to choose; any theme; sign in with **Claude account with subscription**; a browser page opens: sign in and click **Authorize**. Trust the folder if asked (Return). Then type `/exit` and press Return.

**Step M5: Install Cowork.** Give them:

```bash
curl -fsSL https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.sh | bash
```

Expected: check marks, then **Done**. Then they quit Terminal (⌘ + Q).

**Step M6: Add "New Terminal at Folder" to the right-click menu.**
**System Settings** → **Keyboard** → **Keyboard Shortcuts…** → **Services** → **Files and Folders** → tick **New Terminal at Folder** → **Done**.

**Step M7: Make a folder.** In Finder (for example in Documents): **⌘ + Shift + N**, named after the work (for example "Vendor Review").

**Step M8: Start Cowork.** Right-click (or Control-click) the folder → **Services** → **New Terminal at Folder**. In the window that opens, type:

```bash
cowork
```

and press Return. It says `Cowork is starting in "<folder name>"`. If it asks whether to trust the folder, press Return. Tell them to **leave this window open** (⌘ + M minimizes it).

Go to **Step 9**.

---

## Step 9: Pick up the session

- **Phone:** Claude app → menu → **Code** → the session with their folder's name.
- **Computer:** https://claude.ai/code → the session with their folder's name.

The first time, Claude greets them there and asks what to call them and what the folder is for. Tell them to just answer; Claude then opens **the board** next to the chat.

## Step 10: Show them the board and how to start next time

Explain in a few lines:

- **Tasks:** tick off, add, delete.
- **Inbox:** drag files onto it; Claude asks them to confirm once in the chat, then saves the files into the folder.
- **Outputs:** everything Claude makes. Click a name to view it.
- **Message Claude:** send an instruction from the board.
- If something shows "waiting for Claude", press **Send to Claude**.

Next time: Windows, right-click the folder → **Open Cowork here**; Mac, right-click → **Services** → **New Terminal at Folder**, type `cowork`. Then open the session on the phone or at claude.ai/code.

## Step 11: Keep the computer awake

The session pauses while the computer sleeps.

- **Windows:** Settings → System → Power & battery (Windows 10: Power & sleep) → *When plugged in, put my device to sleep after* → **Never**.
- **Mac laptop:** System Settings → Battery → Options… → **Prevent automatic sleeping on power adapter when the display is off**.
- **Mac desktop:** System Settings → Energy → **Prevent automatic sleeping when the display is off**.

Finish by pointing them to the step-by-step guides for later reference: [Windows](docs/getting-started-windows.md), [Mac](docs/getting-started-macos.md).

---

## Troubleshooting (use this before improvising)

| They see | Cause | Tell them |
|---|---|---|
| `claude is not recognized` / `command not found: claude` | The window was open before Claude Code was installed | Close the window, open it again, retry. Still failing: redo the Claude Code install step. |
| `command not found: cowork` or `cowork is not recognized` | Same | Close and reopen the window. Still failing: redo the Cowork install step. |
| `Claude Code isn't installed yet` (from the Cowork installer) | Steps done out of order | Do the Claude Code install and sign-in steps, then the Cowork step again. |
| `Couldn't install the plugin` | Not signed in | Do the sign-in step, then the Cowork step again. |
| Windows: `running scripts is disabled on this system` | PowerShell policy on a managed PC | Use the right-click **Open Cowork here** entry instead of typing `cowork`. If the installer itself was blocked, the PC is managed by their IT team: stop and suggest they ask IT. |
| Windows: Git warning, or Claude Code complains about Git | Git for Windows missing | Do Step W1, then close and reopen PowerShell. |
| No **Open Cowork here** in the menu | Windows 11 hides it | Click **Show more options** first. Otherwise redo Step W6. |
| Mac: no **New Terminal at Folder** | Service not enabled | Redo Step M6. It can also appear under **Quick Actions**. |
| Session not in the Claude app | Window closed, computer asleep, or Remote Control blocked by their organization | Check the black window is open and the computer awake; sign out of the app and back in; Team/Enterprise: ask their owner to allow Remote Control. |
| "Run cowork inside a folder made for the work" | Started in their home folder | Make a folder (Step W7 / M7) and start there. |
| Anything about a "paid plan" or "subscription" when signing in | Free plan | They need Pro, Max, Team or Enterprise. |
| Something not in this table | | Ask for a screenshot or the exact text, and read the step-by-step guide for their system before suggesting anything. Don't guess commands. |

---

## Reference

- Repository: https://github.com/krakenjack/cowork-cli
- Step-by-step guides: [docs/getting-started-windows.md](docs/getting-started-windows.md), [docs/getting-started-macos.md](docs/getting-started-macos.md)
- Claude Code setup (official): https://code.claude.com/docs/en/setup
- Updating later: in a PowerShell or Terminal window, type `cowork update`.
