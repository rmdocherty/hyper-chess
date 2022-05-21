import { Forbidden, Square, Label } from './squares'
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
            app.load_from_game(app.load_game_from_JSON(data))
            app.vboard.reset_board()
            app.draw()
        }
        else if (typeof data === 'string' && data.length == 4) {
            const old_label: string = data[0] + data[1]
            const new_label: string = data[2] + data[3]
            console.log(old_label, new_label)
            app.game.make_move_by_label(old_label, new_label)
            app.vboard.draw_board()
            app.vboard.draw_pieces(app.game.LabelPiece)
        }
    });
    conn.on('open', function() {
        console.log('Connected to ', conn.peer);
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
        console.log("Game is ", app_type, " type")
        this.id = this.gen_id()
        let game: Game
        if (app_type == "single" || app_type == "host") {
            game = this.load_game_from_local_storage()
            this.load_from_game(game)
        }
        else if (app_type == "guest") {
            const g = new Game(8, 8, "", "")
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
        console.log(id)
        return id
    }

    load_game_from_JSON(JSON_data) {
        const h: number = parseInt(JSON_data['h']), w: number = parseInt(JSON_data['w'])
        const board_str: string = JSON_data['board_str']
        const FEN: string = JSON_data['FEN']
        const g = new Game(w, h, board_str, FEN)
        return g
    }

    load_game_from_local_storage(){
        const JSON_data: string = require("./games.json")
        const selected_game: string = localStorage.getItem("selected_game")
        this.game_JSON = JSON_data[selected_game]
        const g: Game = this.load_game_from_JSON(this.game_JSON)
        return g
    }

    load_from_game(game: Game){
        this.game = game
        this.vboard = new Visual_Board(this.game)
        this.vboard.make_visual_board()
    }

    draw() {
        this.vboard.draw_board()
        this.vboard.draw_pieces(this.game.LabelPiece)
    }

    start_networking(){
        peer = new peerjs.Peer(this.id)
        const url_split: Array<string> = window.location.href.split('?')
        const type: AppType = url_split[1] as AppType
        const vboard = this.vboard
        const game = this.game
        peer.on('open', function(id) {
            if (type == "host"){
                const url: string = url_split[0]
                console.log(url+"?guest?"+id)
                const modal = document.getElementById("inviteModal")
                const modal_text = document.getElementById("inviteText") as HTMLInputElement
                modal_text.value = url+"?guest?"+id
                modal.style.display = "block"
            }
            else if (type == "guest") {
                const friend_id: string = url_split[2]
                join(friend_id)
            }
        })
        peer.on('connection', function(dataConnection){
            if (type == "host") {
                conn = dataConnection//join(dataConnection.peer)
                const modal = document.getElementById("inviteModal")
                modal.style.display = "none"
                conn.on('data', function(data) {
                    const old_label: string = data[0] + data[1]
                    const new_label: string = data[2] + data[3]
                    console.log(old_label, new_label)
                    game.make_move_by_label(old_label, new_label)
                    vboard.draw_board()
                    vboard.draw_pieces(game.LabelPiece)
                });
                console.log('Connected to ', conn.peer);
                conn.on('open', function() {
                    // sending objects may not work on safari - could send string instead
                    const JSON_data: string = require("./games.json")
                    const selected_game: string = localStorage.getItem("selected_game")
                    conn.send(JSON_data[selected_game])
                });
            }
        })
    }
    
    check_click(x: Pixel, y: Pixel): void{
        const vboard: Visual_Board = this.vboard
        const g: Game = vboard.game
        let on_board: boolean = false
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
                    const label: Label = v_sq.real_sq.point.label
                    const is_occupied: boolean = g.LabelPiece.has(label)
                    
                    if (is_occupied && vboard.current_vec.length == 1) {
                        // PICKING A PIECE CASE
                        const piece: Piece = g.LabelPiece.get(label) as Piece
                        const moves: Array<Square> = g.find_valid_moves(piece)
                        vboard.current_vec = vboard.current_vec.concat(moves)
                    }
                    else if (is_move) {
                        // TAKE A PIECE
                        const start_sq_label: string = vboard.current_vec[0].label
                        const end_sq_label: string = v_sq.real_sq.label
                        const piece: Piece = g.LabelPiece.get(start_sq_label) as Piece
                        g.make_move(vboard.current_vec[0], v_sq.real_sq)
                        if (app_type == "guest" || app_type == "host") {
                            conn.send(start_sq_label+end_sq_label)    
                        }
                        vboard.draw_vector(vboard.current_vec, "default")
                        vboard.current_vec = []
                    }
                }
                
                if (g.global_update) { //problem here: after promotion queen img loads too slow to be displayed
                    vboard.draw_board()
                    vboard.draw_pieces(g.LabelPiece)
                    g.global_update = false
                }
                else{
                    vboard.draw_vector(vboard.current_vec, "active")
                }
                
            }
        }
        if (on_board == false) {
            vboard.draw_vector(vboard.current_vec, "default")
            vboard.current_vec = []
        }
    }
}


let app: App = new App()

window.onload = function() {
    app.draw()
}

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect()
    const x: Pixel = e.clientX - rect.left
    const y: Pixel = e.clientY - rect.top

    app.check_click(x, y)
})
