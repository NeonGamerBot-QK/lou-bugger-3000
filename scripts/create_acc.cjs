/**
 * Creates a Hack Club Slack account, then creates a Slack app to obtain an xoxp token.
 * Usage: node create_acc.cjs <email>
 */

const puppeteer = require("puppeteer");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// Load the manifest file
const manifestPath = path.join(__dirname, "manifest.json");
const manifestContent = fs.readFileSync(manifestPath, "utf8");

const email = process.argv[2];
if (!email) {
  throw new Error("No email provided. Usage: node create_acc.cjs <email>");
}

/**
 * Prompts the user for input via stdin.
 * @param {string} question - The prompt to display.
 * @returns {Promise<string>} The user's input.
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Sleeps for a given number of milliseconds.
 * @param {number} ms - Milliseconds to sleep.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main function that orchestrates account creation and Slack app setup.
 */
async function main() {
  console.log(`Creating account with email ${email}`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Step 1: Create Hack Club account or log in
    await page.goto("https://account.hackclub.com", {
      waitUntil: "networkidle2",
    });
    await page.type('input[type="email"]', email);
    // await clearEmail(email);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Fill identity form if it's a new account
    const codeInput = await page.$("#code-input-code");
    if (!codeInput) {
      const firstNames = ["Zeon", "ZeonAlt", "ZeonBot", "ZeonUser", "ZeonDev"];
      const lastNames = [
        "Smith",
        "Johnson",
        "Williams",
        "Brown",
        "Jones",
        "Garcia",
        "Miller",
        "Davis",
      ];
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
      const birthday = `${month}${day}2010`;

      console.log(`Using identity: ${firstName} ${lastName}, DOB: ${birthday}`);
      await page.type("#identity_first_name", firstName);
      await page.type("#identity_last_name", lastName);
      await page.type("#identity_birthday", birthday);
      await page.click('input[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle2" });
    }

    // Enter OTP from user
    const otp = await prompt("Enter OTP from email: ");
    await page.type("#code-input-code", otp);
    await page.click('input[type="submit"]');

    try {
      await page.waitForNavigation({ timeout: 10000 });
    } catch (_) {
      console.log("Navigation took too long");
    }

    // Click primary buttons if present
    try {
      const primaryBtn = await page.$(".c-button--primary");
      if (primaryBtn) await primaryBtn.click();
    } catch (_) {
      console.log("No button to press");
    }

    // Navigate to Slack
    try {
      await page.goto("https://hackclub.slack.com", { waitUntil: "load" });
    } catch (_) {
      console.log("Network idle took too long");
    }

    try {
      const primaryBtn = await page.$(".c-button--primary");
      if (primaryBtn) await primaryBtn.click();
    } catch (_) {
      console.log("No button to press");
    }

    try {
      await page.waitForNavigation({ waitUntil: "load" });
      await sleep(1000);
    } catch (_) {
      console.log("Loading took too long");
    }

    // Accept TOS if present
    try {
      if (page.url().includes("/tos")) {
        const primaryBtn = await page.$(".c-button--primary");
        if (primaryBtn) await primaryBtn.click();
      }
    } catch (_) {
      console.log("No TOS button");
    }

    // Wait for Slack client to load
    await page.waitForFunction(
      '!!document.querySelector("div.p-client_container")',
      { timeout: 30000 },
    );
    await sleep(1000);

    // Skip onboarding steps
    const welcomeNext = await page.$('[data-qa="setup_page_welcome_next"]');
    if (welcomeNext) await welcomeNext.click();
    await sleep(1000);

    const peopleSkip = await page.$('[data-qa="setup_page_people_skip"]');
    if (peopleSkip) await peopleSkip.click();

    await page.waitForFunction(
      '!!document.querySelector("div.p-top_nav__search__container")',
      { timeout: 30000 },
    );
    console.log("Slack loaded");

    // Accept code of conduct if present
    try {
      await sleep(3000);
      const cocBtn = await page.$('[data-qa-action-id="coc_continue"]');
      if (cocBtn) {
        await cocBtn.click();
        await page.waitForFunction(
          "!!document.querySelector('[data-qa-action-id=\"tutorial_agree\"]')",
          { timeout: 10000 },
        );
        const agreeBtn = await page.$('[data-qa-action-id="tutorial_agree"]');
        if (agreeBtn) await agreeBtn.click();
        await sleep(3000);
      }
    } catch (_) {
      console.log("No code of conduct to accept");
    }

    // Get session cookies
    const cookies = await page.cookies("https://app.slack.com");
    const xoxd = cookies.find((c) => c.name === "d")?.value;
    const xoxc = await page.evaluate(() => {
      const localConfig = JSON.parse(localStorage.getItem("localConfig_v2"));
      return localConfig?.teams?.E09V59WQY1E?.token;
    });

    console.log("=== Session Tokens Obtained ===");
    console.log("xoxc:", xoxc);
    console.log("xoxd:", xoxd);

    // Step 2: Create a Slack app to get xoxp token
    let xoxp = null;
    try {
      console.log("Creating Slack app to obtain xoxp token...");

      await page.goto("https://api.slack.com/apps", {
        waitUntil: "networkidle2",
      });
      await sleep(2000);

      // Click "Create New App"
      await page.click('[data-qa="create_app_button"]').catch(async () => {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button, a"));
          const createBtn = buttons.find(
            (b) =>
              b.textContent.includes("Create New App") ||
              b.textContent.includes("Create an App"),
          );
          if (createBtn) createBtn.click();
        });
      });
      await sleep(1000);

      // Click "From an app manifest"
      await page.click('[data-qa="initial_manifest_button"]');
      await sleep(1000);

      // Open workspace dropdown and select first option with Enter
      await page.click('[data-qa="team_picker-button"]');
      await sleep(500);
      await page.keyboard.press("Enter");
      await sleep(1000);

      // Click Next/Go
      await page.click('[data-qa="new_app_modal_go"]');
      await sleep(2000);

      // Type manifest content into the tabs content container
      const tabsContainer = await page.$(
        '[data-qa="tabs_content_container"] textarea, [data-qa="tabs_content_container"] [contenteditable="true"]',
      );
      if (tabsContainer) {
        await tabsContainer.click();
        await page.keyboard.down("Control");
        await page.keyboard.press("a");
        await page.keyboard.up("Control");
        await page.keyboard.press("Backspace");
        await tabsContainer.type(manifestContent);
      } else {
        // Fallback: find any textarea in the container
        const textarea = await page.$("textarea");
        if (textarea) {
          await textarea.click();
          await page.keyboard.down("Control");
          await page.keyboard.press("a");
          await page.keyboard.up("Control");
          await page.keyboard.press("Backspace");
          await textarea.type(manifestContent);
        }
      }
      await sleep(1000);

      // Click Next/Go
      await page.click('[data-qa="new_app_modal_go"]');
      await sleep(2000);

      // Click Create (final go button)
      await page.click('[data-qa="new_app_modal_go"]');
      await page
        .waitForNavigation({ waitUntil: "networkidle2" })
        .catch(() => {});
      await sleep(2000);

      // Navigate to OAuth & Permissions
      console.log("Current URL:", page.url());
      console.log("Waiting before clicking OAuth page...");
      await sleep(2000);

      const oauthPageExists = await page.$('[data-qa="oauth_page"]');
      console.log("OAuth page selector exists:", !!oauthPageExists);

      if (oauthPageExists) {
        console.log('Clicking [data-qa="oauth_page"]...');
        await page.click('[data-qa="oauth_page"]');
      } else {
        console.log("Fallback: searching for OAuth link by text...");
        const clicked = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll("a"));
          const oauthLink = links.find(
            (l) => l.textContent.includes("OAuth") || l.href?.includes("oauth"),
          );
          if (oauthLink) {
            console.log("Found OAuth link:", oauthLink.textContent);
            oauthLink.click();
            return true;
          }
          return false;
        });
        console.log("Fallback click result:", clicked);
      }
      await page
        .waitForNavigation({ waitUntil: "networkidle2" })
        .catch(() => {});
      await sleep(1000);

      // Get "Install to Hack Club" href and navigate directly (avoids new tab)
      console.log("Looking for Install to Hack Club button...");
      const installHref = await page.evaluate(() => {
        // Try finding by the span content first
        const span = Array.from(
          document.querySelectorAll("a.c-button--primary span.content"),
        ).find((s) => s.textContent.includes("Install to Hack Club"));
        if (span) {
          return span.closest("a").href;
        }
        // Fallback to any a tag with the text
        const links = Array.from(document.querySelectorAll("a"));
        const installLink = links.find((a) =>
          a.textContent.includes("Install to Hack Club"),
        );
        if (installLink) {
          return installLink.href;
        }
        return null;
      });
      console.log("Install button href:", installHref);
      if (installHref) {
        await page.goto(installHref, { waitUntil: "networkidle2" });
      }
      await sleep(4000);
      // move down
      await page.mouse.wheel({ deltaY: 1000 });
      // Click the OAuth submit/allow button
      await page.click('[data-qa="oauth_submit_button"]');
      await page
        .waitForNavigation({ waitUntil: "networkidle2" })
        .catch(() => {});
      await sleep(2000);

      // Get the tokens from the OAuth page
      const xoxb = await page.evaluate(() => {
        const el = document.getElementById("oauth_access_token_workspace");
        return el?.value || el?.textContent?.trim() || null;
      });

      xoxp = await page.evaluate(() => {
        const el = document.getElementById("bot_oauth_access_token_workspace");
        return el?.value || el?.textContent?.trim() || null;
      });

      console.log("=== Tokens Obtained ===");
      console.log("xoxb:", xoxb);
      console.log("xoxp:", xoxp);

      // Append tokens to tokens.txt (comma-formatted)
      const tokensLine = `,${xoxb || "NO_XOXB"},${xoxp || "NO_XOXP"}`;
      fs.appendFileSync(path.join(__dirname, "..", "tokens.txt"), tokensLine);
      console.log("Tokens appended to tokens.txt");
    } catch (appError) {
      console.error(
        "Error during app creation (browser kept open):",
        appError.message,
      );
      console.log("You can manually complete the app creation in the browser.");
    }

    console.log("\n=== Account Created ===");
    console.log("Email:", email);
    console.log("xoxc:", xoxc);
    console.log("xoxd:", xoxd);
    console.log("\nTo sign in manually:");
    console.log(
      `document.cookie = "d=${xoxd}; Domain=.slack.com"; location.href = "https://hackclub.slack.com"`,
    );

    // Keep browser open if there was an error or no xoxp
    if (!xoxp) {
      console.log(
        "\nBrowser kept open for manual intervention. Press Ctrl+C to exit.",
      );
      await new Promise(() => {}); // Wait indefinitely
    }
  } catch (error) {
    console.error(
      "Error during account creation (browser kept open):",
      error.message,
    );
    console.log(
      "Browser kept open for manual intervention. Press Ctrl+C to exit.",
    );
    await new Promise(() => {}); // Wait indefinitely
  }
}

main().catch(console.error);
