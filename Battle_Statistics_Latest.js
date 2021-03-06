// ==UserScript==
// @name         Battle-statistics v1.4
// @version      1.4
// @description  Tracks statistics of battles (Arena and Node)
// @author       Dominik "Bl00D4NGEL" Peters
// @match        http://*.drakor.com*
// @match        https://*.drakor.com*
// ==/UserScript==

$(document).ready(function () {
    var version = "v1.4";
    console.log("You're currently using Battle Statistics version " + version);
    //Variable declaration; getting the data out of local storage
    var log;
    if (!localStorage.getItem("battleLog")) {
        console.log("Log not found, creating a new one");
        log = Create_Log_Object();
    }
    else {
        log = JSON.parse(localStorage.getItem("battleLog"));
        console.log(log);
        console.log("Battle Statistics Log succesfully loaded");
    }
    AddEnterShortcut($(".menuFighting"));
    $(".menuFighting").on("click", function(){
        CheckInventory();
    });
    if(log.CurrentLoot > 0){
        var lootbagText = $("#load-openloot").html().match(/(.*\d+).*/)[1];
        $("#load-openloot").html(lootbagText + "(" + log.CurrentLoot + ")");
    }
    $( document ).ajaxComplete(function( event, xhr, settings ) {
        if (settings.url === "/arena") {
            SetupLog();
            CheckInventory();
            AddEnterShortcut($(".createBattle"));
        }
        else if(settings.url === "/adventure" || settings.url.match(/travel/)){
            AddEnterShortcut($(".menuFighting"));
            $(".menuFighting").on("click", function(){
                CheckInventory();
            });
        }
        else if(settings.url.match(/\/battle-round\/attack.*/)){
            var difficulty = $(".battleDiff").html().match(/:\s(\w+).*/)[1];
            log = JSON.parse(localStorage.getItem("battleLog"));

            if(xhr.responseText.match(/victory/)){
                console.log("Victory!");
                // difficulty = xhr.responseText.match(/<h4>(\w+).*?<\/h4>/i)[1];
                console.log(difficulty);
                log.Won++;
                log[difficulty].Won++;
                var loot = xhr.responseText.match(/modLoot\((\d)\)/);
                if(loot){ //Got loot
                    var realLoot = xhr.responseText.match(/with\s(\d+)\sitem/i);
                    log.TotalLoot += Number(realLoot[1]);
                    log.CurrentLoot += Number(realLoot[1]);
                    log[difficulty].Loot += Number(realLoot[1]);
                    var lootbagText = $("#load-openloot").html().match(/(.*\d+).*/)[1];
                    var itemsInLootbag = lootbagText.match(/(\d+)/);
                    if(itemsInLootbag[1] === "1"){
                        console.log("Loot bag has been opened");
                        log.CurrentLoot = Number(realLoot[1]);
                    }
                    $("#load-openloot").html(lootbagText + "(" + log.CurrentLoot + ")");
                }
                else{
                    console.log("You won but didn't get any loot!");
                    log.WonWithoutLoot++;
                    log[difficulty].WonWithoutLoot++;
                }
                var exp = xhr.responseText.match(/([0-9,]+)\s?\w*\s?exp/i);
                log.Experience += Number(exp[1].replace(",", ""));
                log[difficulty].Experience += Number(exp[1].replace(",", ""));
                var gold = xhr.responseText.match(/>([0-9,]+)\sgold/i);
                if(gold){
                    log.Gold += Number(gold[1].replace(",",""));
                    log[difficulty].Gold += Number(gold[1].replace(",",""));
                }
                if($(".menuFighting").length){
                    AddEnterShortcut($(".menuFighting"));
                    $(".menuFighting").on("click", function(){
                        CheckInventory();
                    });
                }
                else{
                    AddEnterShortcut($("#load-arena"));
                }
            }
            else if(xhr.responseText.match(/defeated/) && !xhr.responseText.match(/victory/)){
                console.log("Defeat!");
                log.Lost++;
                log[difficulty].Lost++;

                if(xhr.responseText.match(/modloot/i)){
                    log.ConsolationLoot++;
                    log[difficulty].ConsolationLoot++;
                    log.CurrentLoot++;
                    var bagText = $("#load-openloot").html().match(/(.*\d+).*/)[1];
                    var itemsInBag = bagText.match(/(\d+)/);
                    if(itemsInBag[1] === "1"){
                        console.log("Loot bag has been opened");
                        log.CurrentLoot = 1;
                    }
                    $("#load-openloot").html(bagText + "(" + log.CurrentLoot + ")");

                }

                AddEnterToSpecificClass("navButton", "Back to Adventure");
                AddEnterToSpecificClass("navButton", "Back to Arena");
            }
            localStorage.setItem("battleLog", JSON.stringify(log));
        }
        else if(settings.url.match(/\/battle-create\/.*/)){
            AddEnterToSpecificClass("navButton", "Start Battle!");
        }
        else if(settings.url === "/sell/sellall"){
            if(xhr.responseText.match(/areaname\">([0-9,]+)\sg/i)){
                log = JSON.parse(localStorage.getItem("battleLog"));
                var goldEarned = xhr.responseText.match(/areaname\">([0-9,]+)\sg/i)[1].replace(",","");
                console.log("Sell all gold: " + goldEarned);
                var itemsSold = $(".drIcon").length;
                log.LootGold += Number(goldEarned);
                log.ItemsSold += Number(itemsSold);
                localStorage.setItem("battleLog", JSON.stringify(log));
            }
        }
        else if(settings.url === "/openloot/open/all"){
            log = JSON.parse(localStorage.getItem("battleLog"));
            log.CurrentLoot = 0;
            var lootbags = xhr.responseText.match(/<h3>(.*?)<script>/g);
            for(var i=0;i<lootbags.length;i++){
                var lootbag = lootbags[i];
                var diff = lootbag.match(/\((\w+)\)/)[1];
                var rarities = lootbag.match(/cardquality\">(\w+)</gi);
                for(var j=0;j<rarities.length;j++){
                    var rarity = rarities[j].match(/>(\w+)</)[1];
                    log[diff][rarity]++;
                }
            }
            localStorage.setItem("battleLog", JSON.stringify(log));
        }
        else if(settings.url === "/inventory"){
            $(".drIcon").on("dblclick", function(e){
                if(e.currentTarget.id){
                    var plainId = e.currentTarget.id.slice(4);
                    var cardId = "div#card" + plainId;
                    setTimeout(function(){
                        var cardValue = $(cardId).text().match(/([0-9,]+)\sgold/i)[1].replace(",","");
                        var log = JSON.parse(localStorage.getItem("battleLog"));
                        log.LootGold += Number(cardValue);
                        log.ItemsSold++;
                        localStorage.setItem("battleLog", JSON.stringify(log));
                        console.log("Card value: " + cardValue);
                    }, 500);
                    $.ajax("/sell/" + plainId).done(function(data){$("#drakorWorld").html(data);});
                }
            });
        }
        else if(settings.url.match(/\/world\/disenchanting/i)){DisenchantSetup();} //Setup of the selects
        else if(settings.url.match(/\/world\/action_disenchanting/i)){SelectItemToDisenchant();} //Auto de on enter press
        else if(settings.url.match(/(chat|sell|show|openloot|battle)/i)){}
        else{
            // console.log("settings\n");
            // console.log(settings);
            // console.log("event\n");
            // console.log(event);
            // console.log("xhr\n");
            // console.log(xhr);
        }

    });
});

function AddEnterShortcut(object){
    $(document).off("keydown");
    $(document).on("keydown", function(e){

        if(e.keyCode === 13){
            if(!$("#chatMsg").is(":focus")){ //Only click it if you are not in the window
                if($("#npcTimer").text().match(/[1-9]0?%/) || $("#skill-timer").text().match(/[1-9]0?%/)){
                    e.preventDefault();
                    return;
                }
                object.click();
            }
        }
    });
}

function AddEnterToSpecificClass(className, textToLookFor){
    var classes = $("." + className);
    for(var i=0;i<classes.length;i++){
        // console.log("Index: " + i + "\nMessage: " + classes[i].innerText);
        if(classes[i].innerText === textToLookFor){
            AddEnterShortcut(classes[i]);
        }
    }
}

function CheckInventory(){
    $.ajax("/inventory").success(function(data){
        var spellArea = data.match(/dcontainer\s*charbattledeck\s*\">.*?(<div id=\"icon.*?)<div\sid=\"char_inventory\"/i)[1];
        if(spellArea.match(/nodurability/i)){
            alert("One or more spells do not have enough durability");
        }
        var inventorySpaces = Number(data.match(/<div\sid=\"char_inventory".*?><div.*?b>([0-9,]+).*?<\/b>/)[1].replace(",",""));
        var log = JSON.parse(localStorage.getItem("battleLog"));
        if(log.CurrentLoot >= inventorySpaces){
            alert("Not enough inventory space");
        }
    });
}

function Create_Log_Object(){
    var log = {};
    log.Won = 0;
    log.Lost = 0;
    log.Gold = 0;
    log.TotalLoot = 0;
    log.CurrentLoot = 0;
    log.ConsolationLoot = 0;
    log.LootGold = 0;
    log.ItemsSold = 0;
    log.WonWithoutLoot = 0;
    log.Experience = 0;
    var diffArray = ["Elite", "Hard", "Medium", "Easy"];
    var keyArray = ["Gold", "Experience", "Won", "Lost", "Loot", "ConsolationLoot", "WonWithoutLoot", "Common", "Superior", "Rare", "Epic", "Legendary"];
    for(var i=0; i<diffArray.length;i++){
        log[diffArray[i]] = {};
        for(var j=0;j<keyArray.length;j++){
            log[diffArray[i]][keyArray[j]] = 0;
        }
    }
    localStorage.setItem("battleLog", JSON.stringify(log));
    return log;
}

function SetupLog(){
    var log = JSON.parse(localStorage.getItem("battleLog"));
    var totalFights = log.Lost + log.Won;
    console.log("Total Fights: " + totalFights);
    var averageGold = Math.floor(log.Gold / totalFights);
    var averageExperience = Math.floor(log.Experience / totalFights);
    var averageItems = (log.TotalLoot / totalFights).toFixed(2);
    //Ajax call to inventory to get current/needed exp
    var currentExp, neededExp;
    $.ajax("/inventory").done(function(data){
        currentExp = Number(data.match(/statexp\".*?>([0-9,]+)/i)[1].replace(",",""));
        neededExp = Number(data.match(/statexp\".*?\/small>([0-9.,k]+)/i)[1].replace("k","00").replace(/\D/,""));
        console.log("Current Exp: " + currentExp + "\nNeeded Exp: " + neededExp);
    });
    var fightsToLevel = Math.floor((neededExp - currentExp) / averageExperience);
    var divHTML = "You fought a total of " + totalFights + " total battles.<br/>You gained " + log.TotalLoot + " items (" + averageItems +
        " on average) and sold " + log.ItemsSold + " items which brought you a total of " + log.LootGold + " gold.<br/>" +
        "You did not receive loot for a won battle " + log.WonWithoutLoot + " times.<br/>You made a total of " + log.Experience +
        " Experience (" + averageExperience + " on average) and made a total of " + log.Gold + " gold ( " + averageGold +
        " on average)<br/>You won " + Number(log.Won) + " times (" + (log.Won/totalFights * 100).toFixed(2) + "%) and lost " + Number(log.Lost) +
        " times (" + (log.Lost/totalFights * 100).toFixed(2) + "%).<br/>";
    var displayDiv = $(".arenaContainer").get(2);
    displayDiv.innerHTML = divHTML;
    var resetButton = $(document.createElement("button")).text("Reset Statistics").attr({class: "bv_button bv_small_font"}).css({width: "auto", height: "auto"}).on("click", function(){
        Create_Log_Object();
        SetupLog();
    }).appendTo(displayDiv);
    var detailHTML = "<h3>Select a difficulty to get more details</h3><select id='diffSelect'>";
    var detailDiv = $(".arenaContainer").get(3);
    detailDiv.innerHTML = detailHTML;
    var diffArray = ["Easy", "Medium", "Hard", "Elite"];
    var keyArray = ["Gold", "Experience", "Won", "Lost", "Loot", "ConsolationLoot", "WonWithoutLoot", "Common", "Superior", "Rare", "Epic", "Legendary"];
    for(var i=0;i<diffArray.length;i++){
        var temp = "";
        var option = $(document.createElement("option")).attr({value: diffArray[i]}).text(diffArray[i]).appendTo($("#diffSelect"));
        temp += "<table id='" + diffArray[i] + "_table' class = 'detail_table' style='display: none;width: 100%;'>";
        for(var j=0;j<keyArray.length;j++){
            temp += "<tr><td>" + keyArray[j] + "</td><td>" + log[diffArray[i]][keyArray[j]] + "</td></tr>";
        }
        temp += "</table>";
        detailDiv.innerHTML += temp;
    }
    $("#diffSelect").on("change", function(){
        $(".detail_table").css("display", "none");
        $("#" + $(this).val() + "_table").css("display", "block");
    });
    $("#Easy_table").css("display", "block");
}

function DisenchantSetup(){
    var rarities = ["Common", "Superior", "Rare", "Epic", "Legendary"];
    var selects = ["Augment", "Enchant", "Spell"];
    for(var i=0;i<selects.length;i++){
        if(!localStorage.getItem("select" + selects[i])){localStorage.setItem("select" + selects[i], "Common");}
        var select = $(document.createElement("select")).attr({id: "select" + selects[i]}).css("font-size", "10px").on("change", function(){
            localStorage.setItem($(this).attr('id'), $(this).val());
        }).insertAfter($("#slots-remaining"));
        var span = $(document.createElement("span")).html("Disenchant " + selects[i] + " up to x rarity").insertBefore(select);
        for(var j=0;j<rarities.length;j++){
            var option = $(document.createElement("option")).attr({value: rarities[j]}).text(rarities[j]).appendTo(select);
            if(localStorage.getItem("select" + selects[i]) === rarities[j]){
                option.prop('selected', true);
            }
        }
    }
}
function SelectItemToDisenchant(){
    var rarities =  ["Common", "Superior", "Rare", "Epic", "Legendary"];
    var possibleItems = $(".roundResult.areaName").find(".cLink");
    for(var i=0;i<possibleItems.length;i++){
        var item = possibleItems[i];
        var type = item.innerText.match(/(battle|enchant|augment)/i)[1];
        if(type === "Battle"){type="Spell";} //Remapping
        var rarity = item.className.match(/card(\w+)/i)[1];
        if(rarities.indexOf(rarity) < rarities.indexOf(localStorage.getItem("select" + type))){
            AddEnterShortcut($(item).parents().children().get(0));
            var span = $(document.createElement("span")).html("<br/>This item will be Disenchanted ").insertAfter($("#selectAugment"));
            $(item).clone().appendTo(span);
            return;
        }
    }
}
