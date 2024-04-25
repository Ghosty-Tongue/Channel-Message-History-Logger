import fs from 'fs';
import path from 'path';
import { FluxDispatcher, ChannelStore } from "@webpack/common";
import definePlugin from "@utils/types";

let messageLogs = {};

function logMessage(channelId, message) {
    if (!messageLogs[channelId]) {
        messageLogs[channelId] = [];
    }
    messageLogs[channelId].push(message);
}

function saveMessageLogs() {
    for (const channelId in messageLogs) {
        const channelName = ChannelStore.getChannel(channelId)?.name || 'unknown_channel';
        const serverName = ChannelStore.getChannel(channelId)?.guild_id || 'unknown_server';
        const folderPath = path.join('message_logs', serverName);
        const filePath = path.join(folderPath, `${channelName}.json`);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        let existingLogs = [];
        if (fs.existsSync(filePath)) {
            try {
                existingLogs = JSON.parse(fs.readFileSync(filePath));
            } catch (error) {
                console.error(`Error reading existing logs for ${channelName}:`, error);
            }
        }

        const updatedLogs = [...existingLogs, ...messageLogs[channelId]];

        fs.writeFile(filePath, JSON.stringify(updatedLogs), (err) => {
            if (err) {
                console.error(`Error saving message log for ${channelName}:`, err);
            } else {
                console.log(`Message log for ${channelName} saved successfully`);
            }
        });
    }
}

const interceptMessages = () => {
    FluxDispatcher.subscribe('MESSAGE_CREATE', (data) => {
        const { message } = data;
        logMessage(message.channel_id, message);
    });
};

const logMessageHistory = async () => {
    const channels = ChannelStore.getChannels();
    for (const channel of channels) {
        const history = await ChannelStore.getChannelHistory(channel.id);
        history.forEach(message => logMessage(channel.id, message));
    }
};

export default definePlugin({
    name: "Channel Message Logger",
    description: "Logs all messages sent in all accessible channels and stores them in JSON files organized by server and channel names.",

    authors: [{
        name: "GhostyTongue",
    }],

    start() {
        logMessageHistory();
        interceptMessages();
    },

    stop() {
        saveMessageLogs();
    }
});
