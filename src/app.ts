import { Forbidden, Square, Label, Color, Point } from './squares'
import { Piece } from './pieces'
import { Game } from './game'
import { Visual_Board, Pixel, canvas} from './graphics'
import { peerjs } from './peerJS.js'

type AppType = "single" | "host" | "guest" | "build"

const app_type = window.location.href.split('?')[1] as AppType

var peer = null
var conn = null

const words: string = "acdefghijklmnopqrstuvwyzABCEDFGHIJKLMNOPQRSTUVWYZ1234567890"

function join(id: string): void{
    if (conn) {
        conn.close();
    }
    conn = peer.connect(id)
    conn.on('data', function(data) {
        if (app_type == "guest" && typeof data === 'object') {
            app.game_JSON = data
            app.load_from_game(app.load_game_from_JSON(data, app.game.player))
            app.vboard.reset_board()
            if (app.game.player == "white") {
                app.flip_board()
            }
            app.draw()
        }
        else if (typeof data === 'string' && data.length == 5) {
            const colour: Color = data as Color
            app.game.player = colour
        }
        else if (typeof data === 'string' && data.length == 4) {
            const old_label: string = data[0] + data[1]
            const new_label: string = data[2] + data[3]
            //console.log(old_label, new_label)
            app.game.make_move_by_label(old_label, new_label)
            app.vboard.draw_board()
            app.vboard.draw_pieces(app.game.LabelPiece)
        }
    });
    conn.on('open', function() {
        //console.log('Connected to ', conn.peer);
    });
}

function rand(l) { return Math.floor(Math.random()*l)}

class App {
    game: Game
    game_JSON: string
    vboard: Visual_Board
    friend_id: string
    id: string
    constructor(){
        this.initialise(app_type)
    }

    initialise(app_type: AppType){
        //console.log("Game is ", app_type, " type")
        this.id = this.gen_id()
        let game: Game
        if (app_type == "single" || app_type == "host" || app_type == "build") {
            game = this.load_game_from_local_storage()
            this.load_from_game(game)
        }
        else if (app_type == "guest") {
            const g = new Game(8, 8, "white", "", "")
            this.load_from_game(g)
        }
        if (app_type == "host" || app_type == "guest") {
            this.start_networking()
        }
    }

    gen_id(): string{
        const d = new Date();
        const len: number = words.length - 1
        const base_id: Array<number> = [0,0,0,0,0,0]
        const id: string = base_id.map(p => words[rand(len)]).join('')
        //console.log(id)
        return id
    }

    load_game_from_JSON(JSON_data, colour_string: string) : Game{
        const h: number = (JSON_data['h'] != null) ? parseInt(JSON_data['h']) : 8
        const w: number = (JSON_data['w'] != null) ? parseInt(JSON_data['w']) : 8
        const board_str: string = (JSON_data['board_str'] != null) ? JSON_data['board_str'] : ""
        const FEN: string = (JSON_data['FEN'] != null) ? JSON_data['FEN'] : ""
        const player: string = (JSON_data['player'] != null) ? JSON_data['player'] : "white"
        const g = new Game(w, h, colour_string, board_str, FEN, player)
        return g
    }

    load_game_from_local_storage(): Game{
        const JSON_data: string = require("./games.json")
        const selected_game: string = localStorage.getItem("selected_game")
        let selected_JSON: string = JSON_data[selected_game]
        const current_game: string = JSON.parse(localStorage.getItem("current_game"))
        
        if ((current_game != null) && (current_game["board_str"] == selected_JSON["board_str"]) ) {
            this.game_JSON = current_game
        }
        else {
            this.game_JSON = selected_JSON
        }
        const colour_string: string = localStorage.getItem("colour")
        const g: Game = this.load_game_from_JSON(this.game_JSON, colour_string)
        return g
    }

    load_from_game(game: Game){
        this.game = game
        this.vboard = new Visual_Board(this.game)
        this.vboard.make_visual_board()
    }

    save_game_to_local_storage() {
        const FEN: string = this.game.get_fen_from_game()
        this.game_JSON["FEN"] = FEN
        this.game_JSON["player"] = this.game.current_turn
        localStorage.setItem("current_game", JSON.stringify(this.game_JSON))
    }

    draw() {
        if (app_type == "build") {
            this.vboard.draw_board("grid") //draw twice to draw over grid with board.
            this.vboard.draw_board("default")
        }
        else {
            this.vboard.draw_board()
        }
        
        this.vboard.draw_pieces(this.game.LabelPiece)
    }

    flip_board() {
        this.vboard.flip_board()
    }

    make_move_by_label(old_sq_label: string, new_sq_label: string): void{
        this.vboard.make_move_by_label(old_sq_label, new_sq_label)
        this.save_game_to_local_storage() //this doesn't work for client games - they don't have a game JSON!
    }

    start_networking(){
        peer = new peerjs.Peer(this.id)
        const url_split: Array<string> = window.location.href.split('?')
        const type: AppType = url_split[1] as AppType
        const player_col: Color = this.game.player
        const vboard = this.vboard
        const game = this.game
        peer.on('open', function(id) {
            if (type == "host"){
                const host_split: Array<string> = window.location.href.split('/')
                const url: string = host_split[0] + "//" + host_split[1] + host_split[2] //url_split[0]
                const modal = document.getElementById("inviteModal")
                const modal_text = document.getElementById("inviteText") as HTMLInputElement
                modal_text.value = url +'?' + id //url+"?guest?"+id
                modal.style.display = "block"
            }
            else if (type == "guest") {
                const friend_id: string = url_split[2]
                join(friend_id)
            }
        })
        peer.on('connection', function(dataConnection){
            if (type == "host") {
                conn = dataConnection //join(dataConnection.peer)
                const modal = document.getElementById("inviteModal")
                modal.style.display = "none"
                conn.on('data', function(data) {
                    const old_label: string = data[0] + data[1]
                    const new_label: string = data[2] + data[3]
                    //console.log(old_label, new_label)
                    game.make_move_by_label(old_label, new_label)
                    vboard.draw_board()
                    vboard.draw_pieces(game.LabelPiece)
                });
                console.log('Connected to ', conn.peer);
                conn.on('open', function() {
                    // sending objects may not work on safari - could send string instead
                    const opponent_color: Color = (player_col == "white") ? "black" : "white"
                    conn.send(opponent_color)
                    const JSON_data: string = require("./games.json")
                    const selected_game: string = localStorage.getItem("selected_game")
                    let game_JSON = JSON_data[selected_game]
                    game_JSON["FEN"] = app.game.get_fen_from_game() //this is terrible but needed to 
                    conn.send(game_JSON) //JSON_data[selected_game]
                });
            }
        })
    }
    
    handle_click_game(x: Pixel, y: Pixel): void{
        const vboard: Visual_Board = this.vboard
        const g: Game = vboard.game
        let on_board: boolean = false
        //console.log("test")
        for (let row of vboard){
            for (let v_sq of row) {
                let min_p = v_sq.bbox[0]
                let max_p = v_sq.bbox[3]
                if ((x < max_p[0] && x > min_p[0]) && (y < max_p[1] && y > min_p[1]) && !(v_sq.real_sq instanceof Forbidden)) {
                    on_board = true
                    const is_move: boolean = vboard.current_vec.includes(v_sq.real_sq)
                    if (vboard.current_vec.length == 0){
                        vboard.current_vec.push(v_sq.real_sq)
                    }
                    const end_sq_label: Label = v_sq.real_sq.point.label
                    const is_occupied: boolean = g.LabelPiece.has(end_sq_label)
                    const piece: Piece = g.LabelPiece.get(end_sq_label) as Piece
                    
                    if (is_occupied && vboard.current_vec.length == 1) { //&& vboard.current_vec.length == 1
                        // PICKING A PIECE CASE
                        const moves: Array<Square> = g.find_valid_moves(piece)
                        vboard.current_vec = vboard.current_vec.concat(moves)
                    }
                    else if ((is_move) && (v_sq.real_sq != vboard.current_vec[0])) {
                        // TAKE A PIECE
                        const start_sq_label: string = vboard.current_vec[0].label
                        const start_piece: Piece = g.LabelPiece.get(start_sq_label) as Piece
                        if (start_piece.color == this.game.current_turn) {
                            this.make_move_by_label(start_sq_label, end_sq_label)
                            if (app_type == "guest" || app_type == "host") {
                                conn.send(start_sq_label+end_sq_label)    
                            }
                        }
                        else {
                            vboard.reset_current_vec()
                        }       
                    }
                    else if (is_occupied){
                        vboard.reset_current_vec()
                        const moves: Array<Square> = g.find_valid_moves(piece)
                        vboard.current_vec = moves
                    }
                    else {
                        vboard.reset_current_vec()
                    }
                }
            }
        }
        let chosen_piece: Piece;
        if (vboard.current_vec.length > 0) {
            const current_label: Label = vboard.current_vec[0].label
            if (g.LabelPiece.has(current_label)) {
                chosen_piece = g.LabelPiece.get(current_label) as Piece
            }
        }
        
        if (g.global_update) { //problem here: after promotion queen img loads too slow to be displayed
            //vboard.draw_board()
            //vboard.draw_pieces(g.LabelPiece)
            this.draw()
            g.global_update = false
        }
        
        else if (chosen_piece != null && chosen_piece.color == this.game.current_turn){
            vboard.draw_vector(vboard.current_vec, "active")
        }
        else if (chosen_piece != null && !(chosen_piece.color == this.game.current_turn)){
            vboard.draw_vector(vboard.current_vec, "inactive")
        }
        else {
            vboard.draw_vector(vboard.current_vec, "active")
        }

        if (on_board == false) {
            vboard.reset_current_vec()
        }
        if (g.winner != false) { //put this into an app based make_move function s.t it happens on host and guest.
            const win_text: HTMLElement = document.getElementById("winText")
            const winner: string = (g.winner == "black") ? "Black" : "White"
            win_text.innerHTML = winner
            const win_modal: HTMLElement = document.getElementById("winModal")
            win_modal.style.display = "block"
            localStorage.removeItem("current_game")
        }
    }

    handle_click_build(cx: Pixel, cy: Pixel): void{
        const vboard: Visual_Board = this.vboard
        const g: Game = vboard.game
        let on_board: boolean = false
        //console.log("test")
        for (let row of vboard){
            for (let v_sq of row) {
                let min_p = v_sq.bbox[0]
                let max_p = v_sq.bbox[3]
                if ((cx < max_p[0] && cx > min_p[0]) && (cy < max_p[1] && cy > min_p[1])) {
                    const x: number = v_sq.real_sq.x
                    const y: number = v_sq.real_sq.y
                    console.log(x, y)
                    if (v_sq.real_sq instanceof Forbidden) {
                        console.log('clickng forbidden')
                        const new_sq: Square = new Square(new Point(x,y))
                        g.board[y][x] = new_sq
                        
                        // FORBIDDEN SQUARES OFFSET BY 1 FROM REAL SQUARES and need to flip if white!
                        vboard.add_square(x, y)
                        this.draw()
                    }
                }
            }
        }
    }
}


let app: App = new App()

window.onload = function() {
    if (app.game.player == "white") {
        app.flip_board()
    }
    app.draw()
}

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect()
    const x: Pixel = e.clientX - rect.left
    const y: Pixel = e.clientY - rect.top

    if (app_type == "build") {
        app.handle_click_build(x, y)
    }
    else {
        app.handle_click_game(x, y)
    }
    
})
