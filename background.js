getAlarmName = (snooze) => `snooze_${snooze.id}_${snooze.setDate}`;

// When the "Set Reminder" button is clicked
browser.messageDisplayAction.onClicked.addListener(async (tab) => {
    const email = await browser.messageDisplay.getDisplayedMessage(tab.id);
    const data = {
        id: email.id,
        subject: email.subject,
        author: email.author,
    };
    browser.windows.create({
        url: `popup.html?data=` + btoa(JSON.stringify(data)),
        type: "popup",
        width: 400,
        height: 250
    });
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
    await browser.storage.local.remove(name);
    await browser.messageDisplay.open({messageId: storage[name].id, location: "window"});
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
            } else {
                console.log(`Alarm ${alarmName} was for ${new Date(snooze.dueDate).toLocaleString()}, trigger in 5s`);
                browser.alarms.create(alarmName, {when: now + 5000});
            }
        }
    }
})();