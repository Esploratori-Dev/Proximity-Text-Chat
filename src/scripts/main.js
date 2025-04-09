/**
 * PROXIMITY TEXT CHAT ADDON v1.4.5 for Minecraft Bedrock Edition v1.21.40 lets your users chat only while in a fixed range from each other, 
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
import { settings, colors } from "./data/data.js";

// Dynamische Speicherung
function saveDynamicProperty(name, value) {
    system.run(() => world.setDynamicProperty(name, value));
}

// Menü anzeigen
async function show_menu(player) {
    const form = new ModalFormData()
        .title("Proximity Text Chat")
        .textField("Proximity distance", settings.game_proximity_distance.toString())
        .textField("ChatRank template", settings.rank_template)
        .toggle("Use Chat-Rank", settings.do_template)
        .toggle("Admin tag only", settings.do_admin_tag)
        .toggle("Mute message ('nobody can hear')", settings.deaf_message)
        .toggle("Addon enabled", settings.enabled);

    const res = await form.show(player);
    if (res.canceled) return;

    const [distText, rank_template, do_template, do_admin_tag, deaf_message, enabled] = res.formValues;
    const dist = parseInt(distText);
    if (!isNaN(dist)) {
        settings.game_proximity_distance = dist;
        saveDynamicProperty("esploratori:proximity_distance", dist);
    }

    settings.rank_template = rank_template;
    settings.do_template = do_template;
    settings.do_admin_tag = do_admin_tag;
    settings.deaf_message = deaf_message;
    settings.enabled = enabled;

    saveDynamicProperty("esploratori:rank_template", rank_template);
    saveDynamicProperty("esploratori:do_template", do_template);
    saveDynamicProperty("esploratori:do_admin_tag", do_admin_tag);
    saveDynamicProperty("esploratori:deaf_message", deaf_message);
    saveDynamicProperty("esploratori:enabled", enabled);

    player.sendMessage("§aSettings updated.");
}

// Rang-Manager anzeigen
async function show_tag_manager(player) {
    const players = world.getPlayers();
    const color_names = Object.keys(colors);
    color_names.unshift("<default>");

    const form = new ModalFormData()
        .title("Rank Tag Manager")
        .dropdown("Select Player", players.map(p => p.name))
        .textField("Rank", "e.g. Admin")
        .dropdown("Color", color_names.map(c => c.replace("_", " ")), 0);

    const res = await form.show(player);
    if (res.canceled) return;

    const [idx, rankText, colorIdx] = res.formValues;
    const target = players[idx];

    if (!target || rankText.includes("$")) {
        return player.sendMessage("§cInvalid rank.");
    }

    const colorCode = (colorIdx > 0 ? colors[color_names[colorIdx]] : "");
    const coloredRank = `${colorCode}${rankText}§r`;

    // alte Tags entfernen & neuen setzen
    target.getTags().forEach(t => {
        if (t.startsWith(settings.rank_prefix + ":")) target.removeTag(t);
    });
    target.addTag(`${settings.rank_prefix}:${coloredRank}`);
    player.sendMessage(`§aRank "${coloredRank}§r§a" set for §o${target.name}`);
}

// Initialisierung
world.afterEvents.worldLoad.subscribe(() => {
    settings.game_proximity_distance = world.getDynamicProperty("esploratori:proximity_distance") ?? settings.default_proximity_distance;
    settings.rank_template = world.getDynamicProperty("esploratori:rank_template") ?? settings.rank_template;
    settings.do_template = world.getDynamicProperty("esploratori:do_template") ?? settings.do_template;
    settings.do_admin_tag = world.getDynamicProperty("esploratori:do_admin_tag") ?? settings.do_admin_tag;
    settings.deaf_message = world.getDynamicProperty("esploratori:deaf_message") ?? settings.deaf_message;
    settings.enabled = world.getDynamicProperty("esploratori:enabled") ?? settings.enabled;

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

    if (!settings.enabled) return;
    e.cancel = true;

    const sender = e.sender;
    const nearbyPlayers = world.getPlayers().filter(p =>
        p.dimension.id === sender.dimension.id &&
        Math.sqrt(
            Math.pow(p.location.x - sender.location.x, 2) +
            Math.pow(p.location.y - sender.location.y, 2) +
            Math.pow(p.location.z - sender.location.z, 2)
        ) <= settings.game_proximity_distance
    );

    let chatMsg = `<${sender.name}> ${e.message}`;
    if (settings.do_template) {
        const tag = sender.getTags().find(t => t.startsWith(settings.rank_prefix + ":"))?.slice(settings.rank_prefix.length + 1);
        const color = (tag?.startsWith("§")) ? tag.slice(0, 2) : colors["white"];
        chatMsg = settings.rank_template
            .replace(/\$u/g, sender.name)
            .replace(/\$n/g, sender.nameTag)
            .replace(/\$t/g, tag ?? settings.default_rank)
            .replace(/\$c/g, color)
            .replace(/\$m/g, e.message);
    }

    for (const p of nearbyPlayers) {
        p.sendMessage(chatMsg);
    }

    if (settings.deaf_message && nearbyPlayers.length === 1) {
        sender.sendMessage("§7§oNobody nearby heard you.");
    }
});

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
        case "reset":
            world.clearDynamicProperties();
            player.sendMessage("§eAll data reset.");
            break;
    }
}, { namespaces: ["proximity"] });