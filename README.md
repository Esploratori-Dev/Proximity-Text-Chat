# Bedrock Proximity Text Chat
Hello! Ever wanted to have proximity chat on your server, realm or world? To have players chatting only if they are close enough one to another just like in real life? Then this addon is the solution for you. Super light, easy to setup, simple to use!

**Bedrock Proximity Text Chat** from [Esploratori-Development](https://discord.gg/esploratori-development-1043447184210792468) is extremely flexible and compact, and aims to provide this single functionality to your world, by solely using scripting.

## Setup
* Enable experiments on your world
* Install the addon
* run `/function proximity/menu` to open the menu
* run `/function proximity/addrank` to add a customized rank to a player

### Chat-Rank
* The messages appearance, and nametags will be modelled according to the template: 
 * `$t` rank-tag (starting with `rank:`)
 * `$...t()` all rank-tags, separated by the value you put in the brakets
 * `$u` username of the sender
 * `$n` nametag of the sender
 * `$m` message content
 * `$c` tag color
 * `$d` device used
 * `$l` location, as separataed ciphers `100 -2 40`
 * `$p` rank priority from the highest rank, if available, default is 0
 * `$s()` scoreboard value where the scoreboard id is added between the brakets
 * `$0` new line character `\n`

 ### Slash commands
The pack moffers the following slash commands to be used by ingame operators, even without cheats:
- `/proximity:menu` open the menu
- `/proximity:addrank` add a dedicated rank to a player through menu
- `/proximity:removerank` select a player and remove a rank selected by form
- `/proximity:setnametag` set the nametag for a target player. If you enable name-template the nametag of the player will appear as modified on top of all players.

## Q&A
* *Does it work also on single worlds and Realms?* Yes, it does!
* *Does it need experiments on?* Yes, in order to work this pack requires experiments on.
* *Can anyone change the proximity-distance?* Yes! and no... When you first install the addon anyone can change it, but you can edit it so that only people with a certain tag can do that. How? read below!
* *Wait, so players can't chat at all?* Well, not entirely, they can still use commands (if they know about them) such as /me, or /say. Still having long chats that way it's pretty hard... much better come closer!
* *Where can I get help?* just come to visit us on the [official discord server](https://discord.gg/esploratori-development-1043447184210792468)!
* *Does it work with voice?* Nope, that's voice proximity, and we are still working on it.

### Template examples
Let's assume that a player has the following characteristics:
- name: Notch
- plays on console
- you add the tags "rank:§eTopYellowMan:10" (which will appear yellow) and "rank:SimpleMember:1"
- the scoreboard "money" has value *25* for Notch

ChatRank template: `<$u> $m`
Expected chat: `<Notch> hello!`

ChatRank template: `$u ($t§r): $m`
Expected chat: `Notch (TopYellowMan): hello!` (wuth *TopYellowMan* appearing yellow )

ChatRank template: `[$...t(§r,)§r] $u: $m`
Expected chat: `[TopYellowMan, SimpleMember] Notch: hello!` (with *TopYellowMan* appearing yellow )

ChatRank template: `[$t - $p] $u> $m`
Expected chat: `[TopYellowMan - 10] Notch> hello!` (with *TopYellowMan* appearing yellow )

ChatRank template: `$c$u§r [$d]> $m`
Expected chat: `Notch [mobile]> hello!` (with *Notch* appearing yellow as we have used $c that sets chat to to the top role color)

ChatRank template: `$u ($s(money)£)> $m`
Expected chat: `Notch (25£)> hello!` (with *Notch* appearing yellow as we have used $c that sets chat to to the top role color)