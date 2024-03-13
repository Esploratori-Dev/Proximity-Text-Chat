/**
 * PROXIMITY TEXT CHAT ADDON v1.3.2 for Minecraft Bedrock Edition v1.20.60 lets your users chat only while in a fixed range from each other, 
 * and in the same dimension. Through commands you can set the distance. Note: your members can still chat through commands such as
 * /me and /say.
 * 
 * Access the menu through /function proximity/menu and edit the settings.
 * (Old) In order to change the distance run this command in chat "esploratori:proximity_setup <proximity distance (number)> <use admin tag (true/false)>"
 * e.g. esploratori:proximity_setup 50 false
 * 
 * This addon was developed by InnateAlpaca of Esploratori-Development. You can reach us at:
 * - Discord: https://discord.gg/A2SDjxQshJ
 * - Github: https://github.com/InnateAlpaca
 * - Fiverr: https://www.fiverr.com/innatedeveloper
 * - Email: info@esploratori.space
 * More contacts at https://bedrockbridge.esploratori.space/Contact.html
 */

/**MIT License

Copyright (c) 2023 InnateAlpaca

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

- Mention the author of this pack inside the code and reference link https://github.com/InnateAlpaca.

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

function saveDynamicProperty(name, value){
    system.run(()=>{
        world.setDynamicProperty(name, value);
    })
}

const settings = {
    default_proximity_distance: 50,
    game_proximity_distance: 50,
    do_admin_tag: false,
    deaf_message: false,
    admin_tag: "admin",
    options_command: "esploratori:proximity_setup",
    rank_template: "[$t§r] <$u> $m", // %t tag, %u username, %n nametag, %m message
    do_template: false,

    rank_prefix: "rank",
    default_rank: "Member"
}

async function show_menu(player){
    const menu_form = new ModalFormData()
    .title("Proximity Text Chat")
    .textField("From this menu you can edit this addon's behaviour.\n\n"+
        "Proximity distance", settings.game_proximity_distance.toString())
    .textField("ChatRank template", settings.rank_template)
    .toggle("Enable Chat-Rank", settings.do_template)
    .toggle("Admin tag only", settings.do_admin_tag)
    .toggle(`Mute message (§o"nobody can hear"§r)`, settings.deaf_message)

    return menu_form.show(player).then(res=>{
        if (res.canceled) return;
        const [distance, rank_template, do_template, do_admin_tag, deaf_message] = res.formValues;
        if (distance.length>0){
            const new_dist = parseInt(distance);
            if (isNaN(new_dist)){
                player.sendMessage("§cThe distance you provided is not a valid number.");
            }
            else{
                settings.game_proximity_distance=new_dist;
                saveDynamicProperty("esploratori:proximity_distance", new_dist);
            }
        }

        if (rank_template.length>0 && rank_template!==settings.rank_template){
            settings.rank_template=rank_template;
            saveDynamicProperty("esploratori:rank_template", rank_template);
        } 
        if (do_template!==settings.do_template){
            settings.do_template=do_template;
            saveDynamicProperty("esploratori:do_template", do_template);
        }
        if (do_admin_tag!==settings.do_admin_tag){
            settings.do_admin_tag=do_admin_tag;
            saveDynamicProperty("esploratori:do_admin_tag", do_admin_tag);
        }
        if (deaf_message!==settings.deaf_message){
            settings.deaf_message=deaf_message;
            saveDynamicProperty("esploratori:deaf_message", deaf_message);
        }
        player.sendMessage("§eAll valid changes have been saved.");
    })
}

world.afterEvents.worldInitialize.subscribe((e)=>{
    settings.game_proximity_distance = world.getDynamicProperty("esploratori:proximity_distance")??settings.default_proximity_distance;
    settings.do_admin_tag = world.getDynamicProperty("esploratori:do_admin_tag")??settings.do_admin_tag;
    settings.deaf_message = world.getDynamicProperty("esploratori:deaf_message")??settings.deaf_message;

    settings.rank_template = world.getDynamicProperty("esploratori:rank_template")??settings.rank_template;
    settings.do_template = world.getDynamicProperty("esploratori:do_template")??settings.do_template;
   
    console.log(`Proximity distance started. Proximity distance is ${settings.game_proximity_distance} blocks. Admin-lock enabled: ${settings.do_admin_tag}`);
})

// Command handler
world.beforeEvents.chatSend.subscribe(e=>{
    if (e.message.startsWith(settings.options_command)){
        e.cancel=true;

        if (settings.do_admin_tag&&!e.sender.hasTag(settings.admin_tag)){
            e.sender.sendMessage("§cYou can't run this command as you are not a proximity_admin."); return;
        }
        
        const [proximity_distance, do_admin] = e.message.slice(settings.options_command.length+1).split(' ');
        if (proximity_distance.length==0){
            e.sender.sendMessage(`Current proximty distance is: §o${settings.game_proximity_distance} blocks.`); return;
        }
        if (Number.parseInt(proximity_distance)>0){
            settings.game_proximity_distance=Number.parseInt(proximity_distance);
            saveDynamicProperty("esploratori:proximity_distance", settings.game_proximity_distance);
        }
        else {
            e.sender.sendMessage("§cWrong arguments. Usage: §oesploratori:proximity_setup <proximity distance (number)> <use admin tag (true/false)>"); return;
        }
        
        if (do_admin){
            if (do_admin=="true"){
                settings.do_admin_tag=true;
                saveDynamicProperty("esploratori:do_admin_tag", true);
            }
            else if (do_admin=="false"){
                settings.do_admin_tag=false;
                saveDynamicProperty("esploratori:do_admin_tag", false);
            }
            else {
                e.sender.sendMessage("§cWrong arguments. Usage: §oesploratori:proximity_setup <proximity distance (number)> <use admin tag (true/false)>"); return;
            }
        }        
        e.sender.sendMessage("§eAll changes to proximity were executed");
    }
})


world.beforeEvents.chatSend.subscribe(e=>{
    if (e.message.startsWith(settings.options_command)) return;
    
    e.cancel=true;
    const player = e.sender;
    
    if (settings.do_template){ // use the rank template
        let message = settings.rank_template;
        message=message.replace(/\$u/g, e.sender.name);
        message=message.replace(/\$n/g, e.sender.nameTag);
        message=message.replace(/\$m/g, e.message);
        message=message.replace(/\$t/g, e.sender.getTags().find(v=>v.startsWith(settings.rank_prefix))?.slice(settings.rank_prefix.length+1)??settings.default_rank);
        
        player.runCommandAsync(`tellraw @a[r=${settings.game_proximity_distance}] {"rawtext":[{"text":"${message}"}]}`).then(r=>{
            if (settings.deaf_message && player.dimension.getPlayers({maxDistance:settings.game_proximity_distance, location: player.location}).length===1)
            player.sendMessage("§iOther players are too far away, they can't hear you!")
        }) 
    }
    else {
        player.runCommandAsync(`tellraw @a[r=${settings.game_proximity_distance}] {"rawtext":[{"text":"<${player.name}> ${e.message}"}]}`).then(r=>{
            if (settings.deaf_message && player.dimension.getPlayers({maxDistance:settings.game_proximity_distance, location: player.location}).length===1)
            player.sendMessage("§iOther players are too far away, they can't hear you!")
        })        
    }   
})

system.afterEvents.scriptEventReceive.subscribe(e=>{
    switch(e.id.slice(10)){
        case "menu":{
            show_menu(e.sourceEntity);
            break;
        }
        case "reset":{
            world.clearDynamicProperties();
            e.sourceEntity?.sendMessage("§eAll stored data has been deleted.")
            break;
        }
    }
}, {namespaces:["proximity"]})