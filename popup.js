document.getElementById("save").addEventListener("click", async () => {
    try {
        // Get message params from URL
        let urlSearchParams = new URLSearchParams(window.location.search);
        const reminder = {
            id: atob(urlSearchParams.get("id")),
            author: atob(urlSearchParams.get("author")),
            subject: atob(urlSearchParams.get("subject")),
            type: "setReminder",
            setDate: Date.now(),
            dueDate: Date.now() + parseDelay(document.getElementById("delay").value),
        };

        window.close();
        await browser.runtime.sendMessage(reminder);
    } catch (error) {
        alert(error.message);
    }
});

document.addEventListener("keydown", (event) => event.key === "Escape" ? window.close() : 69);

function parseDelay(input) {
    if (input.trim().length === 0) {
        return parseDelay('5d');
    }

    const match = input.match(/^(\d+)\s*([wdhms])$/);
    if (!match) {
        throw new Error("Invalid delay format. Use e.g., '2w', '5d', '2h', '30m'");
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case "w":
            return value * 7 * 24 * 60 * 60 * 1000; // Weeks
        case "d":
            return value * 24 * 60 * 60 * 1000; // Days
        case "h":
            return value * 60 * 60 * 1000;      // Hours
        case "m":
            return value * 60 * 1000;           // Minutes
        case "s":
            return value * 1000;
        default:
            throw new Error("Unknown unit");
    }
}
