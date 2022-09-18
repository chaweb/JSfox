const { SlashCommandBuilder, Routes, EmbedBuilder } = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');

const { REST } = require('@discordjs/rest');
const { clientId, guildId, token, voteChanel} = require('./cle.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });


const { createLogger, format, transports } = require('winston');
const logger = createLogger({
    level: 'info',
    exitOnError: false,
    format: format.json(),
    transports: [
      new transports.File({ filename: `./logs/log.log` }),
    ],
  });


async function addVote(description, choices, time,compteur, user, channel) {
    logger.info(`new vote : ${description} 
    par ${user.username} 
    fini le ${time.day} / ${time.mouth} à ${time.hour}:${time.min} 
    à pour choix ${choice}`)

    let Fields = []
    choices.forEach(choice => {
        c = choice.replace(/^(\s)/g, '')
        emoji = c.match(/\p{Emoji}+/gu)
        c = c.replace(emoji[0], '')
        Fields.push({name : emoji[0], value: c, inline: true})
    })
    
    const voteEmbed = new EmbedBuilder()
	.setColor(0xffcb21)
	.setTitle("nouveau vote ! \n"+ description)
	.setAuthor(
        { 
            name: user.username, 
            iconURL: user.displayAvatarURL({ format: 'png', size:512})
        }
    )
	Fields.forEach(entry => {
        voteEmbed.addFields(entry)
    })
	voteEmbed.addFields(
        { 
            name: `fin le ${time.day} / ${time.mouth}`, 
            value: `à ${time.hour}:${time.min}` 
        }
    )
    msg = await channel.send({ embeds: [voteEmbed] })
    
    Fields.forEach(elem => {
        msg.react(elem.name)
    });
    emojis = ''
    setTimeout(async () => {
        await channel.messages.fetch()

        await Fields.forEach(async (elem) => {
            msgTemp = `\n\n ${elem.name} ${elem.value} : ${msg.reactions.cache.get(elem.name).count}`
            emojis += msgTemp
        });

        msg.reply(`fin du sondage. \nresultat : ${emojis}`)
    },compteur).catch(r => logger.error)
}




const commands = [
    new SlashCommandBuilder()
        .setName('vote')
        .setDescription('ajouter un vote')
        .addStringOption(option =>
            option.setName('description')
                .setDescription('met une description')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('choix')
                .setDescription(':emoji1: choix1; :emojie2: choix2; :emojie3: choix3; ect...')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('fin')
                .setDescription('mm:hh jj/mm')
                .setRequired(true)
        )
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.channel.id != voteChanel) {
        await interaction.reply(
            { content: `vous devez aller dans <#${voteChanel}> pour créer un vote`, 
            ephemeral: true }
        ); 
        return
    }
    const { commandName } = interaction;
    const options = interaction.options

    if (commandName === 'vote') {
        
        const description = options.getString('description')


        if(!options.getString('choix').includes(";")){
            await interaction.reply(
                { content: `vous devez avoir 2 choix ou plus pour créer un vote.`, 
                ephemeral: true }
            ); 
            return
        }
        const choices = options.getString('choix').split(";")
        
        regex= /(\d{2}):(\d{2})\s(\d{2})\/(\d{2})/g
        optionsEnd = options.getString('fin')

        if(optionsEnd.match(regex) != optionsEnd){
            await interaction.reply(
                { content: `vous devez avoir une date de fin valide.`, 
                ephemeral: true }
            ); 
            return
        }
        const [time, day] = options.getString('fin').split(' ');
        const [hours, min] = time.split(':')
        const [num, mou] = day.split("/")
        const timeNow  = new Date()
        const endTime = new Date(`${timeNow.getFullYear()}-${mou}-${num}T${hours}:${min}:00`)
        if(endTime < timeNow){
            await interaction.reply(
                { content: `La date emise est déjà passer`, ephemeral: true }
            ); 
            return
        }

        await interaction.reply({ content: `Tout est nickel ! patientez`, ephemeral: true })


        addVote(description,
            choices,
            {
                day: num,
                hour: hours,
                mouth: mou,
                min: min
            },
            endTime - timeNow,
            interaction.user,
            await interaction.client.channels.fetch(voteChanel)
        )

        return
    }
});

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);
client.login(token);
module.exports = logger;