//dependencies
const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/Boom");
const { state, saveState } = useSingleFileAuthState("./login.json");

//OpenAi
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: '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',
});
const openai = new OpenAIApi(configuration);

//Response function chatGPT
async function generateResponse(text) {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0.3,
        max_tokens: 3000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["\"\"\""],
      });
      return response.data.choices[0].text;
}


//Utama chukong Boot
async function connectToWhatsApp(){

    //connection to whatsapp
    const sock = makeWASocket({
        auth : state,
        printQRInTerminal : true,
        defaultQueryTimeoutMs : undefined
    });

    //Listen connection update
    sock.ev.on("connection.update", (update) => {
        const {connection, lastDisconnect } = update;
        if(connection == "close"){
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;
            console.log("connection error because ", lastDisconnect.error, ", connecting Again.!!", shouldReconnect);
            if(shouldReconnect){
                connectToWhatsApp();
            }
        }
        else if( connection === "open"){
            console.log("connection is connected")
        }
    });
    sock.ev.on("creds.update", saveState);

    //inbox messages
    sock.ev.on("messages.upsert", async ({messages, type}) => {
        console.log("Tipe pesan : ", type);
        console.log(messages);
        if(type === "notify" && !messages[0].key.fromMe){
            try{

                //nomor pengirim
                const senderNumber = messages[0].key.remoteJid;
                let incomingMessages = messages[0].message.conversation;
                if (incomingMessages == ""){
                    incomingMessages = messages[0].message.extendedTextMessage.text;
                }
                incomingMessages = incomingMessages.toLocaleLowerCase();

                //info  Pesan Group
                const isMessageFromGroup = senderNumber.includes("@g.us");
                const isMessageMentionBot = incomingMessages.includes("@6288210805123");

                //Tampilkan identitas pengirim
                console.log("Nomor pengirim:", senderNumber);
                console.log("isi pesan:", incomingMessages);

                //Validasi pesan Group
                console.log("Pesan masuk dari Group?", isMessageFromGroup);
                console.log("Apakah pesan menyebut Bot", isMessageMentionBot);

                //Chat Gpt
                if (!isMessageFromGroup) {
                    async function main() {
                        const result = await generateResponse(incomingMessages);
                        console.log(result);
                        await sock.sendMessage(
                            senderNumber,
                            { text: result + "\n\n" },
                            { quoted: messages[0] },
                            2000
                           
                        );
                    }
                    main();
                }
                //Question in Group
                if(isMessageFromGroup && isMessageMentionBot){
                    async function main() {
                        const result = await generateResponse(incomingMessages);
                        console.log(result);
                        await sock.sendMessage(
                            senderNumber,
                            { text: result + "\n\n" },
                            { quoted: messages[0] },
                            2000
                           
                        );
                    }
                    main();
                }

                //jika ada yang mengirim pesan ping
                if (incomingMessages === "ping") {
                    await sock.sendMessage(
                        senderNumber,
                        { text: result },
                        { quoted: messages[0] },
                        2000
                       
                    );
                }

                //jika ada yang menanyakan siapa
                if (incomingMessages.includes('siapa')){
                    await sock.sendMessage(
                        senderNumber,
                        { text: "Saya Chukong Boot!" },
                        { quoted: messages[0] },
                        2000
                       
                    );
                }
            }catch(error){
                console.log("Error");
            }
        }
    })
}

connectToWhatsApp().catch((err) => {
    console.log("Ada Error: " + err);
})