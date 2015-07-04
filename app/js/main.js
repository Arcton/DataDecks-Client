$(function() {
    setup();
    showMenu();

    $('.modal-trigger').leanModal();
});

WEBSOCKET_URI = "ws://localhost:8080";

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

var game = null;

var ui = {
    active: null,
    main: null,
    menu: null,
    lobby: null,
    deckList: null,
    gameScreen: null
}

/*################
## CONSTRUCTORS ##
##################*/


// used to hold state and details of the current game
function Game(socket) {
    this.socket = socket;
    this.state = Game.states.PRESTART;

    this.decks;
    this.activeDeck;

    this.activeCategory;

    this.pickingCat = false;
    this.waitingCat = true;
    this.pickingCard = false;
    this.waitingCard = false;

    this._hand = [];

    var self = this;

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
    }

    this.startCardPick = function() {
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

    this.setCategory = function(catId) {
        for (var i = 0; i < this.activeDeck.categories.length; i++) {

            if (this.activeDeck.categories[i].id === catId) {
                this.activeCategory = self.activeDeck.categories[i];
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
    PLAYING: 3
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

function Card(name, id) {
    this.name = name;
    this.id = id;

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
                case "card":
                    // Have a card
                    if (window.game.state === Game.states.LOBBY) {
                        showGame();
                    }

                    if (window.game.state === Game.states.PLAYING) {
                        window.game.addCard(new Card(data.card, data.id));
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
                        window.game.setCategory(data.value); // cat id
                    }

                    break;
            }
        };

        socket.onclose = function() {
                console.log("socket closed");
                showMenu();
                game = null;
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
