$(function() {
    console.log("main");
    setup();
    showMenu();

    $('.modal-trigger').leanModal();
});

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

var game = null;

var ui = {
    active: null,
    main: null,
    menu: null,
    deckList: null
}

// used to hold state and details of the current game
function Game(socket) {
    this.socket = socket;
    this.state = Game.states.PRESTART;

    this.decks = null;
}

Game.states = {
    PRESTART: 0,
    DECKLIST: 1
}

function Decks(deckArray) {
    this.decks = deckArray;

    this.onSelected = function(event, model) {
        var deckId = model.deck.id;

        game.socket.send(JSON.stringify({ id: deckId }));
    }
}

/**
 * Sets up the main stuff needed by the app
 */
function setup() {
    ui.main = $('#main');
    ui.menu = $('#menu-template');
    ui.deckList = $('#deck-list-template');
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
                    if (window.game.state === Game.states.PRESTART) {
                        showDecks(data.data);
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
    ui.main.find("#menu-help").on("click", showHelp);
}

/**
 * Displays the menu for selecting a deck of cards.
 */
function startGame() {
    var sock = connect("ws://localhost:8080");
    window.game = new Game(sock);
}

/**
 * Shows the help menu. TODO: implement the help menu
 */
function showHelp() {
    console.log("HELP!");
}

/**
 * Displays a list of decks for the user to select from
 * @param  {array} Array of deck objects
 */
function showDecks(decks) {
    window.game.decks = new Decks(decks);

    ui.main.html(ui.deckList.html());
    rivets.bind(ui.main.find('#deck-list'), {decks: window.game.decks})
}
