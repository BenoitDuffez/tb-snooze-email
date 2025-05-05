getAlarmName = (snooze) => `snooze_${snooze.setDate}`;

// When the "Set Reminder" button is clicked
browser.messageDisplayAction.onClicked.addListener(async (tab) => {
    const email = await browser.messageDisplay.getDisplayedMessage(tab.id);
    const fullMessage = await browser.messages.getFull(email.id);
    let headerMessageId = fullMessage.headers["message-id"]?.[0];
    if (!headerMessageId) {
        console.error("No headerMessageId found for message", fullMessage);
        return;
    }
    headerMessageId = headerMessageId.replace(/^</g, "").replace(/>$/, "");
    let url = `popup.html?id=` + btoa(headerMessageId) + `&author=` + btoa(email.author) + `&subject=` + btoa(email.subject);
    browser.windows.create({url: url, type: "popup", width: 400, height: 250});
});

// Handle messages from the popup to set reminders
browser.runtime.onMessage.addListener(async (snooze) => {
    if (snooze.dueDate) {
        const alarmName = getAlarmName(snooze);
        await browser.storage.local.set({[alarmName]: snooze});
        await browser.alarms.create(alarmName, {when: snooze.dueDate});
    }
});

// Handle alarm
browser.alarms.onAlarm.addListener(async (alarm) => {
    let storage = await browser.storage.local.get();
    const snooze = storage[alarm.name];
    if (snooze) {
        const setDateStr = new Date(snooze.setDate).toLocaleString();
        await browser.notifications.create(alarm.name, {
            type: "basic",
            title: `Reminder — ${snooze.subject}`,
            message: `Reply to ${snooze.author} (reminder set on ${setDateStr})`,
        });
    }
});

// Listen for notification clicks
browser.notifications.onClicked.addListener(async (name) => {
    let storage = await browser.storage.local.get();
    console.log(`Notification clicked: ${name}`, storage);
    let snooze = storage[name];
    snooze.clicked = true;
    await browser.storage.local.set({[name]: snooze});
    await browser.messageDisplay.open({headerMessageId: snooze.id, location: "window"});
});

// Restore alarms from storage on startup
(async () => {
    console.log("Restoring snoozed email alarms")
    const storage = await browser.storage.local.get();
    const now = Date.now();
    for (const [alarmName, snooze] of Object.entries(storage)) {
        if (snooze.dueDate) {
            if (snooze.dueDate > now) {
                console.log(`Restoring ${alarmName} for ${new Date(snooze.dueDate).toLocaleString()}`);
                browser.alarms.create(alarmName, {when: snooze.dueDate});
            } else if (snooze.clicked === true) {
                console.log(`Alarm ${alarmName} was for ${new Date(snooze.dueDate).toLocaleString()}, but was clicked - discard`);
                await browser.storage.local.remove(alarmName);
            } else {
                console.log(`Alarm ${alarmName} was for ${new Date(snooze.dueDate).toLocaleString()}, trigger in 5s`);
                browser.alarms.create(alarmName, {when: now + 5000});
            }
        }
    }
})();