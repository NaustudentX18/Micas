# How to Run Micas — A Beginner's Guide

This guide walks you through every step needed to get Micas running, from
running it only on your own computer (completely private, completely free) all
the way to putting it online privately and eventually giving it a real domain
name.  No coding experience required.

---

## Choose Your Path

| What I want | Best option |
|-------------|-------------|
| Run it only on my own laptop / PC — completely private | **Part 1** |
| Access it from any device but keep it password-protected | **Part 2** |
| Share it publicly with a proper web address | **Part 3** |

---

## Part 1 — Run It on Your Own Computer (100% Private, 100% Free)

This is the fastest way to get started.  Nothing leaves your machine.

### Step 1 — Download the files

1. Go to the repository page on GitHub
   (e.g. `https://github.com/NaustudentX18/Micas`).
2. Click the green **Code** button → **Download ZIP**.
3. Unzip the file somewhere you'll remember
   (e.g. `Downloads/Micas` or `Documents/Micas`).

### Step 2 — Install Python (if you don't already have it)

Python ships a tiny built-in web server — perfect for this.

**Windows**

1. Open the Microsoft Store, search for **Python 3**, install it (free).
2. Or download the installer from [python.org/downloads](https://www.python.org/downloads/) and run it.
   ✅ Tick **"Add Python to PATH"** during install.

**Mac**

Python 3 is usually already installed.  Open **Terminal** (press
`⌘ Space`, type *Terminal*, press Enter) and type:

```
python3 --version
```

If you see a version number you're done.  If not, download from
[python.org/downloads](https://www.python.org/downloads/).

**Linux**

Run in a terminal:

```bash
sudo apt install python3   # Debian / Ubuntu
# or
sudo dnf install python3   # Fedora
```

### Step 3 — Start the server

1. Open a **Terminal** (Mac/Linux) or **Command Prompt** / **PowerShell**
   (Windows).

2. Navigate to the Micas folder.
   Replace the path below with wherever you unzipped the files:

   **Mac / Linux**
   ```bash
   cd ~/Downloads/Micas
   ```

   **Windows**
   ```cmd
   cd C:\Users\YourName\Downloads\Micas
   ```

3. Start the server:
   ```bash
   python3 -m http.server 8080
   ```
   On Windows you may need to use `python` instead of `python3`.

4. You'll see a message like:
   ```
   Serving HTTP on 0.0.0.0 port 8080 ...
   ```
   Leave this window open while you're using the app.

### Step 4 — Open the app

Open your browser and go to:

```
http://localhost:8080
```

That's it — Micas is running, completely offline and private. 🎉

### Stopping the server

When you're done, click back into the terminal window and press
**Ctrl + C** to stop.

### Next time

Just repeat Step 3 and Step 4 — you don't need to reinstall anything.

---

## Part 2 — Put It Online (Private, Free, Accessible from Any Device)

This option lets you open Micas on your phone, tablet, or any computer, but
**only you** (or people you specifically invite) can access it.

We'll use two free tools:

- **Cloudflare Pages** — hosts the files for free.
- **Cloudflare Access** — acts as a "bouncer" that asks for an email
  verification before anyone can view the site.  Up to 50 users are free.

### Step 1 — Put the code on GitHub

Cloudflare deploys directly from GitHub, so you need your files there first.

1. Create a free account at [github.com](https://github.com) if you don't
   have one.
2. Click the **+** in the top-right corner → **New repository**.
3. Name it `micas` (or anything you like), set it to **Private**, click
   **Create repository**.
4. On the next page, click **uploading an existing file**.
5. Drag all the files from your unzipped Micas folder into the upload area
   (select everything inside the folder — do **not** upload the folder itself,
   upload its *contents*).
6. Click **Commit changes**.

> **Tip:** A private GitHub repository means no one can browse your source
> code either.

### Step 2 — Create a Cloudflare account

1. Go to [cloudflare.com](https://www.cloudflare.com) and sign up for free.
2. You don't need to buy anything or enter a credit card.

### Step 3 — Deploy with Cloudflare Pages

1. From the Cloudflare dashboard, click **Workers & Pages** in the left
   sidebar.
2. Click **Create** → **Pages** tab → **Connect to Git**.
3. Click **Connect GitHub** and authorize Cloudflare to read your repositories.
4. Select your `micas` repository and click **Begin setup**.
5. On the build settings page:
   - **Framework preset** — leave as *None*
   - **Build command** — leave **empty**
   - **Build output directory** — type `/` (a single forward slash)
6. Click **Save and Deploy**.

Cloudflare will give your site a URL like
`https://micas-abc123.pages.dev`.  Anyone who knows that URL can currently
reach it, so move straight to Step 4.

### Step 4 — Lock it down with Cloudflare Access

This is the "private" part — it puts a login screen in front of your site.

1. In the Cloudflare dashboard left sidebar, click **Zero Trust**.
   (It may ask you to choose a team name — pick anything, e.g. `myhome`.)
2. Click **Access** → **Applications** → **Add an application**.
3. Choose **Self-hosted**.
4. Fill in the form:
   - **Application name** — `Micas` (or anything)
   - **Session duration** — `24 hours` (so you don't have to log in every
     time)
   - **Application domain** — paste your `*.pages.dev` URL, e.g.
     `micas-abc123.pages.dev`
5. Click **Next**.
6. On the **Policies** page, click **Add a policy**:
   - **Policy name** — `My Access`
   - **Action** — `Allow`
   - Under **Configure rules** → **Selector**, choose **Emails**
   - In the **Value** box, type your email address (and any other emails you
     want to allow)
7. Click **Save policy**, then **Add application**.

Now when you (or anyone) visits your `pages.dev` URL, Cloudflare will ask for
an email address.  Only addresses you listed will receive the one-time code
— everyone else gets an "Access denied" page.

### Checking it works

1. Open a private / incognito browser window.
2. Go to your `pages.dev` URL.
3. You should see a Cloudflare login screen — enter your email, receive the
   code, paste it in.
4. You're in! 🎉

### Updating the app in the future

Whenever the Micas source code is updated:

1. Go to your GitHub repository.
2. Click **Add file** → **Upload files**.
3. Upload the changed files and commit.
4. Cloudflare Pages automatically detects the change and re-deploys in
   about 30 seconds — no extra steps needed.

---

## Part 3 — Go Public with a Real Domain (When You're Ready)

When you decide you want a proper address like `myapp.com`, here's the path:

### Option A — Keep using Cloudflare Pages (recommended)

1. Buy a domain from any registrar (e.g. Namecheap, Porkbun, Google Domains).
2. In the Cloudflare dashboard → **Workers & Pages** → your project →
   **Custom domains** → **Set up a custom domain**.
3. Follow the instructions — Cloudflare will guide you through pointing your
   domain's DNS to Pages.
4. If you want to keep the site private, leave your Access policy in place.
   If you want it public, simply delete the Access application you created
   in Part 2, Step 4.

### Option B — Use Netlify

The repository already contains a `netlify.toml` configuration file, so
Netlify works out-of-the-box:

1. Sign up at [netlify.com](https://netlify.com) (free tier available).
2. Click **Add new site** → **Import an existing project** → connect GitHub →
   select your repo.
3. Leave all build settings blank (no build command, publish directory is `.`).
4. Click **Deploy**.
5. When you're ready for a custom domain, go to **Site settings** →
   **Domain management** → **Add a domain**.

> **Note:** Netlify's password-protection ("Site protection") requires a paid
> plan.  If you want private access on Netlify, use the Cloudflare Access
> approach from Part 2 (point your Netlify domain through Cloudflare).

---

## Frequently Asked Questions

**Do I need to pay for anything in Parts 1 or 2?**
No.  Python is free, GitHub (private repositories) is free, Cloudflare Pages
is free, and Cloudflare Access is free for up to 50 users.

**Can I use the app on my phone while running it locally (Part 1)?**
Yes, but only if your phone is on the same Wi-Fi network.  Find your
computer's local IP address (e.g. `192.168.1.42`) and open
`http://192.168.1.42:8080` on your phone.

**My browser says "site can't be reached" after I close the terminal.**
That's expected — the local server stops when you close the terminal.
Re-run `python3 -m http.server 8080` to start it again.

**The app looks outdated after I upload new files to GitHub.**
The app uses a service worker for offline caching.  In Chrome / Edge / Safari,
open the browser's developer tools (F12), go to **Application → Service
Workers**, and click **Update** or **Unregister**, then reload the page.

**I want to stop the online site entirely.**
In Cloudflare, go to **Workers & Pages** → your project → **Settings** →
scroll to the bottom → **Delete project**.

---

*That's everything!  If something doesn't work as described, open an issue on
the GitHub repository and paste the error message you see.*
