/**
 * PROXIMITY TEXT CHAT ADDON @version v1.5.2 for Minecraft Bedrock Edition v1.21.80 lets your users chat only while in a fixed range from each other, 
 * and in the same dimension. Through commands you can set the distance. Note: your members can still chat through commands such as
 * /me and /say.
 * 
 * Access the menu through /function proximity/menu and edit the settings.
 * (Old) In order to change the distance run this command in chat "esploratori:proximity_setup <proximity distance (number)> <use admin tag (true/false)>"
 * e.g. esploratori:proximity_setup 50 false
 * 
 * This addon was developed by InnateAlpaca of Esploratori-Development. You can reach us at:
 * - Discord: https://discord.gg/kR2YwxaHxg
 * - Github: https://github.com/InnateAlpaca
 * - Email: info@esploratori.space
 * More contacts at https://bedrockbridge.esploratori.space/Contact.html
 */

/**MIT License

Copyright (c) 2025 InnateAlpaca

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

import { world, system, Player, CommandPermissionLevel, CustomCommandSource, CustomCommandStatus, CustomCommandParamType } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { settings, colors } from "./data/data.js";

// Dynamische Speicherung
function saveDynamicProperty(name, value) {
    system.run(() => world.setDynamicProperty(name, value));
}

class RankRecord {
    constructor(name, priority=0) {
        this.name = name
        this.priority = priority
    }
    static fromTag(text) {
        const [_, tag, prior] = text.split(":")
        const value = Number.parseInt(prior)
        if (isNaN(value))
            return new RankRecord(tag, 0)
        else
            return new RankRecord(tag, value)
    }
    get color(){
        if (this.name.startsWith("§")){
            return this.name.slice(0, 2)
        }
        else return colors["white"]
    }
}

/**
 * @param {Player} player
 */
function applyChatTag(player, message, baseTemplate = settings.rank_template) {
    const tags = [];
    for (const tag of player.getTags()){
        if (tag.startsWith(settings.rank_prefix + ":")){
            tags.push(RankRecord.fromTag(tag))
        }
    }
    if (tags.length===0){
        tags.push(new RankRecord(settings.default_rank))
    }
    tags.sort((a, b) => b.priority - a.priority)

    const color = tags[0]?.color ?? colors["white"];
    return baseTemplate
        .replace(/\$(\.\.\.\w+|\w)\((.*?)\)/g, (match, key, value) => {
            switch (key){
                case '...t': return tags.map(t => t.name).join(value); 
                case 's':{ 
                    const scoreboard = world.scoreboard.getObjective(value);
                    return (scoreboard.hasParticipant(player)) ? scoreboard.getScore(player).toString() : "0";
                } 
                default: return match
            }
        })
        .replace(/\$(u|n|t|c|d|l|p|m|0)/g, (match, key) => {
            switch (key) {
                case 'u': return player.name;
                case 'n': return player.getDynamicProperty(settings.nameTag_tag)??player.name;
                case 't': return tags[0].name;
                case 'c': return color;
                case 'd': return player.clientSystemInfo.platformType;
                case 'l': return `${Math.floor(player.location.x)} ${Math.floor(player.location.y)} ${Math.floor(player.location.z)}`;
                case 'p': return tags[0]?.priority??0;
                case '0': return '\n'
                case 'm': return message;
                default: return match;
            }
        });
}

function applyNameTag(player) {
    player.nameTag = applyChatTag(player, "", settings.name_template);
}

function* applyAllNameTags(players) {
    for (const player of players??world.getAllPlayers()){
        player.nameTag = applyChatTag(player, "", settings.name_template);
        yield;
    }
}

// Menü anzeigen
async function show_menu(player) {
    const form = new ModalFormData()
        .title("Proximity Text Chat")
        .textField("Proximity distance", settings.game_proximity_distance.toString())
        .textField("ChatRank template", settings.rank_template, { defaultValue: settings.rank_template })
        .textField("Name template", settings.name_template, { tooltip: "customize the nametag on top of each player", defaultValue: settings.name_template })
        .toggle("Use Chat-Rank", { defaultValue: settings.do_template, tooltip: "if enabled chat will appear according to chat-rank template" })
        .toggle("Use Name-Rank", { defaultValue: settings.do_name_template, tooltip: "if enabled nametag on top of each player will appear according to template" })
        .toggle("Admin tag only", { defaultValue: settings.do_admin_tag, tooltip: "only players with admin tag will be able to open the setup menu" })
        .toggle("Mute message", { defaultValue: settings.deaf_message, tooltip: "'nobody can hear' will appear in chat if other players are too far away" })
        .toggle("Proximity enabled", { defaultValue: settings.proximity_enabled, tooltip: "if enabled chat will be visible only if players are close enough on to another"})
        .submitButton("Save")

    const res = await form.show(player);
    if (res.canceled) return;

    const [distText, rank_template, name_template, do_template, do_name_template, do_admin_tag, deaf_message, enabled] = res.formValues;
    const dist = parseInt(distText);
    if (!isNaN(dist)) {
        settings.game_proximity_distance = dist;
        saveDynamicProperty("esploratori:proximity_distance", dist);
    }

    if (settings.do_name_template && (!do_name_template)){
        world.getAllPlayers().forEach(p=>p.nameTag=p.name)  // make all names back to normal
    }
    else if ((!settings.do_name_template) && do_name_template) {
        world.getAllPlayers().forEach(applyNameTag);
    }
          
    settings.do_template = do_template;
    settings.do_name_template = do_name_template
    settings.do_admin_tag = do_admin_tag;
    settings.deaf_message = deaf_message;
    settings.proximity_enabled = enabled;

    if (name_template !== settings.name_template) {
        settings.name_template = name_template;
        saveDynamicProperty("esploratori:name_template", name_template);

        world.getAllPlayers().forEach(applyNameTag)
    } 
    

    settings.rank_template = rank_template;
    saveDynamicProperty("esploratori:rank_template", rank_template);

    saveDynamicProperty("esploratori:do_template", do_template);
    saveDynamicProperty("esploratori:do_name_template", do_name_template);
    saveDynamicProperty("esploratori:do_admin_tag", do_admin_tag);
    saveDynamicProperty("esploratori:deaf_message", deaf_message);
    saveDynamicProperty("esploratori:enabled", enabled);

    player.sendMessage("§aSettings updated.");
}

// Rang-Manager anzeigen
async function show_tag_manager(player) {
    const players = world.getAllPlayers();
    const color_names = Object.keys(colors);
    color_names.unshift("<default>");

    const form = new ModalFormData()
        .title("Rank Tag Manager")
        .dropdown("Select Player", players.map(p => p.name))
        .textField("Rank", "e.g. Admin")
        .dropdown("Color", color_names.map(c => c.replace("_", " ")), {defaultValueIndex: 0})
        .slider("Priority", 0, 100, {defaultValue:0, tooltip: "priority order used to display the ranks"})
        .submitButton("Add rank");

    const res = await form.show(player);
    if (res.canceled) return;

    const [idx, rankText, colorIdx, priority] = res.formValues;
    const target = players[idx];

    if (!target || rankText.includes("$")) {
        return player.sendMessage("§cInvalid rank.");
    }

    const colorCode = (colorIdx > 0 ? colors[color_names[colorIdx]] : "");
    const coloredRank = `${colorCode}${rankText}§r`;

    // // alte Tags entfernen & neuen setzen
    // target.getTags().forEach(t => {
    //     if (t.startsWith(settings.rank_prefix + ":")) target.removeTag(t);
    // });
    target.addTag(`${settings.rank_prefix}:${coloredRank}:${priority}`);
    player.sendMessage(`§aRank "${coloredRank}§r§a" set for §o${target.name}`);
}

/**@param {Player} player @returns {Promise<Player>}*/
async function select_player_menu(title, player){
    const players = world.getAllPlayers()
    const form = new ModalFormData()
        .title(title)
        .dropdown("Select player", players.map(p=>p.name))
        .submitButton("Next");

    const res = await form.show(player);
    if (res.canceled) return;

    return players[res.formValues];
}

/**@param {Player} player @param {Player} target*/
async function show_removetag_manager(player, target) {
    const tags = target.getTags().filter(t=>t.startsWith(settings.rank_prefix+':'))
    if (tags.length===0){
        player.sendMessage("§cSelected player has no tag")
        return
    }
    const form = new ModalFormData()
        .title("Rank Remove Manager")
        .dropdown("Select Rank", tags.map(t=>{
            const [_, tag, val] = t.split(":");
            return val ? `${tag} (${val})` : tag
        }))
        .submitButton("Remove Rank");

    const res = await form.show(player);
    if (res.canceled) return;

    const [idx] = res.formValues;
    const rank = tags[idx];
    target.removeTag(rank);
    player.sendMessage("§eRank removed")
}

// Initialisierung
world.afterEvents.worldLoad.subscribe(() => {
    settings.game_proximity_distance = world.getDynamicProperty("esploratori:proximity_distance") ?? settings.default_proximity_distance;
    settings.rank_template = world.getDynamicProperty("esploratori:rank_template") ?? settings.rank_template;
    settings.name_template = world.getDynamicProperty("esploratori:name_template") ?? settings.name_template;
    settings.do_template = world.getDynamicProperty("esploratori:do_template") ?? settings.do_template;
    settings.do_name_template = world.getDynamicProperty("esploratori:do_name_template") ?? settings.do_name_template;
    settings.do_admin_tag = world.getDynamicProperty("esploratori:do_admin_tag") ?? settings.do_admin_tag;
    settings.deaf_message = world.getDynamicProperty("esploratori:deaf_message") ?? settings.deaf_message;
    settings.proximity_enabled = world.getDynamicProperty("esploratori:enabled") ?? settings.proximity_enabled;

    console.warn(`[ProximityChat] Initialized. Distance: ${settings.game_proximity_distance}, Template: ${settings.do_template}`);
});

// Chat-Verarbeitung
world.beforeEvents.chatSend.subscribe(e => {
    if (e.message.startsWith(settings.options_command)) {
        e.cancel = true;
        if (settings.do_admin_tag && !e.sender.hasTag(settings.admin_tag)) {
            return e.sender.sendMessage("§cYou are not a proximity_admin.");
        }

        const [distStr, adminFlag] = e.message.slice(settings.options_command.length + 1).split(" ");
        const dist = parseInt(distStr);
        if (!isNaN(dist)) {
            settings.game_proximity_distance = dist;
            saveDynamicProperty("esploratori:proximity_distance", dist);
        }

        if (adminFlag === "true" || adminFlag === "false") {
            settings.do_admin_tag = adminFlag === "true";
            saveDynamicProperty("esploratori:do_admin_tag", settings.do_admin_tag);
        }

        e.sender.sendMessage("§aProximity settings updated.");
        return;
    }

    if (!settings.proximity_enabled && !settings.do_template) return;
    const sender = e.sender;
    e.cancel = true;

    let chatMsg = `<${sender.name}> ${e.message}`;
    if (settings.do_template) {
        chatMsg = applyChatTag(sender, e.message)
    }

    if (settings.proximity_enabled){
        const nearbyPlayers = sender.dimension.getPlayers({ maxDistance: settings.game_proximity_distance, location: sender.location });

        for (const p of nearbyPlayers) {
            p.sendMessage(chatMsg);
        }
        // admins out of "hear" can still get the chat
        for (const p of sender.dimension.getPlayers({ minDistance: settings.game_proximity_distance, location: sender.location, tags: [settings.ignore_tag] })) {
            p.sendMessage("§o(far)§r " + chatMsg);
        }

        if (settings.deaf_message && nearbyPlayers.length === 1) {
            sender.sendMessage("§7§oNobody nearby heard you.");
        }
    }
    else {
        world.sendMessage(chatMsg)
    }
});

system.beforeEvents.startup.subscribe(({customCommandRegistry: registry})=>{
    registry.registerCommand({
        name: "proximity:menu",
        description: "Opens proximity addon settings menu",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false
    }, (origin) => {
        if (origin.sourceType===CustomCommandSource.Entity){
            system.run(() => show_menu(origin.sourceEntity));
        }
        else return {
            status: CustomCommandStatus.Failure
        }
    })

    registry.registerCommand({
        name: "proximity:addrank",
        description: "Opens a menu to add ranks",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false
    }, (origin) => {
        if (origin.sourceType === CustomCommandSource.Entity) {
            system.run(() => show_tag_manager(origin.sourceEntity));
        }
        else return {
            status: CustomCommandStatus.Failure
        }
    })

    registry.registerCommand({
        name: "proximity:removerank",
        description: "Opens a menu to select a player and remove ranks",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [{type: CustomCommandParamType.PlayerSelector, name:"target"}],
        cheatsRequired: false
    }, (origin, targets) => {
        
        if (origin.sourceType === CustomCommandSource.Entity) {
            const player = origin.sourceEntity;            
            if (targets){
                const target = targets[0]
                system.run(() => show_removetag_manager(player, target));
            }                
            else
                system.run(() => select_player_menu("Rank Remove Manager", player).then(async t => {
                    await show_removetag_manager(player, t);
                    if (settings.do_name_template)
                        applyNameTag(t);
                }))
                
        }
        else return {
            status: CustomCommandStatus.Failure
        }
    })

    registry.registerCommand({
        name: "proximity:reset",
        description: "Removes all addon data from the world",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false
    }, (origin) => {
        if (origin.sourceType === CustomCommandSource.Entity) {
            world.clearDynamicProperties()
            return {
                status: CustomCommandStatus.Success,
                message: "All data has been removed."
            }
        }
        else return {
            status: CustomCommandStatus.Failure
        }
    })

    registry.registerCommand({
        name: "proximity:setnametag",
        description: "Changes the nametag for the target player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "targetPlayer" }, { type: CustomCommandParamType.String, name: "nameTag" }],
        cheatsRequired: false
    }, (origin, players, nametag) => {
        if (players.length>0){
            for (const player of players){
                system.run(()=>player.setDynamicProperty(settings.nameTag_tag, nametag));                    
            }
            return {
                status: CustomCommandStatus.Success,
                message: "Nametag changed for '"+players.map(p=>p.name).join("'")+"' to '"+nametag+"'"
            }
        }
        else return {
            status: CustomCommandStatus.Success,
            message: "All data has been removed."
        }
    })
}), 

// Menü-Aufruf
system.afterEvents.scriptEventReceive.subscribe(e => {
    const player = e.sourceEntity;
    if (!player || (settings.do_admin_tag && !player.hasTag(settings.admin_tag))) {
        player?.sendMessage("§cNo permission.");
        return;
    }

    switch (e.id.slice(10)) {
        case "menu":
            show_menu(player);
            break;
        case "addrank":
            show_tag_manager(player);
            break;
        case "removerank":
            select_player_menu("Rank Remove Manager", player).then(async target=>{
                await show_removetag_manager(player, target);
                if (settings.do_name_template)
                    applyNameTag(target);
            })
            break;
        case "reset":
            world.clearDynamicProperties();
            player.sendMessage("§eAll data reset.");
            break;
    }
}, { namespaces: ["proximity"] });


world.afterEvents.playerSpawn.subscribe(({player})=>{
    const nametag = player.getDynamicProperty(settings.nameTag_tag)
    if (!nametag){
        player.setDynamicProperty(settings.nameTag_tag, player.name)
        player.nametag=player.name
    } 
    if (settings.do_name_template){
        applyNameTag(player)
    }
    else {
        player.nameTag=nametag??player.name
    }
})
if (settings.do_name_template){
    world.getAllPlayers().forEach(applyNameTag);
}



system.runInterval(async()=>{
    if (settings.do_name_template){
        system.runJob(applyAllNameTags())
    }
}, settings.update_loop_interval)