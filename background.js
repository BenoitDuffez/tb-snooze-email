getAlarmName = (message) => `reminder_${message.messageId}_${message.setDate}`;

// When the "Set Reminder" button is clicked
browser.messageDisplayAction.onClicked.addListener(async (tab) => {
    const email = await browser.messageDisplay.getDisplayedMessage(tab.id);
    const data = btoa(JSON.stringify(email));
    browser.windows.create({url: `popup.html?data=${data}`, type: "popup", width: 400, height: 250});
});

// Handle messages from the popup to set reminders
browser.runtime.onMessage.addListener((message) => {
    if (message.type === "setReminder") {
        const alarmName = getAlarmName(message);
        browser.storage.local.set({[alarmName]: message});
        browser.alarms.create(alarmName, {when: message.dueDate});
    }
});

// Handle alarm
browser.alarms.onAlarm.addListener((alarm) => {
    browser.storage.local.get(alarm.name, (result) => {
        const reminder = result[alarm.name];
        if (reminder) {
            const setDateStr = new Date(reminder.setDate).toLocaleString();
            browser.notifications.create(alarm.name, {
                type: "basic",
                title: `Reminder — ${reminder.subject}`,
                message: `Reply to  ${reminder.author} (reminder set on ${setDateStr})`,
            });
        }
    });
});

// Listen for notification clicks
browser.notifications.onClicked.addListener(async (name) => {
    browser.storage.local.get(name, (result) => browser.messageDisplay.open({
        messageId: result[name].id,
        location: "window"
    }));
});
