const { Client, Intents, Collection, Interaction } = require("discord.js");
const client = new Client({ intents: 32767 });
const fs = require("fs");
const { prefix, token, mongo_url } = require("./config.json");
const { DiscordTogether } = require("discord-together");
client.discordTogether = new DiscordTogether(client);
const mongoose = require("mongoose");
const { Module } = require("module");
const { exec } = require("child_process");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
module.exports = client;
client.commands = new Collection();
client.slashcommands = new Collection();

//몽고디비 연결코드
mongoose.connect(mongo_url,{}).then(console.log("MongoDB 데이터베이스에 연결했습니다"));

let slashcommands = [];
const slashcommandsFile = fs
  .readdirSync("./slashcommands")
  .filter((file) => file.endsWith(".js"));
for (const file of slashcommandsFile) {
  const slashcommand = require(`./slashcommands/${file}`);
  client.slashcommands.set(slashcommand.name, slashcommand);
  slashcommands.push({ name: slashcommand.name, description: slashcommand.description });
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const slashcommand = client.slashcommands.get(interaction.commandName);
  if (!slashcommand) return;
  try {
    await slashcommand.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply(
      new discord.MessageEmbed()
        .setTitle("오류가 발생했습니다")
        .setDescription("오류가 발생하였습니다.신속한 조치 취하도록 하겠습니다")
    );
  }
});

//상메지정,console.log 준비메세지 코드
client.once("ready", () => {
  let number = 0;
  setInterval(() => {
    const list = [`${client.guilds.cache.size}개의 서버에서 일`];
    if (number == list.length) number = 0;
    client.user.setActivity(list[number], {
      type: "PLAYING",
    });
    number++;
  }, 5000);
  console.log("봇이 준비되었습니다");
  const rest = new REST({ version: "9" }).setToken(token);

  rest
    .put(Routes.applicationCommands(`${client.user.id}`), { body: slashcommands })
    .then(() => console.log("Command Pushed on all servers"))
    .catch(console.error);
});

//커맨드 핸들러2(접두사 핸들링)
client.on("messageCreate", (message) => {
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift();
  const command = client.commands.get(commandName);
  if (!command) return;
  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
  }
});

//커맨드파일 위치 정의 코드2
const commandsFile = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandsFile) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}
