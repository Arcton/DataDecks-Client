$(function() {
    setup();
    showMenu();

    $('.modal-trigger').leanModal();
});

WEBSOCKET_URI = "ws://localhost:8080";
//WEBSOCKET_URI = "ws://ec2-52-10-25-58.us-west-2.compute.amazonaws.com:80";

rivets.configure({

  // Attribute prefix in templates
  prefix: 'rv',

  // Preload templates with initial data on bind
  preloadData: true,

  // Root sightglass interface for keypaths
  rootInterface: '.',

  // Template delimiters for text bindings
  templateDelimiters: ['{', '}'],


});

rivets.formatters.prettyCat = function(val) {
    return val.replace(/_/g, " ");
}

rivets.formatters['='] = function (value, arg) {
    return value == arg;
}

rivets.formatters.not = function (value) {
    return !value;
}

rivets.formatters.lowercase = function (value) {
    if (value !== undefined) {
        return value.toLowerCase();
    }
}

var game = null;

var ui = {
    active: null,
    main: null,
    menu: null,
    lobby: null,
    deckList: null,
    gameScreen: null,
    scoreDisplay: null
}

/*################
## CONSTRUCTORS ##
##################*/


// used to hold state and details of the current game
function Game(socket) {
    this.socket = socket;
    this.state = Game.states.PRESTART;

    this.playerId;
    this._score = 0;

    this.decks;
    this.activeDeck;

    this.activeCategory;
    this.highGood;

    this.pickingCat = false;
    this.waitingCat = true;
    this.pickingCard = false;
    this.waitingCard = false;

    this._hand = [];

    var self = this;

    this.setScore = function(score) {
        this._score = score;
        ui.scoreDisplay.text(score);
    }

    this.addCard = function(card) {
        this._hand.push(card);
    }

    this.removeCard = function(cardId) {
        for (var i = 0; i < this._hand.length; i++) {
            if (this._hand[i].id === cardId) {
                this._hand.splice(i, 1);
                break;
            }
        }
    }

    this.startCatPick = function() {
        this.pickingCat = true;
        this.waitingCat = false;

        this.waitingCard = false;
        this.pickingCard = false;
    }

    this.startCardPick = function() {
        console.log("CARD PICK START");
        this.pickingCat = false;
        this.waitingCat = false;

        this.waitingCard = false;
        this.pickingCard = true;
    }

    this.pickCategory = function(catId) {
        window.game.pickingCat = false;

        self.socket.send(JSON.stringify({
            'id': catId,
            'high_good': true
        }));
    }

    this.setCategory = function(catId, highGood) {
        console.log("SETTING CAT");
        for (var i = 0; i < this.activeDeck.categories.length; i++) {

            if (this.activeDeck.categories[i].id === catId) {
                this.activeCategory = self.activeDeck.categories[i];
                this.highGood = highGood;
                $('#winnerRoundModal').closeModal(); // incase the user is still sitting in the previous winner notif.
                break;
            }
        }

        this.startCardPick();
    }

    this.pickCard = function(cardId) {
        window.game.pickingCard = false;
        window.game.waitingCard = true;

        this.removeCard(cardId);

        self.socket.send(JSON.stringify({
            'id': cardId
        }));
    }
}

Game.states = {
    PRESTART: 0,
    DECKLIST: 1,
    LOBBY: 2,
    PLAYING: 3,
    OVER: 4
}

function Decks(deckArray) {

    this.decks = [];

    for (var i = 0; i < deckArray.length; i++) {
        var d = deckArray[i];
        var deck = new Deck(d.name, d.id);

        for (var j = 0; j < d.categories.length; j++) {
            var cat = new Category(d.categories[j], j);
            deck.addCategory(cat); // Deck ID is its index
        }

        this.decks.push(deck);
    }

    this.onSelected = function(event, model) {
        console.log("joining ");

        var deckId = model.deck.id;

        game.socket.send(JSON.stringify({ id: deckId }));

        game.activeDeck = model.deck;
        showLobby();
    }
}

function Card(name, id, description) {
    this.name = name;
    this.id = id;
    this.description = description;

    this.onSelected = function(event, model) {
        window.game.pickCard(model.card.id);
    }
}

function Deck(name, id, categories) {
    this.name = name;
    this.id = id;
    this.categories = categories;

    this.addCategory = function(cat) {
        if (!this.categories) {
            this.categories = [];
        }

        this.categories.push(cat);
    }
}

function Category(name, id) {
    this.name = name;
    this.id = id;

    this.onSelected = function(event, model) {
        window.game.pickCategory(model.category.id);
    }
}

/**
 * Sets up the main stuff needed by the app
 */
function setup() {
    ui.main = $('#main');
    ui.menu = $('#menu-template');
    ui.lobby = $('#lobby-template');
    ui.deckList = $('#deck-list-template');
    ui.gameScreen = $('#game-screen-template');
    ui.scoreDisplay = $('#score');
}

function connect(server) {
    try {
        var socket = new WebSocket(server);
        console.log(socket.readyState);

        socket.onopen = function(){
            console.log("connected");
        };

        socket.onmessage = function(msg) {
            console.log(msg);
            var data = $.parseJSON(msg.data);

            switch (data.type) {
                case "decks":
                    // A list of the playable decks
                    if (window.game.state === Game.states.PRESTART) {
                        showDecks(data.data);
                    }
                    break;
                case "player":
                    // The player's ID
                    window.game.playerId = data.id;
                    window.game.setScore(0);
                    break;
                case "score":
                    // The winner of the round
                    if (window.game.playerId === data.player) {
                        window.game.setScore(data.score);
                    }
                    break;
                case "card":
                    // Have a card
                    if (window.game.state === Game.states.LOBBY) {
                        showGame();
                    }

                    if (window.game.state === Game.states.PLAYING) {
                        window.game.addCard(new Card(data.card, data.id, data.description));
                    }

                    break;
                case "pick_category":
                    // We are the lucky player who gets to pick a category
                    if (window.game.state === Game.states.PLAYING) {
                        window.game.startCatPick();
                    }

                    break;
                case "category":
                    // A category has been chosen
                    if (window.game.state === Game.states.PLAYING) {
                        window.game.setCategory(data.value, data.high_good); // value is cat id
                    }

                    break;
                case "reveal":
                    // A winner has been decided
                    if (window.game.state === Game.states.PLAYING) {
                        showRoundWinner(data.cards); // cat id
                        window.game.activeCategory = -1;
                        window.game.waitingCat = true;
                    }

                    break;
                case "winner":
                    // A winner has been decided
                    if (window.game.state === Game.states.PLAYING) {
                        window.game.state = Game.states.OVER;
                        showWinner(data.players, data.reason);
                    }

                    break;
            }
        };

        socket.onclose = function() {
                console.log("socket closed");

                if (window.game.state != Game.states.OVER) {
                    window.game.state = Game.states.OVER;
                    showWinner([], "kick");
                }
        };

        return socket;
    } catch (ex) {
        console.error(ex);
    }
}

/**
 * Displays the main menu
 */
function showMenu() {
    ui.main.html(ui.menu.html());
    ui.main.find("#menu-start").on("click", startGame);

    document.body.classList.add("menu");
}

/**
 * Displays the menu for selecting a deck of cards.
 */
function startGame() {
    var sock = connect(WEBSOCKET_URI);
    window.game = new Game(sock);
}

/**
 * Displays the lobby screen
 */
function showLobby() {
    if (window.game.state === Game.states.DECKLIST) {
        ui.main.html(ui.lobby.html());
        ui.main.find("#lobby-ready").on("click", function(ev) {
            game.socket.send(JSON.stringify({ ready: true }));
            ev.target.classList.add("disabled");
            ev.target.innerHTML = "Waiting for players...";
        });

        window.game.state = Game.states.LOBBY;

        document.body.classList.remove("menu");
    }
}

/**
 * Displays a list of decks for the user to select from
 * @param  {array} Array of deck objects
 */
function showDecks(decks) {
    if (window.game.state === Game.states.PRESTART) {
        window.game.decks = new Decks(decks);

        ui.main.html(ui.deckList.html());
        rivets.bind(ui.main.find('#deck-list'), {decks: window.game.decks});

        window.game.state = Game.states.DECKLIST;
    }
}

/**
 * Shows the main game screen - a list of categories and the player's hand
 */
function showGame() {
    if (window.game.state === Game.states.LOBBY) {

        ui.main.html(ui.gameScreen.html());

        rivets.bind(ui.main.find('#game-screen'), {game: window.game, categories: window.game.activeDeck.categories});

        window.game.state = Game.states.PLAYING;
    }
}

/**
 * Shows the details of who won a round
 * @param  {array} cards All the cards that were played
 */
function showRoundWinner(cards) {
    var modal = document.getElementById('winnerRoundModal');
    var table = document.getElementById('results-table');

    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }

    var best = 0;

    if (window.game.highGood) {
        $.each(cards, function(key, card) {
            var val = parseFloat(card.value);
            if (val >= best) best = val;
        });
    } else {
        $.each(cards, function(key, card) {
            var val = parseFloat(card.value);
            if (val <= best) best = val;
        });
    }

    var thead = document.createElement("thead");
    var thr = document.createElement("tr");
    var nameTh = document.createElement("th");
    nameTh.innerHTML = "Card";
    var valueTh = document.createElement("th");
    valueTh.innerHTML = window.game.activeCategory.name;

    thr.appendChild(nameTh);
    thr.appendChild(valueTh);
    thead.appendChild(thr);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    $.each(cards, function(key, card) {
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
        tr.appendChild(td1);
        tr.appendChild(td2);

        td1.innerHTML = card.name;
        td2.innerHTML = card.value;

        if (parseFloat(card.value) == best) {
            tr.classList.add('winner');
        }

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    $(modal).openModal();
}

function showWinner(winners, reason) {
    var modal = document.getElementById('winnerModal');

    var won = false;

    if (reason == "kick") {
        winnerText = "Something went wrong :(";
    } else {
        $.each(winners, function(key, player) {
            if (player == window.game.playerId) {
                won = true;
                return false;
            }
        });

        var winnerText;

        if (won) {
            if (winners.length > 1) {
                winnerText = "You tied!";
            } else {
                winnerText = "You won!";
            }
        } else {
            winnerText = "Game over - you lost";
        }
    }

    document.getElementById('winner-title').innerHTML = winnerText;

    $(modal).openModal();
}
