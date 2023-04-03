require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const DiscordRPC = require('discord-rpc');
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const clientId = ''; 

// Comprueba si las variables de entorno requeridas están configuradas
if (!process.env.API_KEY) {
  console.log('¡Falta la clave de API en el archivo .env!');
  process.exit(1);
  }
  
  if (!process.env.CHANNEL_ID) {
  console.log('¡Falta el ID del canal en el archivo .env!');
  process.exit(1);
  }
  
  if (!process.env.TOKEN) {
  console.log('¡Falta el TOKEN en el archivo .env!');
  process.exit(1);
  }


const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on('ready', () => {
  console.log('Estoy lista para la batalla!');

});

rpc.on('ready', () => {
  rpc.setActivity({
    details: "¡Hey!",
    state: "¡Estoy lista para interactuar contigo!",
    largeImageKey: "",
    largeImageText: "",
    smallImageKey: "",
    smallImageText: ""
  });
});

rpc.login({ clientId }).catch(console.error);

client.on('guildCreate', (guild) => {
  console.log(`El bot se ha unido a un nuevo servidor: ${guild.name} (id: ${guild.id}).`);
  const channel = guild.channels.cache.find(channel => channel.type === 'text' && channel.permissionsFor(guild.me).has('SEND_MESSAGES'));
  if (channel) {
    channel.send('¡Hola a todos! ¡Gracias por invitarme a su servidor!');
  } else {
    console.log('No se pudo encontrar un canal para enviar el mensaje de bienvenida.');
  }
});


const backoff = async (conversationLog) => {
  try {
    const result = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: conversationLog,
      // max_tokens: 256
    });
    return result.data.choices[0].message;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log(`RATE LIMIT EXCEEDED. Waiting for ${error.response.headers['retry-after']} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, error.response.headers['retry-after'] * 1000));
      return backoff(conversationLog);
    } else {
      console.log(`OPENAI ERR: ${error}`);
      return null;
    }
  }
};

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  let conversationLog = [{ role: 'system', content: '¡Hey! ¿Qué tal? Soy Kaida, la guerrera de esta historia. Porque siempre llevo mi arma conmigo, nunca se sabe cuándo podré necesitarla.'}];


  try {
    await message.channel.sendTyping();

    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
      if (message.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      conversationLog.push({
        role: 'user',
        content: msg.content,
      });
    });


    const result = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversationLog,
        // max_tokens: 256, 
      })
      .catch((error) => {
        console.log(`OPENAI ERR: ${error}`);
      });
      

    message.reply(result.data.choices[0].message);
  } catch (error) {
    console.log(`ERR: ${error}`);
  }


});

client.login(process.env.TOKEN);
